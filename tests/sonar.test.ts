import { SonarAI } from '../src/sonar';
import { AuthManager } from '../src/auth';
import { VertexAI } from '@google-cloud/vertexai';

// Mock the dependencies
jest.mock('../src/auth');
jest.mock('@google-cloud/vertexai');

const MockedAuthManager = AuthManager as jest.MockedClass<typeof AuthManager>;
const MockedVertexAI = VertexAI as jest.MockedClass<typeof VertexAI>;

describe('SonarAI', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    MockedAuthManager.mockClear();
    MockedVertexAI.mockClear();
    
    // Mock the chained methods for Google AI
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        candidates: [{
            content: { parts: [{ text: 'Test response' }] },
            groundingMetadata: {}
        }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
      }
    });
    
    const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
    });
    
    MockedVertexAI.prototype.getGenerativeModel = mockGetGenerativeModel;
  });

  it('should initialize with a project ID and location', () => {
    const sonar = new SonarAI({ projectId: 'test-project', location: 'us-central1' });
    expect(sonar).toBeInstanceOf(SonarAI);
    expect(MockedVertexAI).toHaveBeenCalledWith({ project: 'test-project', location: 'us-central1' });
  });

  it('should throw an error if no project id or location is provided', () => {
    expect(() => new SonarAI()).toThrow('projectId and location are required for Vertex AI');
  });

  describe('search', () => {
    it('should perform a search and return a SonarResponse', async () => {
        const sonar = new SonarAI({ projectId: 'test-project', location: 'us-central1' });
        MockedAuthManager.prototype.validateAuth.mockResolvedValueOnce(true);
        
        const response = await sonar.search('test query');

        expect(response).toHaveProperty('text', 'Test response');
        expect(response).toHaveProperty('sources');
        expect(response).toHaveProperty('tokensUsed');
        expect(response.tokensUsed.input).toBe(10);
        expect(response.tokensUsed.output).toBe(20);
    });

    it('should throw an error if authentication fails', async () => {
      const sonar = new SonarAI({ projectId: 'test-project', location: 'us-central1' });
      MockedAuthManager.prototype.validateAuth.mockResolvedValueOnce(false);
      await expect(sonar.search('test query')).rejects.toThrow('Sonar search failed: Authentication validation failed');
    });
  });
  
  describe('healthCheck', () => {
    it('should return a healthy status on successful test search', async () => {
      const sonar = new SonarAI({ projectId: 'test-project', location: 'us-central1' });
      MockedAuthManager.prototype.validateAuth.mockResolvedValue(true);
      
      const health = await sonar.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('responseTime');
      expect(health.details).toHaveProperty('tokensUsed');
    });
    
    it('should return an unhealthy status on failed test search', async () => {
        const sonar = new SonarAI({ projectId: 'test-project', location: 'us-central1' });
        MockedAuthManager.prototype.validateAuth.mockResolvedValue(true);
        
        const mockGetGenerativeModel = jest.fn().mockReturnValue({
            generateContent: jest.fn().mockRejectedValue(new Error('API error')),
        });
        (MockedVertexAI.prototype.getGenerativeModel as jest.Mock).mockImplementation(mockGetGenerativeModel);

        const health = await sonar.healthCheck();
        
        expect(health.status).toBe('unhealthy');
        expect(health.details.error).toBe('Sonar search failed: API error');
    });
  });

}); 
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { AuthManager } from './auth';
import { SonarUtils } from './utils';
import { 
  SonarConfig, 
  SonarResponse, 
  StreamChunk, 
  ChatSession, 
  HealthStatus,
} from './types';
import { Content, Part } from '@google/generative-ai';

export class SonarAI {
  private vertexAI: VertexAI;
  private auth: AuthManager;
  private config: Required<SonarConfig>;

  constructor(config: SonarConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || '',
      projectId: config.projectId || process.env.GOOGLE_CLOUD_PROJECT || '',
      location: config.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      dataStoreId: config.dataStoreId || process.env.VERTEX_AI_DATASTORE_ID || '',
      searchEngineId: config.searchEngineId || '',
      useGoogleSearch: config.useGoogleSearch ?? true,
      maxSearchResults: config.maxSearchResults || 10,
      searchTimeout: config.searchTimeout || 15000,
      model: config.model || 'gemini-2.5-flash',
      thinkingBudget: config.thinkingBudget ?? 1024,
      maxOutputTokens: config.maxOutputTokens || 2048,
      temperature: config.temperature ?? 0.1,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 40,
      enableSafetySettings: config.enableSafetySettings ?? true,
      customInstructions: config.customInstructions || '',
      debugMode: config.debugMode ?? false
    } as Required<SonarConfig>;

    if (!this.config.projectId || !this.config.location) {
      throw new Error('projectId and location are required for Vertex AI');
    }

    this.auth = new AuthManager(this.config.apiKey, this.config.projectId);
    this.vertexAI = new VertexAI({ project: this.config.projectId, location: this.config.location });

    if (this.config.debugMode) {
      console.log('SonarAI initialized with config:', SonarUtils.sanitizeConfig(this.config));
    }
  }

  async search(query: string, options?: Partial<SonarConfig>): Promise<SonarResponse> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...options };

    try {
      const isAuthValid = await this.auth.validateAuth();
      if (!isAuthValid) {
        throw new Error('Authentication validation failed');
      }

      const generativeModel = this.vertexAI.getGenerativeModel({
        model: mergedConfig.model,
      });

      const tools = this.buildSearchTools(mergedConfig);
      
      const result = await generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: SonarUtils.buildEnhancedPrompt(query, mergedConfig.customInstructions) }]
        }],
        tools,
        generationConfig: {
          maxOutputTokens: mergedConfig.maxOutputTokens,
          temperature: mergedConfig.temperature,
          topP: mergedConfig.topP,
          topK: mergedConfig.topK,
        },
        safetySettings: mergedConfig.enableSafetySettings ? [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
          ] : [],
      });

      const response = result.response;
      const responseText = response.candidates && response.candidates[0].content.parts[0].text || "";
      const metadata = response.candidates && response.candidates[0].groundingMetadata;
      const sources = SonarUtils.extractSources(metadata, mergedConfig.maxSearchResults);
      const searchQueries = metadata?.webSearchQueries || metadata?.retrievalQueries || [];
      const tokensUsed = SonarUtils.calculateTokenUsage(response);

      const sonarResponse: SonarResponse = {
        text: responseText,
        sources,
        groundingMetadata: metadata,
        searchQueries,
        responseTime: Date.now() - startTime,
        tokensUsed,
        model: mergedConfig.model,
        timestamp: SonarUtils.formatTimestamp()
      };

      if (mergedConfig.debugMode) {
        console.log('Search completed:', { query, responseTime: sonarResponse.responseTime, sourcesFound: sources.length, tokensUsed: sonarResponse.tokensUsed });
      }

      return sonarResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (this.config.debugMode) {
        console.error('Search failed:', errorMessage, error);
      }
      throw new Error(`Sonar search failed: ${errorMessage}`);
    }
  }

  async *searchStream(query: string, options?: Partial<SonarConfig>): AsyncGenerator<StreamChunk, SonarResponse> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...options };
    let accumulatedText = '';
    let finalResponse: any;

    try {
      const tools = this.buildSearchTools(mergedConfig);
      
      const generativeModel = this.vertexAI.getGenerativeModel({ model: mergedConfig.model });
      
      const result = await generativeModel.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: SonarUtils.buildEnhancedPrompt(query, mergedConfig.customInstructions) }] }],
        tools,
        generationConfig: { maxOutputTokens: mergedConfig.maxOutputTokens, temperature: mergedConfig.temperature, topP: mergedConfig.topP, topK: mergedConfig.topK }
      });

      for await (const chunk of result.stream) {
        if (chunk.candidates && chunk.candidates[0].content.parts[0].text) {
          const chunkText = chunk.candidates[0].content.parts[0].text;
          accumulatedText += chunkText;
          yield { text: chunkText, isComplete: false };
        }
      }

      finalResponse = await result.response;
      const metadata = finalResponse.candidates && finalResponse.candidates[0].groundingMetadata;
      const sources = SonarUtils.extractSources(metadata, mergedConfig.maxSearchResults);
      const searchQueries = metadata?.webSearchQueries || metadata?.retrievalQueries || [];
      const tokensUsed = SonarUtils.calculateTokenUsage(finalResponse);

      return {
        text: accumulatedText,
        sources,
        groundingMetadata: metadata,
        searchQueries,
        responseTime: Date.now() - startTime,
        tokensUsed,
        model: mergedConfig.model,
        timestamp: SonarUtils.formatTimestamp()
      };

    } catch (error) {
      throw new Error(`Sonar stream search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createChat(): Promise<ChatSession> {
    const tools = this.buildSearchTools(this.config);
    const history: Content[] = [];
    
    const generativeModel = this.vertexAI.getGenerativeModel({ model: this.config.model, tools });
    const chat = generativeModel.startChat({ history });
    const chatSessionThis = this;

    return {
      async sendMessage(message: string): Promise<SonarResponse> {
        const startTime = Date.now();
        const enhancedMessage = SonarUtils.buildEnhancedPrompt(message, chatSessionThis.config.customInstructions);
        const result = await chat.sendMessage(enhancedMessage);
        
        const response = result.response;
        const responseText = response.candidates && response.candidates[0].content.parts[0].text || "";
        history.push({ role: 'user', parts: [{ text: enhancedMessage }] });
        history.push({ role: 'model', parts: [{ text: responseText }] });
        
        const metadata = response.candidates && response.candidates[0].groundingMetadata;
        const sources = SonarUtils.extractSources(metadata, chatSessionThis.config.maxSearchResults);
        const searchQueries = metadata?.webSearchQueries || metadata?.retrievalQueries || [];
        const tokensUsed = SonarUtils.calculateTokenUsage(response);

        return {
          text: responseText,
          sources,
          groundingMetadata: metadata,
          searchQueries,
          responseTime: Date.now() - startTime,
          tokensUsed,
          model: chatSessionThis.config.model,
          timestamp: SonarUtils.formatTimestamp()
        };
      },

      async *sendMessageStream(message: string): AsyncGenerator<StreamChunk, SonarResponse> {
        const startTime = Date.now();
        let accumulatedText = '';
        const enhancedMessage = SonarUtils.buildEnhancedPrompt(message, chatSessionThis.config.customInstructions);
        const result = await chat.sendMessageStream(enhancedMessage);
        
        for await (const chunk of result.stream) {
          if (chunk.candidates && chunk.candidates[0].content.parts[0].text) {
             const chunkText = chunk.candidates[0].content.parts[0].text;
            accumulatedText += chunkText;
            yield { text: chunkText, isComplete: false };
          }
        }
        
        history.push({ role: 'user', parts: [{ text: enhancedMessage }] });
        history.push({ role: 'model', parts: [{ text: accumulatedText }] });

        const finalResponse = await result.response;
        const metadata = finalResponse.candidates && finalResponse.candidates[0].groundingMetadata;
        const sources = SonarUtils.extractSources(metadata, chatSessionThis.config.maxSearchResults);
        const searchQueries = metadata?.webSearchQueries || metadata?.retrievalQueries || [];
        const tokensUsed = SonarUtils.calculateTokenUsage(finalResponse);

        return { text: accumulatedText, sources, groundingMetadata: metadata, searchQueries, responseTime: Date.now() - startTime, tokensUsed, model: chatSessionThis.config.model, timestamp: SonarUtils.formatTimestamp() };
      },

      getHistory: () => history.map((h: Content) => ({ role: h.role, content: h.parts.map((p: Part) => p.text).join(''), timestamp: SonarUtils.formatTimestamp() })),
      clearHistory: () => { history.length = 0 }
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const testResponse = await this.search('Health check test query', {
        maxOutputTokens: 50,
      });
      
      return {
        status: 'healthy',
        details: {
          responseTime: testResponse.responseTime,
          tokensUsed: testResponse.tokensUsed.total,
          sourcesFound: testResponse.sources.length,
          lastChecked: SonarUtils.formatTimestamp()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: SonarUtils.formatTimestamp()
        }
      };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [
        'gemini-2.5-flash-latest',
        'gemini-2.5-pro-latest',
        'gemini-1.0-pro',
      ];
  }

  updateConfig(newConfig: Partial<SonarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.debugMode) {
      console.log('Configuration updated:', SonarUtils.sanitizeConfig(newConfig));
    }
  }

  getConfig(): Partial<SonarConfig> {
    return SonarUtils.sanitizeConfig(this.config);
  }

  private buildSearchTools(config: Partial<SonarConfig>) {
    const tools: any[] = [];

    if (config.useGoogleSearch) {
      tools.push({
        googleSearchRetrieval: {
          disableAttribution: false,
        }
      });
    }

    if (config.dataStoreId && config.projectId && config.location) {
      tools.push({
        retrieval: {
          vertexAiSearch: {
            datastore: `projects/${config.projectId}/locations/${config.location}/collections/default_collection/dataStores/${config.dataStoreId}`,
          },
          disableAttribution: false,
        }
      });
    }

    return tools;
  }
} 
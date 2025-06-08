import { GroundingMetadata as VertexGroundingMetadata } from '@google-cloud/vertexai';

export interface SonarConfig {
  // Authentication options
  apiKey?: string;
  projectId?: string;
  location?: string;
  
  // Search configuration
  dataStoreId?: string;
  searchEngineId?: string;
  useGoogleSearch?: boolean;
  maxSearchResults?: number;
  searchTimeout?: number;
  
  // Model configuration
  model?: string;
  thinkingBudget?: number;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  
  // Advanced options
  enableSafetySettings?: boolean;
  customInstructions?: string;
  debugMode?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevanceScore?: number;
  publishedDate?: string;
  domain?: string;
}

export type GroundingMetadata = VertexGroundingMetadata;

export interface SonarResponse {
  text: string;
  sources: SearchResult[];
  groundingMetadata?: GroundingMetadata;
  searchQueries: string[];
  responseTime: number;
  tokensUsed: {
    input: number;
    output: number;
    thinking?: number;
    total: number;
  };
  model: string;
  timestamp: string;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  sources?: SearchResult[];
  tokensUsed?: {
    input: number;
    output: number;
    thinking?: number;
    total: number;
  };
}

export interface ChatSession {
  sendMessage(message: string): Promise<SonarResponse>;
  sendMessageStream(message: string): AsyncGenerator<StreamChunk, SonarResponse>;
  getHistory(): Array<{role: string, content: string, timestamp: string}>;
  clearHistory(): void;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  details: {
    responseTime?: number;
    tokensUsed?: number;
    sourcesFound?: number;
    error?: string;
    lastChecked: string;
  };
} 
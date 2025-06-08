import { SearchResult, GroundingMetadata, SonarConfig } from './types';

export class SonarUtils {
  static extractSources(metadata?: GroundingMetadata, maxResults: number = 10): SearchResult[] {
    if (!metadata) return [];

    const sources: SearchResult[] = [];
    const seenUrls = new Set<string>();

    if (metadata.searchEntryPoint) {
      try {
        const content = metadata.searchEntryPoint.renderedContent || '';
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
        const urls = content.match(urlRegex) || [];
        
        urls.forEach((url) => {
          if (!seenUrls.has(url) && sources.length < maxResults) {
            sources.push({
              url,
              title: `Source from entry point ${sources.length + 1}`,
              snippet: 'Retrieved from grounding metadata.',
              domain: new URL(url).hostname
            });
            seenUrls.add(url);
          }
        });
      } catch (e) {
        // Ignore errors from URL parsing
      }
    }
    
    const attributions = (metadata as any).groundingAttributions;
    if (attributions) {
        for (const attribution of attributions) {
            const source = attribution.web || attribution.retrieval;
            if (source?.uri && !seenUrls.has(source.uri) && sources.length < maxResults) {
                 sources.push({
                    url: source.uri,
                    title: source.title || `Source ${sources.length + 1}`,
                    snippet: 'Retrieved from grounding attributions.',
                    domain: new URL(source.uri).hostname,
                });
                seenUrls.add(source.uri);
            }
        }
    }

    return this.sortSources(sources);
  }

  static sortSources(sources: SearchResult[]): SearchResult[] {
    return sources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  static calculateTokenUsage(response: any): { input: number; output: number; thinking?: number; total: number } {
    try {
      const usage = response.usageMetadata || {};
      const input = usage.promptTokenCount || 0;
      const output = usage.candidatesTokenCount || 0;
      const thinking = usage.thinkingTokenCount;
      
      return {
        input,
        output,
        thinking,
        total: input + output + (thinking || 0)
      };
    } catch {
      return { input: 0, output: 0, total: 0 };
    }
  }

  static buildEnhancedPrompt(query: string, customInstructions?: string): string {
    const basePrompt = `You are an expert AI assistant with access to real-time information through web search. 
Provide comprehensive, accurate, and well-cited responses to user queries.

Guidelines:
- Include relevant sources and citations
- Provide detailed, factual information
- Structure responses clearly with appropriate formatting
- Be comprehensive but concise
- If information is time-sensitive, mention current context

${customInstructions ? `Additional Instructions: ${customInstructions}` : ''}

User Query: ${query}`;

    return basePrompt;
  }

  static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static sanitizeConfig(config: Partial<SonarConfig>): Partial<SonarConfig> {
    const sanitized = { ...config };
    if (sanitized.apiKey) {
      sanitized.apiKey = '***REDACTED***';
    }
    return sanitized;
  }
} 
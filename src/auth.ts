import { GoogleAuth } from 'google-auth-library';

export class AuthManager {
  private auth?: GoogleAuth;
  private apiKey?: string;

  constructor(apiKey?: string, projectId?: string) {
    this.apiKey = apiKey;
    
    if (projectId || process.env.GOOGLE_CLOUD_PROJECT) {
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT,
      });
    }
  }

  async getAuthHeaders(): Promise<{ [key: string]: string }> {
    if (this.apiKey) {
      return { 'Authorization': `Bearer ${this.apiKey}` };
    }

    if (this.auth) {
      try {
        const client = await this.auth.getClient();
        const token = await client.getAccessToken();
        
        if (!token || !token.token) {
          throw new Error('Failed to obtain access token');
        }
        
        return { 'Authorization': `Bearer ${token.token}` };
      } catch (error) {
        throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('No authentication method available. Provide either apiKey or configure Google Cloud credentials.');
  }

  async validateAuth(): Promise<boolean> {
    try {
      await this.getAuthHeaders();
      return true;
    } catch {
      return false;
    }
  }
} 
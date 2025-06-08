# gcloud-sonar-ai

A production-ready npm package replicating Perplexity's Sonar using Google Cloud Vertex AI Search and Gemini 2.5 Flash.

## 🚀 Features

- **Real-time Search**: Google Search grounding with citations
- **Vertex AI Integration**: Custom data source search
- **Streaming Responses**: Real-time response streaming
- **Multi-turn Chat**: Persistent conversation sessions
- **TypeScript Support**: Full type safety and IntelliSense
- **Production Ready**: Comprehensive error handling and monitoring
- **Non-tech Friendly**: Environment variable configuration

## 📦 Installation

```
npm install gcloud-sonar-ai
```

## 🔧 Quick Start

### For Developers
```
import { SonarAI } from 'gcloud-sonar-ai';

const sonar = new SonarAI({
  projectId: 'your-project-id',
  location: 'us-central1',
  dataStoreId: 'your-datastore-id', // optional
  useGoogleSearch: true
});

const result = await sonar.search('What are the latest AI developments?');
console.log(result.text);
console.log('Sources:', result.sources);
```

### For Non-Technical Users
```
// Set environment variables:
// GOOGLE_CLOUD_PROJECT=your-project-id
// GOOGLE_CLOUD_LOCATION=us-central1
// GEMINI_API_KEY=your-api-key (if using API key auth)

import { SonarAI } from 'gcloud-sonar-ai';

const sonar = new SonarAI(); // Uses environment variables

const result = await sonar.search('Your question here');
console.log(result.text);
```

## 📖 Advanced Usage

### Streaming Responses
```
for await (const chunk of sonar.searchStream('Explain quantum computing')) {
  process.stdout.write(chunk.text);
}
```

### Chat Sessions
```
const chat = await sonar.createChat();
const response1 = await chat.sendMessage('What is machine learning?');
const response2 = await chat.sendMessage('How does it differ from AI?');
```

### Custom Configuration
```
const sonar = new SonarAI({
  model: 'gemini-2.5-flash-preview-04-17',
  temperature: 0.2,
  maxOutputTokens: 4096,
  thinkingBudget: 2048,
  customInstructions: 'Always provide detailed technical explanations',
  debugMode: true
});
```

## 🔑 Authentication

### Google Cloud Project (Recommended)
1. Set up Google Cloud project
2. Enable Vertex AI API
3. Configure authentication (service account or gcloud CLI)
4. Set environment variables

### API Key (Alternative)
1. Get Gemini API key from Google AI Studio
2. Set `GEMINI_API_KEY` environment variable

## 📊 Response Format

```
interface SonarResponse {
  text: string;                    // Generated response
  sources: SearchResult[];         // Cited sources
  searchQueries: string[];         // Queries used for search
  responseTime: number;            // Response time in ms
  tokensUsed: {                   // Token usage stats
    input: number;
    output: number;
    thinking?: number;
    total: number;
  };
  model: string;                   // Model used
  timestamp: string;               // ISO timestamp
}
```

## 🛠️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | Gemini API key |
| `projectId` | string | - | Google Cloud project ID |
| `location` | string | 'us-central1' | Google Cloud region |
| `useGoogleSearch` | boolean | true | Enable Google Search grounding |
| `maxSearchResults` | number | 10 | Maximum sources to return |
| `model` | string | 'gemini-2.5-flash-preview-04-17' | Gemini model |
| `temperature` | number | 0.1 | Response creativity (0-1) |
| `maxOutputTokens` | number | 2048 | Maximum response length |
| `thinkingBudget` | number | 1024 | Thinking tokens for reasoning |
| `debugMode` | boolean | false | Enable debug logging |

## 🔍 Health Monitoring

```
const health = await sonar.healthCheck();
console.log(health.status); // 'healthy' | 'unhealthy' | 'degraded'
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 🐛 Issues

Report issues on [GitHub Issues](https://github.com/plawlost/gcloud-sonar-ai/issues) 
import { SonarAI } from '../src'; // In a real project, this would be 'gcloud-sonar-ai'

async function main() {
  console.log('--- Basic Usage Example ---');

  // Ensure you have set up your environment variables
  // GOOGLE_CLOUD_PROJECT=your-project-id
  // GOOGLE_CLOUD_LOCATION=us-central1
  // Or use API Key: GEMINI_API_KEY=your-api-key

  try {
    const sonar = new SonarAI({
      // Using environment variables for projectId and location
      // You can also pass them explicitly:
      // projectId: 'your-project-id',
      // location: 'us-central1',
      debugMode: true,
    });

    const query = 'What are the latest advancements in large language models in 2024?';
    console.log(`\nSearching for: "${query}"...\n`);

    const result = await sonar.search(query);

    console.log('--- Response Text ---');
    console.log(result.text);
    console.log('\n---------------------\n');

    if (result.sources.length > 0) {
      console.log('--- Cited Sources ---');
      result.sources.forEach((source, index) => {
        console.log(`[${index + 1}] ${source.title}`);
        console.log(`    URL: ${source.url}`);
        console.log(`    Snippet: ${source.snippet.substring(0, 100)}...`);
      });
      console.log('\n---------------------\n');
    }

    console.log('--- Search Metadata ---');
    console.log(`Response Time: ${result.responseTime}ms`);
    console.log(`Model Used: ${result.model}`);
    console.log(`Tokens Used: ${JSON.stringify(result.tokensUsed)}`);
    console.log('-----------------------');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main(); 
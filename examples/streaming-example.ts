import { SonarAI } from '../src'; // In a real project, this would be 'gcloud-sonar-ai'

async function main() {
  console.log('--- Streaming Example ---');

  // Ensure you have set up your environment variables
  // GOOGLE_CLOUD_PROJECT=your-project-id
  // GOOGLE_CLOUD_LOCATION=us-central1
  
  try {
    const sonar = new SonarAI({ debugMode: false });

    const query = 'Explain the concept of "grounding" in large language models.';
    console.log(`\nStreaming response for: "${query}"...\n`);

    const stream = sonar.searchStream(query);

    console.log('--- Streamed Response ---');
    let fullResponseText = '';
    for await (const chunk of stream) {
      process.stdout.write(chunk.text);
      if (chunk.text) {
        fullResponseText += chunk.text;
      }
    }
    console.log('\n------------------------\n');
    
    // The generator returns the final response object
    const finalResponse = await stream;

    console.log('--- Final Response Metadata ---');
    console.log(`Full Text Length: ${fullResponseText.length}`);
    if (finalResponse.sources && finalResponse.sources.length > 0) {
        console.log(`Sources Found: ${finalResponse.sources.length}`);
    }
    console.log(`Response Time: ${finalResponse.responseTime}ms`);
    console.log(`Model Used: ${finalResponse.model}`);
    console.log(`Tokens Used: ${JSON.stringify(finalResponse.tokensUsed)}`);
    console.log('------------------------------');

  } catch (error) {
    console.error('\nAn error occurred during streaming:', error);
  }
}

main(); 
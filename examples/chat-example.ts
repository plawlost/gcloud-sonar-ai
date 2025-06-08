import { SonarAI } from '../src'; // In a real project, this would be 'gcloud-sonar-ai'

async function main() {
  console.log('--- Chat Session Example ---');

  try {
    const sonar = new SonarAI();
    const chat = await sonar.createChat();

    console.log('Starting chat session. Type "exit" to end.');
    
    const questions = [
      "What is the main purpose of the James Webb Space Telescope?",
      "What kind of discoveries has it made so far?",
      "How is it different from the Hubble telescope?",
    ];

    for (const q of questions) {
        console.log(`\n> User: ${q}`);
        const response = await chat.sendMessage(q);
        console.log(`\n< AI: ${response.text}`);
        if(response.sources.length > 0) {
            console.log(`\n< AI Sources:`);
            response.sources.forEach((s, i) => console.log(`  [${i+1}] ${s.title}: ${s.url}`));
        }
    }
    
    console.log('\n--- Chat History ---');
    const history = chat.getHistory();
    history.forEach((turn) => {
        console.log(`[${turn.timestamp}] ${turn.role}: ${turn.content.substring(0, 80)}...`);
    });
    console.log('--------------------');
    
    chat.clearHistory();
    console.log('\nChat history cleared.');
    console.log(`History length: ${chat.getHistory().length}`);


  } catch (error) {
    console.error('An error occurred during the chat session:', error);
  }
}

main(); 
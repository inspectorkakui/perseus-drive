/**
 * Agent Communication Tests
 * 
 * Tests the communication between agents in the Perseus Drive system.
 * Verifies that messages are properly sent, received, and processed.
 */

const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');
const agentMessenger = require('../tools/agent-messenger');
const knowledgeBase = require('../tools/knowledge-base');

// Enhanced waitForMessage utility to handle race conditions
function waitForMessage(agentId, messageType = null, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      agentMessenger.removeListener('message:received', messageHandler);
      reject(new Error(`Timeout waiting for ${messageType ? messageType + ' ' : ''}message to ${agentId}`));
    }, timeout);
    
    // Check if the message is already in the queue before waiting
    const existingMessages = agentMessenger.getMessages(agentId, false);
    const matchingMessage = existingMessages.find(msg => 
      (!messageType || msg.type === messageType)
    );
    
    if (matchingMessage) {
      clearTimeout(timer);
      resolve(matchingMessage);
      return;
    }
    
    // If no existing message, set up the listener
    const messageHandler = (message) => {
      if (message.to === agentId && (!messageType || message.type === messageType)) {
        clearTimeout(timer);
        // Remove the listener to avoid memory leaks
        agentMessenger.removeListener('message:received', messageHandler);
        resolve(message);
      }
    };
    
    // Add the listener
    agentMessenger.on('message:received', messageHandler);
  });
}

// Simple mock market data for testing
const mockMarketData = {
  symbol: 'BTC-USD',
  prices: [100, 102, 104, 103, 105],
  timestamp: new Date().toISOString()
};

// Test basic agent communication
async function testAgentCommunication() {
  try {
    console.log('============================================');
    console.log('Testing agent communication...');
    console.log('============================================');
    
    // Initialize agents
    await promptEngineeringAgent.initialize();
    await dataProcessingAgent.initialize();
    
    // Register agents with messenger (should be done by the initialize method, but just to be sure)
    agentMessenger.registerAgent('prompt-engineering', 'core');
    agentMessenger.registerAgent('data-processing', 'data');
    
    console.log('\n1. Testing message sending...');
    // Send test message from prompt agent to data agent
    const messageId = await promptEngineeringAgent.sendMessage(
      'data-processing',
      mockMarketData,
      'data_request'
    );
    
    console.log(`Sent message: ${messageId}`);
    
    console.log('\n2. Waiting for response...');
    // Wait for response with specific type
    const response = await waitForMessage('prompt-engineering', 'data_response');
    console.log('Received response:', JSON.stringify(response.content, null, 2));
    
    console.log('\n3. Testing knowledge base...');
    // Test knowledge base
    await knowledgeBase.storeKnowledge(
      'test',
      'sample',
      { value: 'test-data' }
    );
    
    const knowledge = await knowledgeBase.getKnowledge('test', 'sample');
    console.log('Retrieved knowledge:', JSON.stringify(knowledge, null, 2));
    
    console.log('\n4. Testing knowledge versioning...');
    // Test knowledge versioning
    await knowledgeBase.storeKnowledge(
      'test',
      'sample',
      { value: 'updated-test-data' }
    );
    
    const updatedKnowledge = await knowledgeBase.getKnowledge('test', 'sample');
    console.log('Retrieved updated knowledge:', JSON.stringify(updatedKnowledge, null, 2));
    
    const versionHistory = knowledgeBase.getVersionHistory('test', 'sample');
    console.log('Version history:', JSON.stringify(versionHistory, null, 2));
    
    console.log('\n============================================');
    console.log('Tests completed successfully');
    console.log('============================================');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    agentMessenger.unregisterAgent('prompt-engineering');
    agentMessenger.unregisterAgent('data-processing');
    process.exit(0); // Ensure the process exits when done
  }
}

// Run the tests
testAgentCommunication(); 
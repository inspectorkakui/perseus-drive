/**
 * Simple Test Script
 * 
 * A simplified test for the Perseus Drive system.
 * Tests basic agent functionality and the knowledge base without complex event handling.
 */

const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');
const knowledgeBase = require('../tools/knowledge-base');

// Mock data
const mockMarketData = {
  symbol: 'BTC-USD',
  prices: [100, 102, 104, 103, 105],
  timestamp: new Date().toISOString()
};

// Run simplified tests
async function runTests() {
  try {
    console.log('============================================');
    console.log('Running simplified Perseus Drive tests...');
    console.log('============================================');
    
    // Test 1: Initialize agents
    console.log('\nTest 1: Initializing agents...');
    await promptEngineeringAgent.initialize();
    await dataProcessingAgent.initialize();
    console.log('Agents initialized successfully');
    
    // Test 2: Knowledge Base
    console.log('\nTest 2: Testing Knowledge Base...');
    await knowledgeBase.storeKnowledge('test', 'key1', { data: 'Test data 1' });
    const data1 = await knowledgeBase.getKnowledge('test', 'key1');
    console.log('Retrieved data:', data1);
    
    // Test 3: Knowledge Base versioning
    console.log('\nTest 3: Testing Knowledge Base versioning...');
    await knowledgeBase.storeKnowledge('test', 'key1', { data: 'Updated test data' });
    const updatedData = await knowledgeBase.getKnowledge('test', 'key1');
    console.log('Retrieved updated data:', updatedData);
    
    const versionHistory = knowledgeBase.getVersionHistory('test', 'key1');
    console.log('Version history:', versionHistory);
    
    // Test 4: Direct Processing Test
    console.log('\nTest 4: Testing Data Processing Agent directly...');
    const processedData = await dataProcessingAgent.process(mockMarketData);
    console.log('Processed market data:', processedData);
    
    // Test 5: Retrieve prompts
    console.log('\nTest 5: Testing Prompt Engineering Agent...');
    const strategyPrompt = await promptEngineeringAgent.getPrompt('strategy');
    console.log('Retrieved strategy prompt');
    
    console.log('\n============================================');
    console.log('All tests completed successfully');
    console.log('============================================');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nTests finished, exiting...');
    process.exit(0);
  }
}

// Run the tests
runTests(); 
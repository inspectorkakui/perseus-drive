/**
 * Strategy Agent Tests
 * 
 * Tests the Strategy Agent implementation, signal generation,
 * and performance tracking functionality.
 */

const strategyAgent = require('../agents/strategy-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');
const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const agentMessenger = require('../tools/agent-messenger');
const knowledgeBase = require('../tools/knowledge-base');
const { createComponentLogger } = require('../tools/logger');

// Create test-specific logger
const logger = createComponentLogger('STRATEGY-TEST');

// Enhanced waitForMessage utility to handle race conditions
function waitForMessage(agentId, messageType = null, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      agentMessenger.removeListener('message:received', messageHandler);
      reject(new Error(`Timeout waiting for ${messageType ? messageType + ' ' : ''}message to ${agentId}`));
    }, timeout);
    
    // Check if the message is already in the queue before waiting
    const existingMessages = agentMessenger.getMessages(agentId, false);
    console.log(`Checking for existing messages for ${agentId}. Found ${existingMessages.length} messages`);
    
    if (existingMessages.length > 0) {
      console.log(`Message types in queue: ${existingMessages.map(m => m.type).join(', ')}`);
    }
    
    const matchingMessage = existingMessages.find(msg => 
      (!messageType || msg.type === messageType)
    );
    
    if (matchingMessage) {
      console.log(`Found matching message of type ${matchingMessage.type}`);
      clearTimeout(timer);
      resolve(matchingMessage);
      return;
    }
    
    // If no existing message, set up the listener
    const messageHandler = (message) => {
      console.log(`Message received: to=${message.to}, type=${message.type}`);
      if (message.to === agentId && (!messageType || message.type === messageType)) {
        console.log(`Message matched criteria for ${agentId}, type=${message.type}`);
        clearTimeout(timer);
        agentMessenger.removeListener('message:received', messageHandler);
        resolve(message);
      }
    };
    
    // Add the listener
    agentMessenger.on('message:received', messageHandler);
  });
}

// Mock market data for testing
const createMockMarketData = (symbol, trend) => {
  let prices = [];
  
  switch (trend) {
    case 'up':
      prices = [100, 101, 102, 103, 104, 105];
      break;
    case 'down':
      prices = [105, 104, 103, 102, 101, 100];
      break;
    case 'volatile':
      prices = [100, 103, 101, 104, 102, 105];
      break;
    case 'sideways':
      prices = [100, 101, 100, 101, 100, 101];
      break;
    default:
      prices = [100, 101, 102, 103, 104, 105];
  }
  
  return {
    symbol,
    prices,
    timestamp: new Date().toISOString(),
    volume: 1000000,
    exchange: 'test-exchange'
  };
};

// Test strategy agent functionality
async function testStrategyAgent() {
  try {
    console.log('============================================');
    console.log('Testing Strategy Agent functionality...');
    console.log('============================================');
    
    // Initialize required agents
    console.log('\n1. Initializing agents...');
    await promptEngineeringAgent.initialize();
    await dataProcessingAgent.initialize();
    await strategyAgent.initialize();
    
    // Test default strategies registration
    console.log('\n2. Checking registered strategies...');
    const registeredStrategies = Array.from(strategyAgent.strategies.keys());
    console.log(`Registered strategies (${registeredStrategies.length}): ${JSON.stringify(registeredStrategies, null, 2)}`);
    
    if (registeredStrategies.length === 0) {
      throw new Error('No strategies registered');
    }
    
    // Test strategy registration
    console.log('\n3. Testing strategy registration...');
    const registered = strategyAgent.registerStrategy(
      'test-strategy', 
      'Test Strategy',
      function(data) {
        const prices = data.prices;
        const lastPrice = prices[prices.length - 1];
        
        // Simple strategy that buys when price is below 100 and sells when above 105
        if (lastPrice < 100) {
          return {
            action: 'BUY',
            reason: 'Price below 100',
            confidence: 0.8,
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 0.95,
              takeProfit: 105
            }
          };
        } else if (lastPrice > 105) {
          return {
            action: 'SELL',
            reason: 'Price above 105',
            confidence: 0.8,
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 1.05,
              takeProfit: 100
            }
          };
        }
        return null;
      }
    );
    
    if (!registered) {
      throw new Error('Failed to register custom strategy');
    }
    console.log('Successfully registered custom strategy: Test Strategy (test-strategy)');
    
    // Test uptrend signal generation
    console.log('\n4. Testing uptrend signal generation...');
    const uptrendMarketData = createMockMarketData('BTC-USD', 'up');
    const processedUptrendData = await dataProcessingAgent.process(uptrendMarketData);
    const uptrendSignals = await strategyAgent.process(processedUptrendData);
    
    console.log(`Generated ${uptrendSignals.length} signals for uptrend`);
    console.log('Sample signal:', uptrendSignals.length > 0 ? JSON.stringify(uptrendSignals[0], null, 2) : 'No signals');
    
    // Test downtrend signal generation
    console.log('\n5. Testing downtrend signal generation...');
    const downtrendMarketData = createMockMarketData('BTC-USD', 'down');
    const processedDowntrendData = await dataProcessingAgent.process(downtrendMarketData);
    const downtrendSignals = await strategyAgent.process(processedDowntrendData);
    
    console.log(`Generated ${downtrendSignals.length} signals for downtrend`);
    console.log('Sample signal:', downtrendSignals.length > 0 ? JSON.stringify(downtrendSignals[0], null, 2) : 'No signals');
    
    // Test performance tracking
    console.log('\n6. Testing performance tracking...');
    
    // Record successful trade
    const successfulOutcome = strategyAgent.recordTradeOutcome(
      'test-strategy',
      {
        action: 'BUY',
        entryPrice: 100,
        exitPrice: 110,
        timestamp: new Date().toISOString(),
        symbol: 'BTC-USD'
      },
      true,
      10
    );
    
    // Record failed trade
    const failedOutcome = strategyAgent.recordTradeOutcome(
      'test-strategy',
      {
        action: 'BUY',
        entryPrice: 100,
        exitPrice: 95,
        timestamp: new Date().toISOString(),
        symbol: 'BTC-USD'
      },
      false,
      -5
    );
    
    // Get performance report
    const report = strategyAgent.getPerformanceReport('test-strategy');
    console.log(`Performance report: ${JSON.stringify(report, null, 2)}`);
    
    // Test performance reporting via messages
    console.log('\n7. Testing performance reporting via messaging...');
    
    // Register a test agent to receive messages
    const testAgentId = 'test-agent';
    agentMessenger.registerAgent(testAgentId, 'test');
    
    // Send performance request
    await agentMessenger.sendMessage(testAgentId, 'strategy', {
      strategyId: 'test-strategy'
    }, 'performance_request');
    
    // Wait for response
    try {
      const response = await waitForMessage(testAgentId, 'performance_response', 5000);
      
      if (response && response.type === 'performance_response') {
        console.log(`Received performance report via messaging: ${JSON.stringify(response.content ? response.content.report : response.report, null, 2)}`);
      } else {
        throw new Error('Invalid performance response');
      }
    } catch (error) {
      console.error(`Error waiting for performance response: ${error.message}`);
      throw error;
    } finally {
      // Cleanup
      agentMessenger.unregisterAgent(testAgentId);
    }
    
    console.log('\n============================================');
    console.log('All Strategy Agent tests completed successfully');
    console.log('============================================');
    
    return true;
  } catch (error) {
    console.error('Strategy Agent test failed:', error);
    return false;
  }
}

// Run the tests
testStrategyAgent()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in tests:', error);
    process.exit(1);
  }); 
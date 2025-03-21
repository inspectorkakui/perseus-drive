/**
 * Perseus Drive Debug Suite
 * 
 * Comprehensive testing and debugging suite for the Perseus Drive system.
 * Tests all core components, agent interactions, and system integration.
 */

const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');
const knowledgeBase = require('../tools/knowledge-base');
const agentMessenger = require('../tools/agent-messenger');
const { createComponentLogger } = require('../tools/logger');
const fs = require('fs').promises;
const path = require('path');
const strategyAgent = require('../agents/strategy-agent');

// Create debug-specific logger
const logger = createComponentLogger('DEBUG-SUITE');

// Test data
const mockMarketData = {
  symbol: 'BTC-USD',
  prices: [100, 102, 104, 103, 105, 107, 106, 103, 102, 104],
  timestamp: new Date().toISOString(),
  volume: 1250000,
  exchange: 'coinbase'
};

// Create log directory
async function ensureLogDir() {
  const logDir = path.join(__dirname, '../logs');
  try {
    await fs.mkdir(logDir, { recursive: true });
    return logDir;
  } catch (error) {
    logger.error('Error creating log directory:', { error });
    return null;
  }
}

// Log test results
async function logTestResult(testName, success, details) {
  const logDir = await ensureLogDir();
  if (!logDir) return;
  
  const timestamp = new Date().toISOString();
  const logFile = path.join(logDir, 'debug-tests.log');
  
  const logEntry = {
    test: testName,
    timestamp,
    success,
    details
  };
  
  try {
    let existingLogs = [];
    try {
      const logData = await fs.readFile(logFile, 'utf8');
      existingLogs = JSON.parse(logData);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
    }
    
    existingLogs.push(logEntry);
    await fs.writeFile(logFile, JSON.stringify(existingLogs, null, 2), 'utf8');
  } catch (error) {
    logger.error('Error writing log:', { error });
  }
}

// Test utilities
function validateObject(obj, requiredFields) {
  const missingFields = requiredFields.filter(field => !(field in obj));
  return {
    valid: missingFields.length === 0,
    missingFields
  };
}

// Wait for message with timeout
function waitForMessage(agentId, messageType = null, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      agentMessenger.removeListener('message:received', messageHandler);
      reject(new Error(`Timeout waiting for ${messageType ? messageType + ' ' : ''}message to ${agentId}`));
    }, timeout);
    
    logger.debug(`Waiting for ${messageType || 'any'} message for agent ${agentId}`);
    
    // Check if the message is already in the queue before waiting
    const existingMessages = agentMessenger.getMessages(agentId, false);
    logger.debug(`Found ${existingMessages.length} existing messages for agent ${agentId}`);
    
    if (existingMessages.length > 0) {
      logger.debug(`Message types in queue: ${existingMessages.map(m => m.type).join(', ')}`);
    }
    
    const matchingMessage = existingMessages.find(msg => 
      (!messageType || msg.type === messageType)
    );
    
    if (matchingMessage) {
      logger.debug(`Found matching existing message of type ${matchingMessage.type}`);
      clearTimeout(timer);
      resolve(matchingMessage);
      return;
    }
    
    // If no existing message, set up the listener
    const messageHandler = (message) => {
      logger.debug(`Received message: to=${message.to}, from=${message.from}, type=${message.type}`);
      if (message.to === agentId && (!messageType || message.type === messageType)) {
        logger.debug(`Message matched criteria for ${agentId}, type=${message.type}`);
        clearTimeout(timer);
        agentMessenger.removeListener('message:received', messageHandler);
        resolve(message);
      }
    };
    
    // Add the listener
    agentMessenger.on('message:received', messageHandler);
  });
}

// Run all tests
async function runDebugSuite() {
  logger.info('======================================================');
  logger.info('PERSEUS DRIVE COMPREHENSIVE DEBUG SUITE');
  logger.info('======================================================');
  
  const testResults = {
    knowledgeBase: { success: false, details: {} },
    agentMessenger: { success: false, details: {} },
    promptEngineeringAgent: { success: false, details: {} },
    dataProcessingAgent: { success: false, details: {} },
    interAgentCommunication: { success: false, details: {} },
    systemIntegration: { success: false, details: {} },
    strategyAgent: { success: false, details: {} }
  };
  
  try {
    // ========== Test 1: Knowledge Base ==========
    logger.info('Test 1: Knowledge Base Component');
    logger.info('--------------------------------');
    
    // 1.1: Basic storage and retrieval
    try {
      logger.info('1.1: Testing basic storage and retrieval...');
      await knowledgeBase.storeKnowledge('debug', 'test1', { value: 'Debug test data' });
      const data = await knowledgeBase.getKnowledge('debug', 'test1');
      
      if (!data || data.data.value !== 'Debug test data') {
        throw new Error('Knowledge retrieval failed');
      }
      
      logger.info('✓ Basic storage and retrieval works correctly');
      testResults.knowledgeBase.details.basicStorageRetrieval = true;
    } catch (error) {
      logger.error('✗ Basic storage and retrieval test failed:', { error: error.message });
      testResults.knowledgeBase.details.basicStorageRetrieval = false;
    }
    
    // 1.2: Versioning functionality
    try {
      logger.info('1.2: Testing versioning functionality...');
      // Store multiple versions
      await knowledgeBase.storeKnowledge('debug', 'versioned', { version: 1 });
      await knowledgeBase.storeKnowledge('debug', 'versioned', { version: 2 });
      await knowledgeBase.storeKnowledge('debug', 'versioned', { version: 3 });
      
      // Get latest
      const latest = await knowledgeBase.getKnowledge('debug', 'versioned');
      if (!latest || latest.data.version !== 3) {
        throw new Error('Latest version retrieval failed');
      }
      
      // Get history
      const history = knowledgeBase.getVersionHistory('debug', 'versioned');
      if (!history || history.length !== 2 || 
          history[0].data.version !== 1 || 
          history[1].data.version !== 2) {
        throw new Error('Version history retrieval failed');
      }
      
      logger.info('✓ Versioning functionality works correctly');
      testResults.knowledgeBase.details.versioningFunctionality = true;
    } catch (error) {
      logger.error('✗ Versioning functionality test failed:', { error: error.message });
      testResults.knowledgeBase.details.versioningFunctionality = false;
    }
    
    // 1.3: Category management
    try {
      logger.info('1.3: Testing category management...');
      await knowledgeBase.storeKnowledge('category1', 'item1', { data: 'Category 1 data' });
      await knowledgeBase.storeKnowledge('category2', 'item1', { data: 'Category 2 data' });
      
      const categories = knowledgeBase.getCategories();
      if (!categories.includes('category1') || !categories.includes('category2')) {
        throw new Error('Category management failed');
      }
      
      const cat1Items = await knowledgeBase.queryByCategory('category1');
      if (!cat1Items || cat1Items.length === 0 || cat1Items[0].data.data !== 'Category 1 data') {
        throw new Error('Category query failed');
      }
      
      logger.info('✓ Category management works correctly');
      testResults.knowledgeBase.details.categoryManagement = true;
    } catch (error) {
      logger.error('✗ Category management test failed:', { error: error.message });
      testResults.knowledgeBase.details.categoryManagement = false;
    }
    
    testResults.knowledgeBase.success = 
      testResults.knowledgeBase.details.basicStorageRetrieval && 
      testResults.knowledgeBase.details.versioningFunctionality &&
      testResults.knowledgeBase.details.categoryManagement;
    
    // ========== Test 2: Agent Messenger ==========
    logger.info('\nTest 2: Agent Messenger Component');
    logger.info('--------------------------------');
    
    // 2.1: Agent registration
    try {
      logger.info('2.1: Testing agent registration...');
      agentMessenger.registerAgent('test-agent-1', 'test');
      agentMessenger.registerAgent('test-agent-2', 'test');
      
      if (!agentMessenger.activeAgents.has('test-agent-1') || !agentMessenger.activeAgents.has('test-agent-2')) {
        throw new Error('Agent registration failed');
      }
      
      logger.info('✓ Agent registration works correctly');
      testResults.agentMessenger.details.agentRegistration = true;
    } catch (error) {
      logger.error('✗ Agent registration test failed:', { error: error.message });
      testResults.agentMessenger.details.agentRegistration = false;
    }
    
    // 2.2: Message sending and queuing
    try {
      logger.info('\n2.2: Testing message sending and queuing...');
      const messagePromise = new Promise((resolve) => {
        agentMessenger.once('message:received', (message) => {
          resolve(message);
        });
      });
      
      const messageId = agentMessenger.sendMessage('test-agent-1', 'test-agent-2', { test: 'data' }, 'test');
      const message = await messagePromise;
      
      if (!messageId || message.from !== 'test-agent-1' || message.to !== 'test-agent-2' || 
          message.type !== 'test' || !message.content.test) {
        throw new Error('Message sending failed');
      }
      
      logger.info('✓ Message sending and queuing works correctly');
      testResults.agentMessenger.details.messageSendingQueuing = true;
    } catch (error) {
      logger.error('✗ Message sending and queuing test failed:', { error: error.message });
      testResults.agentMessenger.details.messageSendingQueuing = false;
    }
    
    // 2.3: Message retrieval
    try {
      logger.info('\n2.3: Testing message retrieval...');
      
      // Clear any existing messages first
      agentMessenger.clearAllQueues();
      
      // Send a test message
      agentMessenger.sendMessage('test-agent-1', 'test-agent-2', { test: 'retrieval' }, 'retrieval');
      
      // Get messages without clearing
      const messages = agentMessenger.getMessages('test-agent-2', false);
      
      if (!messages || messages.length === 0) {
        throw new Error('No messages found in queue');
      }
      
      if (messages[0].content.test !== 'retrieval') {
        throw new Error(`Message content incorrect: ${JSON.stringify(messages[0].content)}`);
      }
      
      logger.info('✓ Message retrieval works correctly');
      testResults.agentMessenger.details.messageRetrieval = true;
    } catch (error) {
      logger.error('✗ Message retrieval test failed:', { error: error.message });
      testResults.agentMessenger.details.messageRetrieval = false;
    }
    
    testResults.agentMessenger.success = 
      testResults.agentMessenger.details.agentRegistration &&
      testResults.agentMessenger.details.messageSendingQueuing &&
      testResults.agentMessenger.details.messageRetrieval;
    
    // ========== Test 3: Prompt Engineering Agent ==========
    logger.info('\nTest 3: Prompt Engineering Agent');
    logger.info('--------------------------------');
    
    // 3.1: Initialization
    try {
      logger.info('3.1: Testing agent initialization...');
      await promptEngineeringAgent.initialize();
      
      if (!promptEngineeringAgent.promptLibrary || Object.keys(promptEngineeringAgent.promptLibrary).length === 0) {
        throw new Error('Prompt Engineering Agent initialization failed');
      }
      
      logger.info('✓ Prompt Engineering Agent initialization works correctly');
      testResults.promptEngineeringAgent.details.initialization = true;
    } catch (error) {
      logger.error('✗ Prompt Engineering Agent initialization test failed:', { error: error.message });
      testResults.promptEngineeringAgent.details.initialization = false;
    }
    
    // 3.2: Prompt retrieval
    try {
      logger.info('\n3.2: Testing prompt retrieval...');
      const dataPrompt = await promptEngineeringAgent.getPrompt('data');
      const strategyPrompt = await promptEngineeringAgent.getPrompt('strategy');
      
      if (!dataPrompt || !strategyPrompt) {
        throw new Error('Prompt retrieval failed');
      }
      
      logger.info('✓ Prompt retrieval works correctly');
      testResults.promptEngineeringAgent.details.promptRetrieval = true;
    } catch (error) {
      logger.error('✗ Prompt retrieval test failed:', { error: error.message });
      testResults.promptEngineeringAgent.details.promptRetrieval = false;
    }
    
    // 3.3: Prompt customization
    try {
      logger.info('\n3.3: Testing prompt customization...');
      const context = {
        marketConditions: 'Bullish trend',
        previousOutputs: { key: 'value' },
        systemDirectives: 'Optimize for long positions'
      };
      
      const basePrompt = 'You are the Test Agent for Perseus Drive.';
      const customized = promptEngineeringAgent.customizePrompt(basePrompt, context);
      
      if (!customized.includes('Bullish trend') || 
          !customized.includes('value') || 
          !customized.includes('Optimize for long positions')) {
        throw new Error('Prompt customization failed');
      }
      
      logger.info('✓ Prompt customization works correctly');
      testResults.promptEngineeringAgent.details.promptCustomization = true;
    } catch (error) {
      logger.error('✗ Prompt customization test failed:', { error: error.message });
      testResults.promptEngineeringAgent.details.promptCustomization = false;
    }
    
    testResults.promptEngineeringAgent.success = 
      testResults.promptEngineeringAgent.details.initialization &&
      testResults.promptEngineeringAgent.details.promptRetrieval &&
      testResults.promptEngineeringAgent.details.promptCustomization;
    
    // ========== Test 4: Data Processing Agent ==========
    logger.info('\nTest 4: Data Processing Agent');
    logger.info('--------------------------------');
    
    // 4.1: Initialization
    try {
      logger.info('4.1: Testing agent initialization...');
      await dataProcessingAgent.initialize();
      
      if (!dataProcessingAgent.isInitialized) {
        throw new Error('Data Processing Agent initialization failed');
      }
      
      logger.info('✓ Data Processing Agent initialization works correctly');
      testResults.dataProcessingAgent.details.initialization = true;
    } catch (error) {
      logger.error('✗ Data Processing Agent initialization test failed:', { error: error.message });
      testResults.dataProcessingAgent.details.initialization = false;
    }
    
    // 4.2: Data processing
    try {
      logger.info('\n4.2: Testing data processing functionality...');
      const processedData = await dataProcessingAgent.process(mockMarketData);
      
      // Validate result structure
      const validation = validateObject(processedData, ['timestamp', 'original', 'processed']);
      if (!validation.valid) {
        throw new Error(`Invalid processed data, missing fields: ${validation.missingFields.join(', ')}`);
      }
      
      // Validate calculations
      const expectedMean = mockMarketData.prices.reduce((sum, p) => sum + p, 0) / mockMarketData.prices.length;
      const calculatedMean = processedData.processed.mean;
      
      if (Math.abs(calculatedMean - expectedMean) > 0.001) {
        throw new Error(`Mean calculation is incorrect: ${calculatedMean} vs ${expectedMean}`);
      }
      
      logger.info('✓ Data processing functionality works correctly');
      testResults.dataProcessingAgent.details.dataProcessing = true;
    } catch (error) {
      logger.error('✗ Data processing functionality test failed:', { error: error.message });
      testResults.dataProcessingAgent.details.dataProcessing = false;
    }
    
    // 4.3: Technical indicators
    try {
      logger.info('\n4.3: Testing technical indicators...');
      const trend = dataProcessingAgent.detectTrend(mockMarketData);
      
      // Simple verification based on input data
      const firstPrice = mockMarketData.prices[0];
      const lastPrice = mockMarketData.prices[mockMarketData.prices.length - 1];
      
      const expectedTrend = 
        lastPrice > firstPrice * 1.05 ? 'strong_up' :
        lastPrice > firstPrice ? 'up' :
        lastPrice < firstPrice * 0.95 ? 'strong_down' :
        lastPrice < firstPrice ? 'down' : 'sideways';
      
      if (trend !== expectedTrend) {
        throw new Error(`Trend detection is incorrect: ${trend} vs ${expectedTrend}`);
      }
      
      logger.info('✓ Technical indicators work correctly');
      testResults.dataProcessingAgent.details.technicalIndicators = true;
    } catch (error) {
      logger.error('✗ Technical indicators test failed:', { error: error.message });
      testResults.dataProcessingAgent.details.technicalIndicators = false;
    }
    
    testResults.dataProcessingAgent.success = 
      testResults.dataProcessingAgent.details.initialization &&
      testResults.dataProcessingAgent.details.dataProcessing &&
      testResults.dataProcessingAgent.details.technicalIndicators;
    
    // ========== Test 5: Inter-agent Communication ==========
    logger.info('\nTest 5: Inter-agent Communication');
    logger.info('--------------------------------');
    
    // 5.1: Message passing
    try {
      logger.info('5.1: Testing message passing between agents...');
      
      // Send data request from Prompt Engineering to Data Processing agent
      const messageId = await promptEngineeringAgent.sendMessage(
        'data-processing',
        mockMarketData,
        'data_request'
      );
      
      if (!messageId) {
        throw new Error('Failed to send message from Prompt Engineering to Data Processing agent');
      }
      
      logger.info('✓ Message passing works correctly');
      testResults.interAgentCommunication.details.messagePassing = true;
    } catch (error) {
      logger.error('✗ Message passing test failed:', { error: error.message });
      testResults.interAgentCommunication.details.messagePassing = false;
    }
    
    // 5.2: Knowledge sharing
    try {
      logger.info('\n5.2: Testing knowledge sharing between agents...');
      
      // Store knowledge from Prompt Engineering agent
      await promptEngineeringAgent.storeKnowledge('shared', 'test-key', { data: 'Shared test data' });
      
      // Retrieve knowledge from Data Processing agent
      const sharedData = await dataProcessingAgent.getKnowledge('shared', 'test-key');
      
      if (!sharedData || sharedData.data.data !== 'Shared test data') {
        throw new Error('Knowledge sharing between agents failed');
      }
      
      logger.info('✓ Knowledge sharing works correctly');
      testResults.interAgentCommunication.details.knowledgeSharing = true;
    } catch (error) {
      logger.error('✗ Knowledge sharing test failed:', { error: error.message });
      testResults.interAgentCommunication.details.knowledgeSharing = false;
    }
    
    // 5.3: Message handling
    try {
      logger.info('\n5.3: Testing message handling...');
      
      // Register a one-time event listener for the response
      const responsePromise = waitForMessage('prompt-engineering', 'data_response', 3000);
      
      // Send data request again
      await promptEngineeringAgent.sendMessage(
        'data-processing',
        mockMarketData,
        'data_request'
      );
      
      // Wait for response
      const response = await responsePromise;
      
      if (!response || !response.content || !response.content.processed) {
        throw new Error('Message handling failed');
      }
      
      logger.info('✓ Message handling works correctly');
      testResults.interAgentCommunication.details.messageHandling = true;
    } catch (error) {
      logger.error('✗ Message handling test failed:', { error: error.message });
      testResults.interAgentCommunication.details.messageHandling = false;
    }
    
    testResults.interAgentCommunication.success = 
      testResults.interAgentCommunication.details.messagePassing &&
      testResults.interAgentCommunication.details.knowledgeSharing &&
      testResults.interAgentCommunication.details.messageHandling;
    
    // ========== Test 6: System Integration ==========
    logger.info('\nTest 6: System Integration');
    logger.info('--------------------------------');
    
    // 6.1: End-to-end workflow
    try {
      logger.info('6.1: Testing end-to-end workflow...');
      
      // 1. Get prompt from Prompt Engineering Agent
      const dataPrompt = await promptEngineeringAgent.getPrompt('data');
      
      // 2. Store it in the Knowledge Base
      await knowledgeBase.storeKnowledge('system-test', 'data-prompt', dataPrompt);
      
      // 3. Send market data to Data Processing Agent
      const responsePromise = waitForMessage('prompt-engineering', 'data_response', 3000);
      await promptEngineeringAgent.sendMessage('data-processing', mockMarketData, 'data_request');
      
      // 4. Wait for processed data
      const response = await responsePromise;
      
      // 5. Store processed data in Knowledge Base
      await knowledgeBase.storeKnowledge('system-test', 'processed-data', response.content);
      
      // Verify full workflow
      const storedData = await knowledgeBase.getKnowledge('system-test', 'processed-data');
      if (!storedData || !storedData.data.processed) {
        throw new Error('End-to-end workflow test failed');
      }
      
      logger.info('✓ End-to-end workflow works correctly');
      testResults.systemIntegration.details.endToEndWorkflow = true;
    } catch (error) {
      logger.error('✗ End-to-end workflow test failed:', { error: error.message });
      testResults.systemIntegration.details.endToEndWorkflow = false;
    }
    
    // 6.2: Error handling
    try {
      logger.info('\n6.2: Testing error handling...');
      
      // Try to get non-existent knowledge
      const nonExistentData = await knowledgeBase.getKnowledge('non-existent', 'key');
      if (nonExistentData !== null) {
        throw new Error('Error handling for non-existent knowledge failed');
      }
      
      // Try to process invalid data
      try {
        await dataProcessingAgent.process({ invalid: 'data' });
        throw new Error('Should have thrown an error for invalid data');
      } catch (processingError) {
        // This is expected
      }
      
      logger.info('✓ Error handling works correctly');
      testResults.systemIntegration.details.errorHandling = true;
    } catch (error) {
      logger.error('✗ Error handling test failed:', { error: error.message });
      testResults.systemIntegration.details.errorHandling = false;
    }
    
    testResults.systemIntegration.success = 
      testResults.systemIntegration.details.endToEndWorkflow &&
      testResults.systemIntegration.details.errorHandling;
    
    // ========== Test 6: Strategy Agent ==========
    logger.info('\nTest 6: Strategy Agent');
    logger.info('--------------------------------');
    
    // First, properly initialize the Strategy Agent if it hasn't been initialized yet
    if (!strategyAgent.isInitialized) {
      logger.info('6.1: Initializing Strategy Agent first...');
      await strategyAgent.initialize();
      logger.info('6.1: Strategy Agent initialized');
      
      // Register default strategies
      strategyAgent.registerStrategy('mean-reversion', 'Mean Reversion', (data) => {
        const prices = data.prices;
        const lastPrice = prices[prices.length - 1];
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        
        if (lastPrice > mean * 1.05) {
          return {
            action: 'SELL',
            reason: 'Price significantly above mean',
            confidence: 0.7,
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 1.03,
              takeProfit: mean
            }
          };
        } else if (lastPrice < mean * 0.95) {
          return {
            action: 'BUY',
            reason: 'Price significantly below mean',
            confidence: 0.7,
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 0.97,
              takeProfit: mean
            }
          };
        }
        return null;
      });
      
      strategyAgent.registerStrategy('trend-following', 'Trend Following', (data) => {
        const prices = data.prices;
        const lastPrice = prices[prices.length - 1];
        const prevPrice = prices[prices.length - 2] || lastPrice;
        
        // Simple trend detection
        if (lastPrice > prevPrice * 1.02) {
          return {
            action: 'BUY',
            reason: 'Upward trend detected',
            confidence: 0.6,
            params: {
              entryPrice: lastPrice,
              stopLoss: prevPrice,
              takeProfit: lastPrice * 1.05
            }
          };
        } else if (lastPrice < prevPrice * 0.98) {
          return {
            action: 'SELL',
            reason: 'Downward trend detected',
            confidence: 0.6,
            params: {
              entryPrice: lastPrice,
              stopLoss: prevPrice,
              takeProfit: lastPrice * 0.95
            }
          };
        }
        return null;
      });
    }
    
    // 6.1: Test signal generation
    logger.info('6.1: Testing signal generation...');
    let signalGenerationSuccess = false;
    try {
      // Create mock market data for BTC with a clear uptrend
      const mockData = {
        symbol: 'BTC-USD',
        prices: [100, 102, 104, 106, 108, 110],
        timestamp: new Date().toISOString(),
        volume: [1000, 1020, 980, 1050, 1100, 1150]
      };
      
      // Process the data
      await dataProcessingAgent.process(mockData);
      
      // Generate signals
      const signals = await strategyAgent.process(mockData);
      
      // Check if any signals were generated
      if (signals && signals.length > 0) {
        logger.info(`✓ Generated ${signals.length} signals. First signal: ${JSON.stringify(signals[0], null, 2)}`);
        signalGenerationSuccess = true;
        logger.info('✓ Signal generation test passed');
      } else {
        logger.error('✗ Signal generation test failed: No signals generated for uptrend data');
      }
    } catch (error) {
      logger.error('✗ Signal generation test failed:', { error: error.message });
    }
    testResults.strategyAgent.details.signalGeneration = signalGenerationSuccess;
    
    // 6.2: Test strategy performance tracking
    logger.info('6.2: Testing strategy performance tracking...');
    let performanceTrackingSuccess = false;
    try {
      // Record a test trade outcome
      strategyAgent.recordTradeOutcome(
        'trend-following',
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
      
      // Get performance report
      const report = strategyAgent.getPerformanceReport();
      
      if (report && report.trades && report.trades.length > 0) {
        logger.info(`✓ Performance report generated: ${report.trades.length} trades recorded`);
        performanceTrackingSuccess = true;
        logger.info('✓ Strategy performance tracking test passed');
      } else {
        logger.error('✗ Strategy performance tracking test failed: No performance data');
      }
    } catch (error) {
      logger.error(`✗ Strategy performance tracking test failed: ${error.message}`);
    }
    testResults.strategyAgent.details.performanceTracking = performanceTrackingSuccess;
    
    // 6.3: Test strategy messaging
    logger.info('6.3: Testing strategy messaging...');
    let messagingSuccess = false;
    try {
      // Register a test agent
      const testAgentId = 'strategy-test-agent';
      agentMessenger.registerAgent(testAgentId, 'test');
      
      // Create mock market data for ETH with a clear downtrend
      const mockData = {
        symbol: 'ETH-USD',
        prices: [200, 190, 180, 170, 160, 150],
        timestamp: new Date().toISOString(),
        volume: [2000, 1950, 1900, 1850, 1800, 1750]
      };
      
      // Process the data
      await dataProcessingAgent.process(mockData);
      
      logger.debug('Sending market data to Strategy Agent...');
      
      // Send the data to the strategy agent (using our own message)
      const messageId = await agentMessenger.sendMessage(testAgentId, 'strategy', 
        mockData, 'market_data'
      );
      
      logger.debug(`Sent market data message: ${messageId}, waiting for signal_response...`);
      
      // Wait for a response (using the improved waitForMessage utility)
      try {
        const response = await waitForMessage(testAgentId, 'signal_response', 5000);
        
        if (response && response.type === 'signal_response') {
          logger.info(`✓ Received signal response: ${JSON.stringify(response.signals || (response.content && response.content.signals) || 'No signals')}`);
          messagingSuccess = true;
          logger.info('✓ Strategy messaging test passed');
        } else {
          logger.error('✗ Strategy messaging test failed: No proper response received');
          logger.error(`Response received: ${JSON.stringify(response)}`);
        }
      } catch (error) {
        logger.error(`✗ Strategy messaging test failed: ${error.message}`);
        
        // Check for any messages received
        const messages = agentMessenger.getMessages(testAgentId, false);
        if (messages.length > 0) {
          logger.debug(`Found ${messages.length} messages in queue for ${testAgentId}`);
          messages.forEach((msg, i) => {
            logger.debug(`Message ${i+1}: type=${msg.type}, from=${msg.from}`);
          });
        } else {
          logger.debug(`No messages in queue for ${testAgentId}`);
        }
      }
    } catch (error) {
      logger.error(`✗ Strategy messaging test failed: ${error.message}`);
    }
    testResults.strategyAgent.details.messaging = messagingSuccess;
    
    // Cleanup
    agentMessenger.unregisterAgent('strategy-test-agent');
    
    // Set overall success
    testResults.strategyAgent = testResults.strategyAgent || { details: {} };
    testResults.strategyAgent.success = 
      testResults.strategyAgent.details.signalGeneration && 
      testResults.strategyAgent.details.performanceTracking &&
      testResults.strategyAgent.details.messaging;
    
    // Log test results
    for (const [component, result] of Object.entries(testResults)) {
      await logTestResult(component, result.success, result.details);
    }
    
  } catch (error) {
    logger.error('Error in debug suite:', { error });
  } finally {
    // Clean up test agents
    agentMessenger.unregisterAgent('test-agent-1');
    agentMessenger.unregisterAgent('test-agent-2');
    
    // Display results summary
    logger.info('======================================================');
    logger.info('DEBUG SUITE RESULTS SUMMARY');
    logger.info('======================================================');
    
    for (const [component, result] of Object.entries(testResults)) {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      logger.info(`${component}: ${status}`);
      
      for (const [test, passed] of Object.entries(result.details)) {
        const testStatus = passed ? '✓' : '✗';
        logger.info(`  ${testStatus} ${test}`);
      }
      logger.info('');
    }
    
    const overallSuccess = Object.values(testResults).every(result => result.success);
    logger.info(`Overall Status: ${overallSuccess ? '✅ SYSTEM VALIDATED' : '❌ SYSTEM NEEDS FIXES'}`);
    logger.info('======================================================');
    
    // Exit process
    process.exit(0);
  }
}

// Run the debug suite
runDebugSuite(); 
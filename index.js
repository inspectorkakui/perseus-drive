/**
 * Perseus Drive Trading System
 * 
 * A recursive multi-agent architecture for AI-driven trading and investment decision-making.
 * 
 * @module perseus-drive
 * @version 1.0.0
 * @license MIT
 * 
 * @overview
 * Perseus Drive employs a recursive agent-based architecture for AI-driven trading and investment
 * decision-making. The system consists of specialized agents that work together to analyze market 
 * data, develop strategies, evaluate risk, execute trades, and monitor performance.
 * 
 * Key features:
 * - Recursive prompt reinjection system for self-improvement
 * - Multi-strategy trading with performance tracking
 * - Comprehensive risk management and position sizing
 * - Advanced order execution with multiple strategies
 * - Integration with cryptocurrency exchanges
 * 
 * Documentation:
 * - System Architecture: docs/system-architecture.md
 * - Agent Onboarding: docs/agent-onboarding.md
 * - Quick Start: docs/QUICK_START.md
 * 
 * @example
 * // Initialize and start the system
 * const perseusSystem = require('./index');
 * perseusSystem.initialize()
 *   .then(success => {
 *     if (success) {
 *       return perseusSystem.start();
 *     }
 *   })
 *   .then(success => {
 *     if (success) {
 *       console.log('Perseus Drive trading system running');
 *     }
 *   });
 */

// Core modules
const winston = require('winston');
const AgentMessenger = require('./tools/agent-messenger');
const KnowledgeBase = require('./tools/knowledge-base');

// Agent modules
const promptEngineeringAgent = require('./agents/prompt-engineering-agent');
const strategyAgent = require('./agents/strategy-agent');
const riskManagementAgent = require('./agents/risk-management-agent');
const executionAgent = require('./agents/execution-agent');

// Provider management
const ProviderManager = require('./providers/provider-manager');
const CoinbaseProvider = require('./providers/coinbase-provider');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/perseus-drive.log' })
  ]
});

// System components
const agentMessenger = new AgentMessenger();
const knowledgeBase = new KnowledgeBase();
const providerManager = new ProviderManager();

// System state
let systemState = 'stopped';
let activeProviders = [];

/**
 * Initialize the Perseus Drive system
 */
async function initialize() {
  logger.info('Initializing Perseus Drive system');
  
  try {
    // Initialize tools
    await agentMessenger.initialize();
    logger.info('Agent Messenger initialized');
    
    // Initialize knowledge base (no explicit initialize needed for current implementation)
    logger.info('Knowledge Base ready');
    
    // Initialize provider manager
    await providerManager.initialize(knowledgeBase);
    logger.info('Provider Manager initialized');
    
    // Register provider connectors
    const coinbaseProvider = new CoinbaseProvider();
    await providerManager.registerProvider('coinbase', coinbaseProvider);
    logger.info('Providers registered');
    
    // Initialize agents with dependencies
    await promptEngineeringAgent.initialize(agentMessenger, knowledgeBase);
    logger.info('Prompt Engineering Agent initialized');
    
    await strategyAgent.initialize(agentMessenger, knowledgeBase);
    logger.info('Strategy Agent initialized');
    
    await riskManagementAgent.initialize(agentMessenger, knowledgeBase);
    logger.info('Risk Management Agent initialized');
    
    await executionAgent.initialize(agentMessenger, knowledgeBase, {
      executionParams: {
        slippageTolerance: 0.002, // 0.2% slippage tolerance
        retryAttempts: 3,
        smartRoutingEnabled: true
      }
    });
    logger.info('Execution Agent initialized');
    
    // Register exchange with execution agent
    if (coinbaseProvider.supportsTrading) {
      const exchangeClient = coinbaseProvider.getExchangeClient();
      executionAgent.registerExchange('coinbase', exchangeClient);
      logger.info('Exchange registered with Execution Agent');
      
      // Connect to the exchange
      const connected = await executionAgent.connectToExchange('coinbase');
      logger.info(`Exchange connection status: ${connected ? 'Connected' : 'Failed to connect'}`);
    }
    
    // Setup message handling
    setupMessageHandling();
    logger.info('Message handling configured');
    
    // Update system state
    systemState = 'initialized';
    logger.info('Perseus Drive system initialized successfully');
    
    return true;
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Start the Perseus Drive system
 */
async function start() {
  if (systemState !== 'initialized') {
    logger.error('Cannot start: System not initialized');
    return false;
  }
  
  try {
    logger.info('Starting Perseus Drive system');
    
    // Connect to data providers
    const providers = providerManager.getAvailableProviders();
    for (const [providerId, provider] of Object.entries(providers)) {
      try {
        const connected = await provider.connect();
        if (connected) {
          activeProviders.push(providerId);
          logger.info(`Connected to provider: ${providerId}`);
        } else {
          logger.error(`Failed to connect to provider: ${providerId}`);
        }
      } catch (error) {
        logger.error(`Error connecting to provider ${providerId}: ${error.message}`);
      }
    }
    
    if (activeProviders.length === 0) {
      logger.warn('No active providers connected, using mock data');
    }
    
    // Start data streaming
    for (const providerId of activeProviders) {
      const provider = providers[providerId];
      if (provider.startStreaming) {
        await provider.startStreaming(['BTC-USD', 'ETH-USD']);
        logger.info(`Started streaming data from provider: ${providerId}`);
      }
    }
    
    // Update system state
    systemState = 'running';
    logger.info('Perseus Drive system started successfully');
    
    // Publish system status message
    agentMessenger.publish('system_status', {
      status: 'running',
      activeProviders,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    logger.error(`Start failed: ${error.message}`);
    return false;
  }
}

/**
 * Stop the Perseus Drive system
 */
async function stop() {
  if (systemState !== 'running') {
    logger.error('Cannot stop: System not running');
    return false;
  }
  
  try {
    logger.info('Stopping Perseus Drive system');
    
    // Stop data streaming
    const providers = providerManager.getAvailableProviders();
    for (const providerId of activeProviders) {
      const provider = providers[providerId];
      if (provider.stopStreaming) {
        await provider.stopStreaming();
        logger.info(`Stopped streaming data from provider: ${providerId}`);
      }
    }
    
    // Disconnect from data providers
    for (const providerId of activeProviders) {
      const provider = providers[providerId];
      if (provider.disconnect) {
        await provider.disconnect();
        logger.info(`Disconnected from provider: ${providerId}`);
      }
    }
    
    // Clear active providers
    activeProviders = [];
    
    // Update system state
    systemState = 'stopped';
    logger.info('Perseus Drive system stopped successfully');
    
    // Publish system status message
    agentMessenger.publish('system_status', {
      status: 'stopped',
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    logger.error(`Stop failed: ${error.message}`);
    return false;
  }
}

/**
 * Setup message handling for system coordination
 */
function setupMessageHandling() {
  // Handle system control messages
  agentMessenger.subscribe('system_control', async (message) => {
    logger.info(`Received system control message: ${message.action}`);
    
    switch (message.action) {
      case 'start':
        await start();
        break;
      case 'stop':
        await stop();
        break;
      case 'restart':
        await stop();
        await start();
        break;
      default:
        logger.warn(`Unknown system control action: ${message.action}`);
    }
  });
  
  // Handle market data messages
  agentMessenger.subscribe('market_data', async (message) => {
    logger.info(`Received market data for ${message.symbol}`);
    
    // Store market data in knowledge base
    await knowledgeBase.storeKnowledge(
      'market_data',
      `${message.symbol}.current`,
      message
    );
    
    // Process with strategy agent
    if (systemState === 'running') {
      const signals = await strategyAgent.process(message);
      
      if (signals && signals.length > 0) {
        logger.info(`Generated ${signals.length} trading signals`);
        
        // Apply risk management
        const approvedSignals = await riskManagementAgent.evaluateSignals(signals);
        logger.info(`${approvedSignals.length} signals approved by risk management`);
        
        // Execute approved signals
        for (const signal of approvedSignals) {
          // Determine best execution strategy based on signal
          let executionStrategy = 'market';
          if (signal.params && signal.params.orderType) {
            executionStrategy = signal.params.orderType.toLowerCase();
          } else if (signal.confidence < 0.6) {
            executionStrategy = 'limit'; // Use limit orders for lower confidence signals
          } else if (signal.params && signal.params.positionSize > 1000) {
            executionStrategy = 'smart'; // Use smart routing for large orders
          }
          
          // Execute the trade
          const result = await executionAgent.executeTrade(signal, {
            executionStrategy,
            exchange: 'coinbase'
          });
          
          logger.info(`Trade execution result: ${result.success ? 'Success' : 'Failed'}`);
          
          // Store execution result
          await knowledgeBase.storeKnowledge(
            'executions',
            `${signal.symbol}.${Date.now()}`,
            result
          );
        }
      }
    }
  });
}

// Handle process termination for graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down...');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  await stop();
  process.exit(0);
});

// Export functions for external use
module.exports = {
  initialize,
  start,
  stop,
  getSystemState: () => systemState
};

// Run system if this file is executed directly
if (require.main === module) {
  initialize()
    .then(success => {
      if (success) {
        return start();
      } else {
        logger.error('Initialization failed, not starting system');
        return false;
      }
    })
    .then(success => {
      if (success) {
        logger.info('Perseus Drive trading system running');
      } else {
        logger.error('Failed to start Perseus Drive trading system');
      }
    })
    .catch(error => {
      logger.error(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
} 
/**
 * Perseus Drive - Intelligent Trading System
 * 
 * Core system initialization and management
 */

// Import core modules
const BaseAgent = require('./base-agent');

// Import agents
const strategyAgent = require('../agents/strategy-agent');
const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');
const riskManagementAgent = require('../agents/risk-management-agent');

// Import tools
const knowledgeBase = require('../tools/knowledge-base');
const agentMessenger = require('../tools/agent-messenger');
const logger = require('../tools/logger');

// Provider manager
const providerManager = require('../providers/provider-manager');

/**
 * Main system class for Perseus Drive
 */
class PerseusCore {
  /**
   * Create a new Perseus Core instance
   */
  constructor() {
    this.initialized = false;
    this.agents = {
      strategy: strategyAgent,
      promptEngineering: promptEngineeringAgent,
      dataProcessing: dataProcessingAgent,
      riskManagement: riskManagementAgent
    };
    
    this.tools = {
      knowledgeBase,
      agentMessenger,
      logger
    };
    
    this.providerManager = providerManager;
    
    logger.info('Perseus Core created');
  }
  
  /**
   * Initialize the Perseus Drive system
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(options = {}) {
    try {
      logger.info('Initializing Perseus Drive...');
      
      // Initialize knowledge base
      await this.tools.knowledgeBase.initialize();
      
      // Initialize agent messenger
      await this.tools.agentMessenger.initialize();
      
      // Initialize providers
      await this.providerManager.initialize(options.providers || {});
      
      // Initialize all agents
      const agentInitPromises = Object.entries(this.agents).map(async ([name, agent]) => {
        logger.info(`Initializing ${name} agent...`);
        const agentOptions = options[name] || {};
        return agent.initialize(agentOptions);
      });
      
      await Promise.all(agentInitPromises);
      
      this.initialized = true;
      logger.info('Perseus Drive initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing Perseus Drive:', error);
      return false;
    }
  }
  
  /**
   * Run the system with the specified configuration
   * @param {Object} config - System run configuration
   * @returns {Promise<Object>} Run results
   */
  async run(config = {}) {
    if (!this.initialized) {
      throw new Error('Perseus Drive has not been initialized yet');
    }
    
    try {
      logger.info('Starting Perseus Drive run...');
      
      // Get market data from data processing agent
      const marketData = await this.agents.dataProcessing.getMarketData(config.symbols || ['BTC-USD']);
      
      // Generate trade signals from strategy agent
      const signals = await this.agents.strategy.generateSignals(marketData);
      
      // Evaluate signals with risk management agent
      const evaluatedSignals = [];
      
      for (const signal of signals) {
        const symbolMarketData = marketData.find(data => data.symbol === signal.symbol) || marketData[0];
        const evaluation = await this.agents.riskManagement.evaluateTrade(signal, symbolMarketData);
        
        // Only include approved signals
        if (evaluation.approved) {
          evaluatedSignals.push(evaluation.modifiedSignal);
        } else {
          logger.info(`Signal rejected: ${evaluation.reason}`);
        }
      }
      
      // Perform paper or live trading if specified
      if (config.executeTrades && evaluatedSignals.length > 0) {
        // Trade execution would go here in a real system
        logger.info(`Would execute ${evaluatedSignals.length} trades`);
      }
      
      // Return results
      return {
        marketData,
        originalSignals: signals,
        approvedSignals: evaluatedSignals,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error during Perseus Drive run:', error);
      throw error;
    }
  }
  
  /**
   * Safely stop all system activities
   * @returns {Promise<boolean>} Shutdown success
   */
  async shutdown() {
    try {
      logger.info('Shutting down Perseus Drive...');
      
      // Close provider connections
      await this.providerManager.disconnect();
      
      // Perform any other cleanup
      
      logger.info('Perseus Drive shut down successfully');
      return true;
    } catch (error) {
      logger.error('Error shutting down Perseus Drive:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new PerseusCore(); 
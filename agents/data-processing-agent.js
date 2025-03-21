/**
 * Data Processing Agent
 * 
 * Responsible for collecting, cleaning, and processing market data.
 * This agent handles data ingestion, feature engineering, and data
 * preparation for the Strategy Agent.
 */

const BaseAgent = require('../core/base-agent');
const promptEngineeringAgent = require('./prompt-engineering-agent');

class DataProcessingAgent extends BaseAgent {
  constructor() {
    super('data-processing', 'data');
    this.dataCache = {};
    this.dataSources = [];
    
    // Debug: Log that agent is created
    console.log('Data Processing Agent created');
  }
  
  /**
   * Initialize the agent with additional data sources
   * @param {Array} dataSources - List of data sources to use
   * @returns {boolean} Success status
   */
  async initialize(dataSources = []) {
    try {
      // Call base initialization
      await super.initialize();
      
      // Debug: Log that initialization is in progress
      console.log('Data Processing Agent initializing...');
      
      // Get prompt from Prompt Engineering Agent
      const prompt = await promptEngineeringAgent.getPrompt('data');
      
      // Store the prompt
      await this.storeKnowledge('prompts', 'current', prompt);
      
      // Set up data sources
      this.dataSources = dataSources;
      
      this.logger.info('Data Processing Agent initialized with prompt and data sources');
      console.log('Data Processing Agent initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Error initializing Data Processing Agent:', error);
      console.error('Error initializing Data Processing Agent:', error);
      throw error;
    }
  }
  
  /**
   * Process market data
   * @param {object} data - Raw market data
   * @returns {object} Processed data
   */
  async process(data) {
    try {
      this.logger.info('Processing market data');
      console.log('Processing market data:', JSON.stringify(data).substring(0, 100) + '...');
      
      // In a real implementation, this would involve:
      // 1. Data cleaning
      // 2. Feature engineering
      // 3. Normalization
      // 4. Technical indicator calculation
      
      // For now, just return a simple transformation
      const processed = {
        timestamp: new Date(),
        original: data,
        processed: {
          mean: this.calculateMean(data),
          volatility: this.calculateVolatility(data),
          trend: this.detectTrend(data)
        }
      };
      
      // Store the processed data
      await this.storeKnowledge('market-data', `data-${Date.now()}`, processed);
      
      console.log('Processed data successfully');
      return processed;
    } catch (error) {
      this.logger.error('Error processing data:', error);
      console.error('Error processing data:', error);
      throw error;
    }
  }
  
  /**
   * Calculate mean value from data
   * @param {object} data - Market data
   * @returns {number} Mean value
   */
  calculateMean(data) {
    // Simplified implementation
    if (Array.isArray(data.prices)) {
      return data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length;
    }
    return 0;
  }
  
  /**
   * Calculate volatility from data
   * @param {object} data - Market data
   * @returns {number} Volatility measure
   */
  calculateVolatility(data) {
    // Simplified implementation
    if (Array.isArray(data.prices) && data.prices.length > 1) {
      const mean = this.calculateMean(data);
      const variance = data.prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / data.prices.length;
      return Math.sqrt(variance);
    }
    return 0;
  }
  
  /**
   * Detect trend in data
   * @param {object} data - Market data
   * @returns {string} Trend direction
   */
  detectTrend(data) {
    // Simplified implementation
    if (Array.isArray(data.prices) && data.prices.length > 1) {
      const firstPrice = data.prices[0];
      const lastPrice = data.prices[data.prices.length - 1];
      
      if (lastPrice > firstPrice * 1.05) return 'strong_up';
      if (lastPrice > firstPrice) return 'up';
      if (lastPrice < firstPrice * 0.95) return 'strong_down';
      if (lastPrice < firstPrice) return 'down';
      return 'sideways';
    }
    return 'unknown';
  }
  
  /**
   * Handle special agent-specific messages
   * @param {object} message - Message object
   */
  async handleMessage(message) {
    // Call parent handler
    await super.handleMessage(message);
    
    try {
      console.log(`Data Processing Agent handling message: ${message.type}`);
      
      // Process message based on type
      if (message.type === 'data_request') {
        console.log('Received data request, processing...');
        const processedData = await this.process(message.content);
        console.log('Sending processed data back to:', message.from);
        await this.sendMessage(message.from, processedData, 'data_response');
        console.log('Response sent successfully');
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.logger.error('Error handling message:', error);
      await this.sendMessage(message.from, { error: error.message }, 'error');
    }
  }
}

module.exports = new DataProcessingAgent(); 
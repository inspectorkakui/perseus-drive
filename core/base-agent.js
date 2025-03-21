/**
 * Base Agent Class
 * 
 * Abstract base class for all agents in the Perseus Drive system.
 * Provides common functionality for agent lifecycle management,
 * communication, and knowledge management.
 */

const EventEmitter = require('events');
const agentMessenger = require('../tools/agent-messenger');
const knowledgeBase = require('../tools/knowledge-base');
const { createAgentLogger } = require('../tools/logger');

class BaseAgent extends EventEmitter {
  constructor(id, type) {
    super();
    this.id = id;
    this.type = type;
    this.isInitialized = false;
    this.status = 'created';
    
    // Configure agent-specific logger
    this.logger = createAgentLogger(id, type);
    
    // Log agent creation
    this.logger.info(`Agent created: ${id} (${type})`);
  }
  
  /**
   * Initialize the agent
   * @returns {boolean} Success status
   */
  async initialize() {
    try {
      this.logger.info('Initializing agent...');
      
      // Register with the messenger
      agentMessenger.registerAgent(this.id, this.type);
      
      // Setup message handler
      this.setupMessageHandler();
      
      // Mark as initialized
      this.isInitialized = true;
      this.status = 'active';
      
      this.logger.info('Agent initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize agent', { error });
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * Setup message handler
   */
  setupMessageHandler() {
    agentMessenger.on('message:received', (message) => {
      if (message.to === this.id) {
        this.logger.debug(`Received message: ${message.id} from ${message.from}`, { 
          type: message.type 
        });
        this.handleMessage(message);
      }
    });
  }
  
  /**
   * Handle incoming messages
   * @param {object} message - Message object
   */
  async handleMessage(message) {
    try {
      this.logger.info(`Handling message: ${message.id} from ${message.from}`, { 
        type: message.type 
      });
      
      // Emit event for message handling
      this.emit('message', message);
    } catch (error) {
      this.logger.error(`Error handling message: ${message.id}`, { error });
    }
  }
  
  /**
   * Send a message to another agent
   * @param {string} toAgentId - Recipient agent ID
   * @param {object} content - Message content
   * @param {string} messageType - Message type
   * @returns {string} Message ID
   */
  async sendMessage(toAgentId, content, messageType = 'data') {
    try {
      this.logger.info(`Sending ${messageType} message to ${toAgentId}`);
      
      // Validate agent is initialized
      if (!this.isInitialized) {
        throw new Error('Agent not initialized');
      }
      
      // Send message
      const messageId = agentMessenger.sendMessage(this.id, toAgentId, content, messageType);
      
      this.logger.debug(`Message sent: ${messageId}`);
      
      return messageId;
    } catch (error) {
      this.logger.error(`Error sending message to ${toAgentId}`, { error });
      throw error;
    }
  }
  
  /**
   * Store data in the knowledge base
   * @param {string} category - Knowledge category
   * @param {string} key - Knowledge key
   * @param {object} data - Data to store
   * @param {object} metadata - Additional metadata
   * @returns {object} Stored knowledge object
   */
  async storeKnowledge(category, key, data, metadata = {}) {
    try {
      this.logger.info(`Storing knowledge: ${category}.${key}`);
      
      // Validate agent is initialized
      if (!this.isInitialized) {
        throw new Error('Agent not initialized');
      }
      
      // Add agent metadata
      const enhancedMetadata = {
        ...metadata,
        agent: {
          id: this.id,
          type: this.type
        },
        timestamp: new Date()
      };
      
      // Store in knowledge base
      const result = await knowledgeBase.storeKnowledge(category, key, data, enhancedMetadata);
      
      this.logger.debug(`Knowledge stored: ${category}.${key}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error storing knowledge: ${category}.${key}`, { error });
      throw error;
    }
  }
  
  /**
   * Get data from the knowledge base
   * @param {string} category - Knowledge category
   * @param {string} key - Knowledge key
   * @param {string|number} version - Version to retrieve
   * @returns {object} Knowledge object
   */
  async getKnowledge(category, key, version = 'latest') {
    try {
      this.logger.info(`Getting knowledge: ${category}.${key} (version: ${version})`);
      
      // Get from knowledge base
      const result = await knowledgeBase.getKnowledge(category, key, version);
      
      this.logger.debug(`Knowledge retrieved: ${category}.${key}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting knowledge: ${category}.${key}`, { error });
      return null;
    }
  }
  
  /**
   * Process data (to be implemented by subclasses)
   * @param {object} data - Data to process
   * @returns {object} Processed data
   */
  async process(data) {
    this.logger.warn('process() method called on base class');
    return { error: 'Not implemented' };
  }
  
  /**
   * Shutdown the agent
   * @returns {boolean} Success status
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down agent...');
      
      // Unregister from messenger
      agentMessenger.unregisterAgent(this.id);
      
      // Mark as inactive
      this.isInitialized = false;
      this.status = 'inactive';
      
      this.logger.info('Agent shut down successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Error shutting down agent', { error });
      return false;
    }
  }
}

module.exports = BaseAgent; 
/**
 * Agent Messenger
 * 
 * A custom MCP tool for agent communication and message handling.
 * This tool provides message passing, queuing, and event emissions
 * for the Perseus Drive multi-agent system.
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { createComponentLogger } = require('./logger');

// Get component-specific logger
const logger = createComponentLogger('AGENT-MESSENGER');

class AgentMessenger extends EventEmitter {
  constructor() {
    super();
    this.activeAgents = new Set();
    this.agentTypes = new Map();
    this.messageQueues = new Map();
    this.messageHistory = [];
    
    logger.info('Agent Messenger initialized');
  }
  
  /**
   * Register an agent with the messenger
   * @param {string} agentId - Agent ID
   * @param {string} agentType - Agent type
   * @returns {boolean} Success status
   */
  registerAgent(agentId, agentType) {
    try {
      this.activeAgents.add(agentId);
      this.agentTypes.set(agentId, agentType);
      this.messageQueues.set(agentId, []);
      
      logger.info(`Agent registered: ${agentId} (${agentType})`);
      this.emit('agent:registered', { agentId, agentType });
      
      return true;
    } catch (error) {
      logger.error(`Error registering agent ${agentId}:`, { error });
      return false;
    }
  }
  
  /**
   * Unregister an agent from the messenger
   * @param {string} agentId - Agent ID
   * @returns {boolean} Success status
   */
  unregisterAgent(agentId) {
    try {
      this.activeAgents.delete(agentId);
      this.agentTypes.delete(agentId);
      this.messageQueues.delete(agentId);
      
      logger.info(`Agent unregistered: ${agentId}`);
      this.emit('agent:unregistered', { agentId });
      
      return true;
    } catch (error) {
      logger.error(`Error unregistering agent ${agentId}:`, { error });
      return false;
    }
  }
  
  /**
   * Send a message from one agent to another
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} toAgentId - Recipient agent ID
   * @param {object} content - Message content
   * @param {string} type - Message type
   * @returns {string} Message ID
   */
  sendMessage(fromAgentId, toAgentId, content, type = 'data') {
    try {
      // Check if sender and recipient are registered
      if (!this.activeAgents.has(fromAgentId)) {
        logger.warn(`Attempt to send message from unregistered agent: ${fromAgentId}`);
      }
      
      if (!this.activeAgents.has(toAgentId)) {
        logger.warn(`Attempt to send message to unregistered agent: ${toAgentId}`);
      }
      
      // Create message object
      const messageId = uuidv4();
      const timestamp = new Date();
      
      const message = {
        id: messageId,
        from: fromAgentId,
        to: toAgentId,
        type,
        content,
        timestamp
      };
      
      // Add to recipient's queue
      if (this.messageQueues.has(toAgentId)) {
        this.messageQueues.get(toAgentId).push(message);
      } else {
        // Create queue if it doesn't exist (for unregistered agents that might register later)
        this.messageQueues.set(toAgentId, [message]);
      }
      
      // Add to history
      this.messageHistory.push(message);
      
      // Emit events
      this.emit('message:sent', message);
      this.emit('message:received', message);
      
      logger.info(`Message sent: ${messageId} from ${fromAgentId} to ${toAgentId}`, { type });
      return messageId;
    } catch (error) {
      logger.error(`Error sending message from ${fromAgentId} to ${toAgentId}:`, { error });
      throw error;
    }
  }
  
  /**
   * Get messages for an agent
   * @param {string} agentId - Agent ID
   * @param {boolean} clear - Whether to clear the queue
   * @returns {Array} Messages
   */
  getMessages(agentId, clear = false) {
    try {
      if (!this.messageQueues.has(agentId)) {
        // Initialize an empty queue if it doesn't exist
        this.messageQueues.set(agentId, []);
        return [];
      }
      
      // Create a copy of the messages to return
      const messages = [...this.messageQueues.get(agentId)];
      
      if (clear) {
        // Clear the queue if requested
        this.messageQueues.set(agentId, []);
      }
      
      logger.info(`Retrieved ${messages.length} messages for agent ${agentId}`, { clear });
      return messages;
    } catch (error) {
      logger.error(`Error getting messages for ${agentId}:`, { error });
      return [];
    }
  }
  
  /**
   * Get message history between agents
   * @param {string} fromAgentId - Sender agent ID
   * @param {string} toAgentId - Recipient agent ID
   * @param {number} limit - Maximum number of messages
   * @returns {Array} Message history
   */
  getMessageHistory(fromAgentId, toAgentId, limit = 100) {
    try {
      const history = this.messageHistory.filter(message => {
        return (message.from === fromAgentId && message.to === toAgentId) ||
               (message.from === toAgentId && message.to === fromAgentId);
      });
      
      return history.slice(-limit);
    } catch (error) {
      logger.error(`Error getting message history between ${fromAgentId} and ${toAgentId}:`, { error });
      return [];
    }
  }
  
  /**
   * Broadcast a message to all agents
   * @param {string} fromAgentId - Sender agent ID
   * @param {object} content - Message content
   * @param {string} type - Message type
   * @returns {Array} Message IDs
   */
  broadcastMessage(fromAgentId, content, type = 'broadcast') {
    try {
      const messageIds = [];
      
      for (const agentId of this.activeAgents) {
        if (agentId !== fromAgentId) {
          const messageId = this.sendMessage(fromAgentId, agentId, content, type);
          messageIds.push(messageId);
        }
      }
      
      logger.info(`Broadcast message from ${fromAgentId} to ${messageIds.length} agents`, { type });
      return messageIds;
    } catch (error) {
      logger.error(`Error broadcasting message from ${fromAgentId}:`, { error });
      throw error;
    }
  }
  
  /**
   * Clear all message queues
   */
  clearAllQueues() {
    try {
      for (const agentId of this.messageQueues.keys()) {
        this.messageQueues.set(agentId, []);
      }
      
      logger.info('All message queues cleared');
    } catch (error) {
      logger.error('Error clearing message queues:', { error });
    }
  }
}

module.exports = new AgentMessenger(); 
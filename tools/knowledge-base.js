/**
 * Knowledge Base
 * 
 * A custom MCP tool for shared knowledge storage and retrieval.
 * This tool handles the versioning, categorization, and retrieval
 * of knowledge artifacts in the Perseus Drive system.
 */

const EventEmitter = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'knowledge-base.log' })
  ]
});

class KnowledgeBase extends EventEmitter {
  constructor() {
    super();
    this.knowledge = {};
    this.versions = {};
    this.categories = new Set();
    
    logger.info('Knowledge Base initialized');
  }
  
  /**
   * Store knowledge in the knowledge base
   * @param {string} category - Knowledge category
   * @param {string} key - Knowledge key
   * @param {any} data - Knowledge data
   * @param {object} metadata - Additional metadata
   * @returns {boolean} Success status
   */
  async storeKnowledge(category, key, data, metadata = {}) {
    try {
      // Create category if it doesn't exist
      if (!this.knowledge[category]) {
        this.knowledge[category] = {};
        this.versions[category] = {};
        this.categories.add(category);
      }
      
      // Create version history if it doesn't exist
      if (!this.versions[category][key]) {
        this.versions[category][key] = [];
      }
      
      // Version the previous data if it exists
      if (this.knowledge[category][key]) {
        this.versions[category][key].push({
          data: this.knowledge[category][key].data,
          metadata: this.knowledge[category][key].metadata,
          timestamp: this.knowledge[category][key].timestamp
        });
      }
      
      // Store new data
      this.knowledge[category][key] = {
        data,
        metadata: {
          ...metadata,
          lastUpdated: new Date()
        },
        timestamp: new Date()
      };
      
      logger.info(`Knowledge stored: ${category}/${key}`);
      this.emit('knowledge:stored', { category, key });
      
      return true;
    } catch (error) {
      logger.error(`Error storing knowledge ${category}/${key}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve knowledge from the knowledge base
   * @param {string} category - Knowledge category
   * @param {string} key - Knowledge key
   * @param {string|number} version - Version to retrieve
   * @returns {object|null} Retrieved knowledge or null
   */
  async getKnowledge(category, key, version = 'latest') {
    try {
      // Check if category and key exist
      if (!this.knowledge[category] || !this.knowledge[category][key]) {
        return null;
      }
      
      // Return latest version
      if (version === 'latest') {
        return this.knowledge[category][key];
      }
      
      // Return specific version
      if (version >= 0 && version < this.versions[category][key].length) {
        return this.versions[category][key][version];
      }
      
      return null;
    } catch (error) {
      logger.error(`Error retrieving knowledge ${category}/${key}:`, error);
      return null;
    }
  }
  
  /**
   * Query knowledge by category
   * @param {string} category - Category to query
   * @returns {Array} List of knowledge items in the category
   */
  async queryByCategory(category) {
    try {
      if (!this.knowledge[category]) {
        return [];
      }
      
      return Object.keys(this.knowledge[category]).map(key => ({
        key,
        ...this.knowledge[category][key]
      }));
    } catch (error) {
      logger.error(`Error querying category ${category}:`, error);
      return [];
    }
  }
  
  /**
   * Get all categories in the knowledge base
   * @returns {Array} List of categories
   */
  getCategories() {
    return Array.from(this.categories);
  }
  
  /**
   * Get knowledge version history
   * @param {string} category - Knowledge category
   * @param {string} key - Knowledge key
   * @returns {Array} Version history
   */
  getVersionHistory(category, key) {
    try {
      if (!this.versions[category] || !this.versions[category][key]) {
        return [];
      }
      
      return this.versions[category][key];
    } catch (error) {
      logger.error(`Error getting version history ${category}/${key}:`, error);
      return [];
    }
  }
}

module.exports = new KnowledgeBase(); 
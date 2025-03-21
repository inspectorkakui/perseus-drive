/**
 * Knowledge Base
 * 
 * A custom MCP tool for shared knowledge storage and retrieval.
 * This tool handles the versioning, categorization, and retrieval
 * of knowledge artifacts in the Perseus Drive system.
 */

const EventEmitter = require('events');
const winston = require('winston');
const jsonDiff = require('json-diff');
const jsonpatch = require('fast-json-patch');

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
    this.versioningType = 'differential'; // Options: 'full', 'differential'
    this.differentialThreshold = 1024; // Threshold in bytes for differential versioning
    
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
        const previousData = this.knowledge[category][key].data;
        const previousMetadata = this.knowledge[category][key].metadata;
        const previousTimestamp = this.knowledge[category][key].timestamp;
        
        // Determine if we should use differential versioning
        const useFullCopy = this.shouldUseFullCopy(previousData, data);
        
        const versionEntry = {
          timestamp: previousTimestamp,
          metadata: previousMetadata,
          differentialVersioning: !useFullCopy
        };
        
        if (useFullCopy) {
          // Full copy for small objects or non-JSON data
          versionEntry.data = previousData;
          versionEntry.type = 'full';
        } else {
          // Differential versioning for large JSON objects
          versionEntry.diff = jsonDiff.diff(previousData, data);
          versionEntry.type = 'differential';
        }
        
        this.versions[category][key].push(versionEntry);
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
   * Determine if full copy should be used instead of differential versioning
   * @param {any} previousData - Previous data
   * @param {any} newData - New data
   * @returns {boolean} Whether to use full copy
   */
  shouldUseFullCopy(previousData, newData) {
    // Use full copy for non-objects
    if (typeof previousData !== 'object' || previousData === null ||
        typeof newData !== 'object' || newData === null) {
      return true;
    }
    
    // Use full copy if versioningType is set to 'full'
    if (this.versioningType === 'full') {
      return true;
    }
    
    try {
      // Estimate size by JSON stringification
      const dataSize = JSON.stringify(previousData).length;
      
      // For small objects, use full copy
      if (dataSize < this.differentialThreshold) {
        return true;
      }
      
      return false;
    } catch (error) {
      // If there's an error (e.g., circular references), use full copy
      logger.warn('Error determining versioning type, using full copy:', error);
      return true;
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
        const versionEntry = this.versions[category][key][version];
        
        // For full copies, just return the stored data
        if (versionEntry.type === 'full') {
          return {
            data: versionEntry.data,
            metadata: versionEntry.metadata,
            timestamp: versionEntry.timestamp
          };
        } 
        // For differential versions, reconstruct from latest and apply reverse patches
        else if (versionEntry.type === 'differential') {
          // Start with the latest data
          let reconstructedData = JSON.parse(JSON.stringify(this.knowledge[category][key].data));
          
          // Apply reverse patches from newer versions down to the requested version
          for (let i = this.versions[category][key].length - 1; i >= version; i--) {
            const ver = this.versions[category][key][i];
            if (ver.type === 'differential' && ver.diff) {
              // Reverse the diff to go backward in time
              reconstructedData = jsonDiff.revert(reconstructedData, ver.diff);
            } else {
              // If we encounter a full version, use it directly
              reconstructedData = ver.data;
              break;
            }
          }
          
          return {
            data: reconstructedData,
            metadata: versionEntry.metadata,
            timestamp: versionEntry.timestamp
          };
        }
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
      
      // Return a mapped version of history, resolving diffs if needed
      return this.versions[category][key].map((version, index) => {
        if (version.type === 'full') {
          return {
            version: index,
            data: version.data,
            metadata: version.metadata,
            timestamp: version.timestamp,
            type: 'full'
          };
        } else {
          // For differential versions, only return metadata and indication
          return {
            version: index,
            metadata: version.metadata,
            timestamp: version.timestamp,
            type: 'differential',
            // Don't include the actual diff to save space
            diffAvailable: !!version.diff
          };
        }
      });
    } catch (error) {
      logger.error(`Error getting version history ${category}/${key}:`, error);
      return [];
    }
  }
  
  /**
   * Set global versioning type
   * @param {string} type - Versioning type ('full' or 'differential')
   * @param {number} threshold - Size threshold for differential versioning
   */
  setVersioningOptions(type = 'differential', threshold = 1024) {
    if (type !== 'full' && type !== 'differential') {
      logger.warn(`Invalid versioning type: ${type}, using 'differential'`);
      this.versioningType = 'differential';
    } else {
      this.versioningType = type;
    }
    
    this.differentialThreshold = threshold;
    logger.info(`Versioning options updated: type=${this.versioningType}, threshold=${this.differentialThreshold}`);
  }
}

module.exports = new KnowledgeBase(); 
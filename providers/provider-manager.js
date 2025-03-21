/**
 * Provider Manager
 * 
 * Manages multiple data providers with failover capability.
 * Provides a unified interface for market data access.
 */

const EventEmitter = require('events');
const logger = require('../tools/logger');

class ProviderManager extends EventEmitter {
  constructor() {
    super();
    this.providers = new Map();
    this.defaultProvider = null;
    this.providerPriority = [];
    this.logger = logger.createLogger('provider-manager');
    this.logger.info('Provider Manager created');
  }
  
  /**
   * Register a data provider
   * @param {Object} provider - Provider instance
   * @param {Object} options - Registration options
   * @param {boolean} options.isDefault - Set as default provider
   * @param {number} options.priority - Provider priority (lower is higher priority)
   * @returns {boolean} Registration success
   */
  registerProvider(provider, options = {}) {
    try {
      if (!provider || !provider.id) {
        this.logger.error('Cannot register invalid provider');
        return false;
      }
      
      // Register the provider
      this.providers.set(provider.id, {
        instance: provider,
        priority: options.priority || 100,
        isActive: false,
        lastError: null
      });
      
      this.logger.info(`Registered provider: ${provider.id}`);
      
      // Update provider priority list
      this._updateProviderPriority();
      
      // Set as default if specified or if it's the first provider
      if (options.isDefault || this.providers.size === 1) {
        this.defaultProvider = provider.id;
        this.logger.info(`Set default provider: ${provider.id}`);
      }
      
      // Set up event listeners
      provider.on('connection-error', (error) => {
        this._handleProviderError(provider.id, error);
      });
      
      provider.on('rate-limit-warning', (limits) => {
        this._handleRateLimitWarning(provider.id, limits);
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Error registering provider ${provider?.id || 'unknown'}:`, error);
      return false;
    }
  }
  
  /**
   * Initialize all registered providers
   * @param {Object} config - Provider configuration object
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config = {}) {
    try {
      this.logger.info('Initializing all registered providers...');
      
      const initPromises = [];
      
      // Initialize each provider
      for (const [id, provider] of this.providers) {
        const providerConfig = config[id] || {};
        initPromises.push(
          provider.instance.initialize(providerConfig)
            .then((success) => {
              this.providers.get(id).isActive = success;
              this.logger.info(`Provider ${id} initialization ${success ? 'successful' : 'failed'}`);
              return { id, success };
            })
            .catch((error) => {
              this.logger.error(`Provider ${id} initialization error:`, error);
              this.providers.get(id).isActive = false;
              this.providers.get(id).lastError = error;
              return { id, success: false };
            })
        );
      }
      
      // Wait for all providers to initialize
      const results = await Promise.all(initPromises);
      
      // Check if at least one provider initialized
      const hasActiveProvider = results.some(result => result.success);
      
      // If default provider failed, find a new default
      if (this.defaultProvider && !this.providers.get(this.defaultProvider).isActive) {
        this._selectNewDefaultProvider();
      }
      
      this.logger.info(`Provider initialization complete. Active providers: ${hasActiveProvider ? 'YES' : 'NONE'}`);
      
      return hasActiveProvider;
    } catch (error) {
      this.logger.error('Error initializing providers:', error);
      return false;
    }
  }
  
  /**
   * Get market data from the best available provider
   * @param {string} symbol - Market symbol
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Market data
   */
  async getMarketData(symbol, options = {}) {
    return this._executeWithFailover('getMarketData', [symbol, options]);
  }
  
  /**
   * Get historical data from the best available provider
   * @param {string} symbol - Market symbol
   * @param {string} timeframe - Candle timeframe
   * @param {Object} options - Request options
   * @returns {Promise<Array>} Historical data
   */
  async getHistoricalData(symbol, timeframe, options = {}) {
    return this._executeWithFailover('getHistoricalData', [symbol, timeframe, options]);
  }
  
  /**
   * Subscribe to real-time data from the best available provider
   * @param {string} symbol - Market symbol
   * @param {string} channel - Data channel
   * @returns {Promise<Object>} Subscription details
   */
  async subscribe(symbol, channel) {
    return this._executeWithFailover('subscribe', [symbol, channel]);
  }
  
  /**
   * Execute a method with failover capability
   * @param {string} method - Method name to execute
   * @param {Array} args - Method arguments
   * @param {Object} options - Execution options
   * @returns {Promise<*>} Method result
   * @private
   */
  async _executeWithFailover(method, args, options = {}) {
    // Get list of providers in priority order
    const providersByPriority = [...this.providerPriority]
      .filter(id => this.providers.get(id).isActive);
    
    // Start with default provider if active
    if (this.defaultProvider && this.providers.get(this.defaultProvider).isActive) {
      // Move default provider to front if it's not already there
      if (providersByPriority[0] !== this.defaultProvider) {
        providersByPriority.splice(providersByPriority.indexOf(this.defaultProvider), 1);
        providersByPriority.unshift(this.defaultProvider);
      }
    }
    
    // If no active providers, throw error
    if (providersByPriority.length === 0) {
      throw new Error('No active providers available');
    }
    
    // Try providers in order until one succeeds
    let lastError = null;
    
    for (const providerId of providersByPriority) {
      const provider = this.providers.get(providerId).instance;
      
      try {
        // Execute the method with arguments
        const result = await provider[method](...args);
        
        // If successful, update default provider if needed
        if (providerId !== this.defaultProvider) {
          this.logger.info(`Provider ${providerId} succeeded for ${method}, considering as new default`);
          // If the default provider is failing, update it
          if (!this.providers.get(this.defaultProvider)?.isActive) {
            this.defaultProvider = providerId;
            this.logger.info(`Updated default provider to ${providerId}`);
          }
        }
        
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Provider ${providerId} failed for ${method}:`, error.message);
        // Mark provider as inactive if it's a connection issue
        if (error.message.includes('connect') || error.message.includes('timeout')) {
          this.providers.get(providerId).isActive = false;
          this.providers.get(providerId).lastError = error;
          this.emit('provider-failure', { providerId, error });
        }
      }
    }
    
    // If all providers failed, throw the last error
    throw new Error(`All providers failed for ${method}: ${lastError.message}`);
  }
  
  /**
   * Update the provider priority list
   * @private
   */
  _updateProviderPriority() {
    this.providerPriority = [...this.providers.entries()]
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([id]) => id);
    
    this.logger.debug(`Updated provider priority: ${this.providerPriority.join(', ')}`);
  }
  
  /**
   * Handle provider error
   * @param {string} providerId - Provider ID
   * @param {Error} error - Error object
   * @private
   */
  _handleProviderError(providerId, error) {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.lastError = error;
      
      // If this was the default provider, select a new one
      if (providerId === this.defaultProvider) {
        this._selectNewDefaultProvider();
      }
    }
  }
  
  /**
   * Handle rate limit warning
   * @param {string} providerId - Provider ID
   * @param {Object} limits - Rate limit information
   * @private
   */
  _handleRateLimitWarning(providerId, limits) {
    this.logger.warn(`Rate limit warning for ${providerId}:`, limits);
    
    // If this is the default provider, consider switching to another provider
    if (providerId === this.defaultProvider) {
      // Find another active provider
      const alternativeProvider = this.providerPriority.find(id => 
        id !== providerId && this.providers.get(id).isActive
      );
      
      if (alternativeProvider) {
        this.logger.info(`Switching from ${providerId} to ${alternativeProvider} due to rate limits`);
        this.defaultProvider = alternativeProvider;
      }
    }
  }
  
  /**
   * Select a new default provider
   * @private
   */
  _selectNewDefaultProvider() {
    // Find the first active provider from the priority list
    const newDefault = this.providerPriority.find(id => this.providers.get(id).isActive);
    
    if (newDefault) {
      this.defaultProvider = newDefault;
      this.logger.info(`Set new default provider: ${newDefault}`);
    } else {
      this.defaultProvider = null;
      this.logger.warn('No active providers available for default');
    }
  }
}

module.exports = new ProviderManager(); 
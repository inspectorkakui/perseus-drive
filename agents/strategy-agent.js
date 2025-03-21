/**
 * Strategy Agent
 * 
 * Responsible for analyzing market data and generating trading signals.
 * This agent implements various trading strategies and makes trading
 * decisions based on market conditions and risk parameters.
 */

const BaseAgent = require('../core/base-agent');
const promptEngineeringAgent = require('./prompt-engineering-agent');
const Joi = require('joi'); // For input validation

class StrategyAgent extends BaseAgent {
  /**
   * Create a new Strategy Agent
   */
  constructor() {
    super('strategy', 'strategy');
    
    // Initialize strategies storage
    this.strategies = new Map();
    this.activeStrategies = new Map(); // For backward compatibility
    
    // Initialize performance tracking
    this.performanceData = {
      totalSignals: 0,
      successfulSignals: 0,
      failedSignals: 0,
      profitFactor: 0,
      averageReturn: 0,
      maxDrawdown: 0,
      winRate: 0,
      trades: []
    };
    
    // Initialize strategies performance map
    this.strategyPerformance = {};
    
    this.logger.info('Strategy Agent created');
  }
  
  /**
   * Initialize the Strategy Agent
   */
  async initialize() {
    await super.initialize();
    
    // Log initialization
    this.logger.info('Strategy Agent initializing...');
    
    try {
      // Get strategy prompt from Prompt Engineering Agent
      const prompt = await this.requestPrompt('strategy');
      
      // Store the prompt in knowledge base
      await this.storeKnowledge('prompts.current', prompt);
      
      // Register default strategies
      this.registerStrategy('trend-following', 'Trend Following', function(data) {
        const prices = data.prices;
        const lastPrice = prices[prices.length - 1];
        const prevPrice = prices[prices.length - 2] || lastPrice;
        
        // Simple trend detection
        if (lastPrice > prevPrice * 1.02) {
          return {
            action: 'BUY',
            confidence: 0.6,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: prevPrice,
              takeProfit: lastPrice * 1.05,
              positionSize: 0.1 // 10% of available capital
            }
          };
        } else if (lastPrice < prevPrice * 0.98) {
          return {
            action: 'SELL',
            confidence: 0.6,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: prevPrice,
              takeProfit: lastPrice * 0.95,
              positionSize: 0.1 // 10% of available capital
            }
          };
        }
        return null;
      });
      
      this.registerStrategy('mean-reversion', 'Mean Reversion', function(data) {
        const prices = data.prices;
        const lastPrice = prices[prices.length - 1];
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        
        if (lastPrice > mean * 1.05) {
          return {
            action: 'SELL',
            confidence: 0.7,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 1.03,
              takeProfit: mean,
              positionSize: 0.1 // 10% of available capital
            }
          };
        } else if (lastPrice < mean * 0.95) {
          return {
            action: 'BUY',
            confidence: 0.7,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 0.97,
              takeProfit: mean,
              positionSize: 0.1 // 10% of available capital
            }
          };
        }
        return null;
      });
      
      this.registerStrategy('breakout', 'Breakout', function(data) {
        // Simple breakout strategy
        const prices = data.prices;
        if (!prices || prices.length < 20) return null;
        
        const lastPrice = prices[prices.length - 1];
        
        // Find recent high and low for channel
        const lookbackPeriod = Math.min(20, prices.length);
        let recentHigh = -Infinity;
        let recentLow = Infinity;
        
        for (let i = prices.length - lookbackPeriod; i < prices.length - 1; i++) {
          if (prices[i] > recentHigh) recentHigh = prices[i];
          if (prices[i] < recentLow) recentLow = prices[i];
        }
        
        // Check for breakout
        if (lastPrice > recentHigh * 1.02) {
          return {
            action: 'BUY',
            confidence: 0.65,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: recentHigh * 0.98,
              takeProfit: lastPrice + (recentHigh - recentLow), // Project the channel height
              positionSize: 0.1 // 10% of available capital
            }
          };
        } else if (lastPrice < recentLow * 0.98) {
          return {
            action: 'SELL',
            confidence: 0.65,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: recentLow * 1.02,
              takeProfit: lastPrice - (recentHigh - recentLow), // Project the channel height
              positionSize: 0.1 // 10% of available capital
            }
          };
        }
        
        return null;
      });
      
      this.registerStrategy('momentum', 'Momentum', function(data) {
        // Simple momentum strategy
        const prices = data.prices;
        const volumes = data.volumes;
        
        if (!prices || prices.length < 10) return null;
        
        const lastPrice = prices[prices.length - 1];
        const lookbackPeriod = Math.min(10, prices.length - 1);
        
        // Calculate Rate of Change (ROC) - basic momentum indicator
        const priceNPeriodsAgo = prices[prices.length - 1 - lookbackPeriod];
        const roc = ((lastPrice - priceNPeriodsAgo) / priceNPeriodsAgo) * 100;
        
        // Calculate volume momentum (if volumes data is available)
        let volumeMomentum = 0;
        if (volumes && volumes.length >= lookbackPeriod) {
          const recentVolumes = volumes.slice(-lookbackPeriod);
          const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
          const lastVolume = volumes[volumes.length - 1];
          volumeMomentum = lastVolume / avgVolume;
        }
        
        // Combined momentum signal (price momentum + volume confirmation)
        if (roc > 5 && volumeMomentum > 1.2) {
          // Strong bullish momentum with volume confirmation
          return {
            action: 'BUY',
            confidence: 0.75,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 0.95, // 5% stop loss
              takeProfit: lastPrice * 1.10, // 10% profit target
              positionSize: 0.1 // 10% of available capital
            }
          };
        } else if (roc < -5 && volumeMomentum > 1.2) {
          // Strong bearish momentum with volume confirmation
          return {
            action: 'SELL',
            confidence: 0.75,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 1.05, // 5% stop loss
              takeProfit: lastPrice * 0.90, // 10% profit target
              positionSize: 0.1 // 10% of available capital
            }
          };
        }
        
        return null;
      });
      
      this.registerStrategy('volume-profile', 'Volume Profile', function(data) {
        // Volume profile strategy implementation
        const prices = data.prices;
        const volumes = data.volumes;
        
        if (!prices || !volumes || prices.length < 20 || volumes.length < 20) return null;
        
        const lastPrice = prices[prices.length - 1];
        const lookbackPeriod = Math.min(20, prices.length);
        
        // Create a simple volume profile
        const volumeProfile = new Map();
        const pricePrecision = 2; // Round prices to 2 decimal places for grouping
        
        // Build the volume profile
        for (let i = prices.length - lookbackPeriod; i < prices.length; i++) {
          const roundedPrice = Math.round(prices[i] * Math.pow(10, pricePrecision)) / Math.pow(10, pricePrecision);
          const volume = volumes[i] || 0;
          
          if (volumeProfile.has(roundedPrice)) {
            volumeProfile.set(roundedPrice, volumeProfile.get(roundedPrice) + volume);
          } else {
            volumeProfile.set(roundedPrice, volume);
          }
        }
        
        // Find the high volume node (price with highest volume)
        let highVolumeNode = lastPrice;
        let maxVolume = 0;
        
        for (const [price, volume] of volumeProfile.entries()) {
          if (volume > maxVolume) {
            maxVolume = volume;
            highVolumeNode = price;
          }
        }
        
        // Check if current price is significantly above or below high volume node
        const percentDiff = ((lastPrice - highVolumeNode) / highVolumeNode) * 100;
        
        if (percentDiff > 4) {
          // Price is significantly above high volume node - potential short opportunity
          return {
            action: 'SELL',
            confidence: 0.7,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 1.03, // 3% stop loss
              takeProfit: highVolumeNode, // Target the high volume node
              positionSize: 0.1 // 10% of available capital
            }
          };
        } else if (percentDiff < -4) {
          // Price is significantly below high volume node - potential long opportunity
          return {
            action: 'BUY',
            confidence: 0.7,
            symbol: data.symbol || 'unknown',
            params: {
              entryPrice: lastPrice,
              stopLoss: lastPrice * 0.97, // 3% stop loss
              takeProfit: highVolumeNode, // Target the high volume node
              positionSize: 0.1 // 10% of available capital
            }
          };
        }
        
        return null;
      });
      
      // Initialize performance tracking from knowledge base or create new
      let performanceData;
      try {
        performanceData = await this.getKnowledge('performance.strategies');
      } catch (error) {
        performanceData = {
          totalSignals: 0,
          successfulSignals: 0,
          failedSignals: 0,
          profitFactor: 0,
          averageReturn: 0,
          maxDrawdown: 0,
          winRate: 0,
          trades: []
        };
        await this.storeKnowledge('performance.strategies', performanceData);
      }
      
      this.performanceData = performanceData;
      this.logger.info('Initialized new strategy performance tracking');
      
      this.logger.info('Strategy Agent initialized with prompt and strategies');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Strategy Agent:', error);
      return false;
    }
  }
  
  /**
   * Register a new trading strategy
   * @param {string} id - Unique identifier for the strategy
   * @param {string} name - Human-readable name for the strategy
   * @param {Function|string} fn - Strategy function or string representation
   * @returns {boolean} - Success status
   */
  registerStrategy(id, name, fn) {
    try {
      // Validate inputs
      if (!id || typeof id !== 'string') {
        throw new Error('Strategy id must be a non-empty string');
      }
      
      if (!name || typeof name !== 'string') {
        throw new Error('Strategy name must be a non-empty string');
      }
      
      // Handle both function objects and string representations
      let strategyFn = fn;
      if (typeof fn === 'string') {
        // Convert string to function
        try {
          // This is not ideal but needed for the test suite
          strategyFn = eval(`(${fn})`);
        } catch (evalError) {
          throw new Error(`Invalid strategy function: ${evalError.message}`);
        }
      } else if (typeof fn !== 'function') {
        throw new Error('Strategy function must be a function');
      }
      
      // Create strategy object
      const strategy = {
        id,
        name,
        function: strategyFn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store in active strategies map
      this.strategies.set(id, strategy);
      
      this.logger.info(`Registered strategy: ${name} (${id})`);
      
      // Store in knowledge base
      this.storeKnowledge(`strategies.${id}`, {
        id,
        name,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
        // Don't store function as it can't be serialized properly
        functionString: fn.toString()
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Error registering strategy ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Process market data to generate trade signals
   * @param {Object} marketData - Market data to process
   * @returns {Array} Array of trade signals
   */
  async process(marketData) {
    this.logger.info('Processing market data for trading signals');
    
    const timestamp = marketData.timestamp || Date.now();
    const signals = [];
    
    // Check if we have registered strategies
    if (!this.strategies || Object.keys(this.strategies).length === 0) {
      this.logger.warn('No strategies registered, using built-in strategies');
      this._registerDefaultStrategies();
    }
    
    // Process with each strategy
    for (const [strategyId, strategy] of Object.entries(this.strategies)) {
      try {
        // Process market data with strategy
        const result = await this._processWithStrategy(strategy, marketData);
        
        if (result && result.signal) {
          // Add strategyId to the signal
          result.signal.strategyId = strategyId;
          
          this.logger.info(`Generated signal from strategy ${strategyId}: ${result.signal.action}`);
          signals.push(result.signal);
          
          // Store individual signal in knowledge base with strategy ID
          await this.storeKnowledge(
            'signals',
            `${strategyId}-${timestamp}`,
            result.signal
          );
        }
      } catch (error) {
        this.logger.error(`Error processing with strategy ${strategyId}:`, error);
      }
    }
    
    // Store all signals in knowledge base
    if (signals.length > 0) {
      await this.storeKnowledge('signals', `signals-${timestamp}`, signals);
    }
    
    return signals;
  }
  
  /**
   * Process market data with a specific strategy
   * @private
   * @param {Object} strategy - Strategy to use
   * @param {Object} marketData - Market data to process
   * @returns {Object} Strategy result with signal
   */
  async _processWithStrategy(strategy, marketData) {
    try {
      if (!strategy.type) {
        throw new Error('Strategy missing type');
      }
      
      // Technical Analysis based strategies
      if (strategy.type === 'technical') {
        return this._processTechnicalStrategy(strategy, marketData);
      }
      
      // Prompt-based strategies
      if (strategy.type === 'prompt-based') {
        return this._processPromptBasedStrategy(strategy, marketData);
      }
      
      // Machine learning strategies
      if (strategy.type === 'ml') {
        return this._processMLStrategy(strategy, marketData);
      }
      
      throw new Error(`Unknown strategy type: ${strategy.type}`);
    } catch (error) {
      this.logger.error(`Error in _processWithStrategy:`, error);
      return null;
    }
  }
  
  /**
   * Process market data with a technical analysis strategy
   * @private
   * @param {Object} strategy - Strategy configuration
   * @param {Object} marketData - Market data to process
   * @returns {Object} Strategy result with signal
   */
  _processTechnicalStrategy(strategy, marketData) {
    if (!marketData.prices || !marketData.prices.length) {
      throw new Error('Market data missing prices');
    }
    
    let signal = null;
    const strategyId = strategy.id || 'unknown';
    
    // Different strategies based on strategy ID
    switch (strategyId) {
      case 'trend-following':
        signal = this._trendFollowingStrategy(marketData);
        break;
      case 'mean-reversion':
        signal = this._meanReversionStrategy(marketData);
        break;
      case 'breakout':
        signal = this._breakoutStrategy(marketData);
        break;
      case 'momentum':
        signal = this._momentumStrategy(marketData);
        break;
      case 'volume-profile':
        signal = this._volumeProfileStrategy(marketData);
        break;
      default:
        // Default strategy
        signal = this._trendFollowingStrategy(marketData);
    }
    
    if (signal) {
      // Make sure to include the strategyId in the signal
      signal.strategyId = strategyId;
    }
    
    return { signal };
  }
  
  /**
   * Trend following strategy
   * @private
   * @param {Object} marketData - Market data
   * @returns {Object} Signal
   */
  _trendFollowingStrategy(marketData) {
    const prices = marketData.prices;
    const lastPrice = prices[prices.length - 1];
    const symbol = marketData.symbol;
    
    // Simple moving average calculation
    const shortPeriod = 5;
    const longPeriod = 10;
    
    // Calculate short-term SMA
    let shortSMA = 0;
    for (let i = prices.length - shortPeriod; i < prices.length; i++) {
      shortSMA += prices[i];
    }
    shortSMA /= shortPeriod;
    
    // Calculate long-term SMA
    let longSMA = 0;
    for (let i = prices.length - longPeriod; i < prices.length; i++) {
      if (i >= 0) {
        longSMA += prices[i];
      }
    }
    longSMA /= longPeriod;
    
    // Generate signal based on moving average crossover
    if (shortSMA > longSMA) {
      return {
        action: 'BUY',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1, // 10% of available capital
          stopLoss: lastPrice * 0.95, // 5% stop loss
          takeProfit: lastPrice * 1.1 // 10% take profit
        }
      };
    } else if (shortSMA < longSMA) {
      return {
        action: 'SELL',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1, // 10% of available capital
          stopLoss: lastPrice * 1.05, // 5% stop loss
          takeProfit: lastPrice * 0.9 // 10% take profit
        }
      };
    }
    
    return null;
  }
  
  /**
   * Mean reversion strategy
   * @private
   * @param {Object} marketData - Market data
   * @returns {Object} Signal
   */
  _meanReversionStrategy(marketData) {
    const prices = marketData.prices;
    const lastPrice = prices[prices.length - 1];
    const symbol = marketData.symbol;
    
    // Calculate mean and standard deviation
    let sum = 0;
    for (const price of prices) {
      sum += price;
    }
    const mean = sum / prices.length;
    
    let sumSquaredDiff = 0;
    for (const price of prices) {
      sumSquaredDiff += Math.pow(price - mean, 2);
    }
    const stdDev = Math.sqrt(sumSquaredDiff / prices.length);
    
    // Calculate z-score (how many standard deviations from mean)
    const zScore = (lastPrice - mean) / stdDev;
    
    // Generate signal based on z-score
    if (zScore < -1.5) {
      // Price is significantly below mean, expect reversion upward
      return {
        action: 'BUY',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 0.95,
          takeProfit: lastPrice * 1.1
        }
      };
    } else if (zScore > 1.5) {
      // Price is significantly above mean, expect reversion downward
      return {
        action: 'SELL',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 1.05,
          takeProfit: lastPrice * 0.9
        }
      };
    }
    
    return null;
  }
  
  /**
   * Breakout strategy
   * @private
   * @param {Object} marketData - Market data
   * @returns {Object} Signal
   */
  _breakoutStrategy(marketData) {
    const prices = marketData.prices;
    const lastPrice = prices[prices.length - 1];
    const symbol = marketData.symbol;
    
    // Find highest high and lowest low
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    // Look back over the last N periods
    const lookbackPeriod = Math.min(20, prices.length - 1);
    
    for (let i = prices.length - lookbackPeriod - 1; i < prices.length - 1; i++) {
      if (i >= 0) {
        if (prices[i] > highestHigh) {
          highestHigh = prices[i];
        }
        if (prices[i] < lowestLow) {
          lowestLow = prices[i];
        }
      }
    }
    
    // Generate signal based on breakout beyond previous high/low
    if (lastPrice > highestHigh * 1.02) {
      // Breakout above resistance
      return {
        action: 'BUY',
        symbol,
        confidence: 0.8,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lowestLow,
          takeProfit: lastPrice * 1.1
        }
      };
    } else if (lastPrice < lowestLow * 0.98) {
      // Breakout below support
      return {
        action: 'SELL',
        symbol,
        confidence: 0.8,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: highestHigh,
          takeProfit: lastPrice * 0.9
        }
      };
    }
    
    return null;
  }
  
  /**
   * Momentum strategy
   * @private
   * @param {Object} marketData - Market data
   * @returns {Object} Signal
   */
  _momentumStrategy(marketData) {
    const prices = marketData.prices;
    const lastPrice = prices[prices.length - 1];
    const symbol = marketData.symbol;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Generate signal based on momentum
    if (avgReturn > 0.01) { // Strong positive momentum
      return {
        action: 'BUY',
        symbol,
        confidence: 0.75,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 0.95,
          takeProfit: lastPrice * 1.1
        }
      };
    } else if (avgReturn < -0.01) { // Strong negative momentum
      return {
        action: 'SELL',
        symbol,
        confidence: 0.75,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 1.05,
          takeProfit: lastPrice * 0.9
        }
      };
    }
    
    return null;
  }
  
  /**
   * Volume profile strategy
   * @private
   * @param {Object} marketData - Market data
   * @returns {Object} Signal
   */
  _volumeProfileStrategy(marketData) {
    const prices = marketData.prices;
    const volumes = marketData.volumes;
    const lastPrice = prices[prices.length - 1];
    const symbol = marketData.symbol;
    
    // Check if we have volume data
    if (!volumes || volumes.length !== prices.length) {
      return null;
    }
    
    // Find price levels with highest volume
    const volByPrice = {};
    for (let i = 0; i < prices.length; i++) {
      const priceLevel = Math.round(prices[i] / 100) * 100; // Round to nearest 100
      volByPrice[priceLevel] = (volByPrice[priceLevel] || 0) + volumes[i];
    }
    
    // Find the price level with highest volume
    let highestVolPriceLevel = 0;
    let highestVol = 0;
    
    for (const [priceLevel, volume] of Object.entries(volByPrice)) {
      if (volume > highestVol) {
        highestVol = volume;
        highestVolPriceLevel = Number(priceLevel);
      }
    }
    
    // Generate signal based on price distance from high volume node
    const distanceFromNode = (lastPrice - highestVolPriceLevel) / highestVolPriceLevel;
    
    if (distanceFromNode > 0.05) {
      // Price is above high volume node, might pull back
      return {
        action: 'SELL',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 1.05,
          takeProfit: highestVolPriceLevel
        }
      };
    } else if (distanceFromNode < -0.05) {
      // Price is below high volume node, might bounce up
      return {
        action: 'BUY',
        symbol,
        confidence: 0.7,
        params: {
          entryPrice: lastPrice,
          positionSize: 0.1,
          stopLoss: lastPrice * 0.95,
          takeProfit: highestVolPriceLevel
        }
      };
    }
    
    return null;
  }
  
  /**
   * Register default strategies
   * @private
   */
  _registerDefaultStrategies() {
    this.strategies = {
      'trend-following': {
        id: 'trend-following',
        name: 'Trend Following',
        type: 'technical',
        description: 'Follows market trends using moving averages'
      },
      'mean-reversion': {
        id: 'mean-reversion',
        name: 'Mean Reversion',
        type: 'technical',
        description: 'Trades mean reversion based on statistical deviations'
      },
      'breakout': {
        id: 'breakout',
        name: 'Breakout',
        type: 'technical',
        description: 'Identifies breakouts from support/resistance levels'
      },
      'momentum': {
        id: 'momentum',
        name: 'Momentum',
        type: 'technical',
        description: 'Trades based on price momentum and acceleration'
      },
      'volume-profile': {
        id: 'volume-profile',
        name: 'Volume Profile',
        type: 'technical',
        description: 'Uses volume profile to identify significant price levels'
      }
    };
    
    // Log registered strategies
    for (const [id, strategy] of Object.entries(this.strategies)) {
      this.logger.info(`Registered strategy: ${strategy.name} (${id})`);
    }
  }
  
  /**
   * Process with prompt-based strategy
   * @private
   * @param {Object} strategy - Strategy configuration
   * @param {Object} marketData - Market data
   * @returns {Object} Strategy result with signal
   */
  async _processPromptBasedStrategy(strategy, marketData) {
    // Placeholder for prompt-based strategy implementation
    return { signal: null };
  }
  
  /**
   * Process with machine learning strategy
   * @private
   * @param {Object} strategy - Strategy configuration
   * @param {Object} marketData - Market data
   * @returns {Object} Strategy result with signal
   */
  async _processMLStrategy(strategy, marketData) {
    // Placeholder for machine learning strategy implementation
    return { signal: null };
  }
  
  /**
   * Stores knowledge in the knowledge base
   * @param {string} category - The category of knowledge
   * @param {string} key - The key for the knowledge
   * @param {any} data - The data to store
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async storeKnowledge(category, key, data, metadata = {}) {
    try {
      if (this.knowledgeBase) {
        await this.knowledgeBase.storeKnowledge(category, key, data, metadata);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Error storing knowledge:', error);
      return false;
    }
  }
  
  /**
   * Update the current market state with new data
   * @param {object} data - New market data
   */
  updateMarketState(data) {
    // Update the market state with the latest data
    this.marketState = {
      ...this.marketState,
      lastUpdate: new Date(),
      symbol: data.original.symbol,
      price: data.original.prices[data.original.prices.length - 1],
      trend: data.processed.trend,
      volatility: data.processed.volatility,
      mean: data.processed.mean
    };
  }
  
  /**
   * Update strategy performance metrics
   * @param {string} strategyId - Strategy ID
   * @param {string} metric - Metric to update
   * @param {number} value - Value to update by
   */
  updateStrategyMetrics(strategyId, metric, value) {
    if (!this.strategyPerformance[strategyId]) {
      this.strategyPerformance[strategyId] = {
        totalSignals: 0,
        successfulSignals: 0,
        failedSignals: 0,
        profitFactor: 0,
        averageReturn: 0,
        maxDrawdown: 0,
        winRate: 0,
        trades: []
      };
    }
    
    // Update the specific metric
    if (typeof this.strategyPerformance[strategyId][metric] === 'number') {
      this.strategyPerformance[strategyId][metric] += value;
    }
    
    // Recalculate derived metrics
    if (this.strategyPerformance[strategyId].totalSignals > 0) {
      this.strategyPerformance[strategyId].winRate = 
        this.strategyPerformance[strategyId].successfulSignals / 
        this.strategyPerformance[strategyId].totalSignals;
    }
    
    // Persist updated metrics
    this.storeKnowledge('performance', 'strategies', this.strategyPerformance)
      .catch(error => this.logger.error('Error storing performance metrics:', error));
  }
  
  /**
   * Record a trade outcome for performance tracking
   * @param {string} strategyId - Strategy identifier
   * @param {Object} trade - Trade information
   * @param {boolean} success - Whether the trade was successful
   * @param {number} returnPct - Percentage return (positive or negative)
   * @returns {boolean} Success status
   */
  recordTradeOutcome(strategyId, trade, success, returnPct) {
    try {
      this.logger.info(`Recorded trade outcome for ${strategyId}: ${success ? 'Success' : 'Failure'}, Return: ${returnPct}%`);
      
      // Initialize performanceData if it doesn't exist
      if (!this.performanceData) {
        this.performanceData = {
          totalSignals: 0,
          successfulSignals: 0,
          failedSignals: 0,
          profitFactor: 0,
          averageReturn: 0,
          maxDrawdown: 0,
          winRate: 0,
          trades: []
        };
      }
      
      // Ensure trades array exists
      if (!this.performanceData.trades) {
        this.performanceData.trades = [];
      }
      
      // Create a complete trade object
      const tradeRecord = {
        strategyId,
        action: trade.action,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        timestamp: trade.timestamp || new Date().toISOString(),
        symbol: trade.symbol,
        success: success,
        returnPct: returnPct
      };
      
      // Update the performance metrics
      if (success) {
        this.performanceData.successfulSignals = (this.performanceData.successfulSignals || 0) + 1;
      } else {
        this.performanceData.failedSignals = (this.performanceData.failedSignals || 0) + 1;
      }
      
      // Add the trade to the history
      this.performanceData.trades.push(tradeRecord);
      
      // Update aggregate metrics
      this.performanceData.totalSignals = this.performanceData.trades.length;
      
      const successfulTrades = this.performanceData.trades.filter(t => t.success);
      const failedTrades = this.performanceData.trades.filter(t => !t.success);
      
      // Calculate profit factor (sum of profits / sum of losses)
      const totalProfits = successfulTrades.reduce((sum, t) => sum + t.returnPct, 0);
      const totalLosses = Math.abs(failedTrades.reduce((sum, t) => sum + t.returnPct, 0)) || 1; // Avoid division by zero
      
      this.performanceData.profitFactor = totalProfits / totalLosses;
      
      // Calculate win rate
      this.performanceData.winRate = successfulTrades.length / Math.max(1, this.performanceData.trades.length);
      
      // Calculate average return
      this.performanceData.averageReturn = this.performanceData.trades.reduce((sum, t) => sum + t.returnPct, 0) / 
                                          Math.max(1, this.performanceData.trades.length);
      
      // Calculate maximum drawdown (simplified)
      this.performanceData.maxDrawdown = Math.abs(
        Math.min(0, ...this.performanceData.trades.map(t => t.returnPct))
      );
      
      // Store updated performance metrics in the knowledge base
      try {
        this.storeKnowledge('performance.strategies', this.performanceData);
      } catch (err) {
        this.logger.warn(`Unable to store performance data: ${err.message}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error recording trade outcome for ${strategyId}:`, error);
      return false;
    }
  }
  
  /**
   * Get performance report for a strategy or all strategies
   * @param {string} strategyId - Strategy ID (optional, for specific strategy)
   * @returns {Object} Performance report
   */
  getPerformanceReport(strategyId = null) {
    try {
      // Initialize performanceData if it doesn't exist
      if (!this.performanceData || !this.performanceData.trades) {
        this.performanceData = {
          totalSignals: 0,
          successfulSignals: 0,
          failedSignals: 0,
          profitFactor: 0,
          averageReturn: 0,
          maxDrawdown: 0,
          winRate: 0,
          trades: []
        };
      }
      
      if (strategyId) {
        // Return performance for specific strategy
        const strategyTrades = this.performanceData.trades.filter(t => t.strategyId === strategyId);
        
        if (strategyTrades.length === 0) {
          return {
            totalSignals: 0,
            successfulSignals: 0,
            failedSignals: 0,
            profitFactor: 0,
            averageReturn: 0,
            maxDrawdown: 0,
            winRate: 0,
            trades: []
          };
        }
        
        const successfulTrades = strategyTrades.filter(t => t.success);
        const failedTrades = strategyTrades.filter(t => !t.success);
        
        // Calculate metrics for this strategy only
        const totalProfits = successfulTrades.reduce((sum, t) => sum + t.returnPct, 0);
        const totalLosses = Math.abs(failedTrades.reduce((sum, t) => sum + t.returnPct, 0)) || 1;
        
        return {
          totalSignals: strategyTrades.length,
          successfulSignals: successfulTrades.length,
          failedSignals: failedTrades.length,
          profitFactor: totalProfits / totalLosses,
          averageReturn: strategyTrades.reduce((sum, t) => sum + t.returnPct, 0) / strategyTrades.length,
          maxDrawdown: Math.abs(Math.min(0, ...strategyTrades.map(t => t.returnPct))),
          winRate: successfulTrades.length / strategyTrades.length,
          trades: strategyTrades
        };
      }
      
      // Return performance for all strategies
      return this.performanceData;
    } catch (error) {
      this.logger.error('Error generating performance report:', error);
      return {
        totalSignals: 0,
        successfulSignals: 0,
        failedSignals: 0,
        profitFactor: 0,
        averageReturn: 0,
        maxDrawdown: 0,
        winRate: 0,
        trades: []
      };
    }
  }
  
  /**
   * Handle incoming messages from other agents
   * @param {Object} message - The message object
   */
  async handleMessage(message) {
    // Call parent handler
    await super.handleMessage(message);
    
    try {
      // Obtain sender ID and message type safely
      const senderId = message.from || message.senderId;
      const type = message.type;
      
      this.logger.info(`Handling message: ${message.id || message.messageId || 'unknown'} from ${senderId || 'unknown'}`);
      this.logger.info(`Message type: ${type}, full message: ${JSON.stringify(message)}`);
      
      if (type === 'data_response') {
        this.logger.info('Received market data, generating signals...');
        const marketData = message.data || message.content;
        const signals = await this.process(marketData);
        
        // Store the signals in the knowledge base
        const signalId = `signals-${Date.now()}`;
        await this.storeKnowledge(`signals.${signalId}`, signals);
        
        // Send signals back to the requesting agent
        await this.sendMessage(senderId, {
          signals: signals,
          marketData: {
            symbol: marketData.symbol,
            timestamp: marketData.timestamp
          }
        }, 'signal_response');
      } else if (type === 'market_data') {
        // Handle direct market data messages from test or other agents
        this.logger.info('Received direct market data, generating signals...');
        const marketData = message.data || message.content;
        
        if (!marketData || !marketData.symbol || !marketData.prices) {
          throw new Error('Invalid market data format');
        }
        
        const signals = await this.process(marketData);
        
        // Store the signals in the knowledge base
        const signalId = `signals-${Date.now()}`;
        await this.storeKnowledge(`signals.${signalId}`, signals);
        
        // Send signals back to the requesting agent
        await this.sendMessage(senderId, {
          signals: signals,
          marketData: {
            symbol: marketData.symbol,
            timestamp: marketData.timestamp
          }
        }, 'signal_response');
      } else if (type === 'strategy_update') {
        this.logger.info('Received strategy update for:', message.content?.strategyId);
        
        if (!message.content?.strategyId || !message.content?.strategy) {
          await this.sendMessage(senderId, { 
            success: false, 
            error: 'Invalid strategy update: missing strategyId or strategy'
          }, 'strategy_update_response');
          return;
        }
        
        const result = this.updateStrategy(
          message.content.strategyId,
          message.content.strategy.name,
          message.content.strategy.fn
        );
        
        if (result) {
          await this.sendMessage(senderId, { 
            success: true, 
            strategyId: message.content.strategyId 
          }, 'strategy_update_response');
        } else {
          await this.sendMessage(senderId, { 
            success: false, 
            error: 'Failed to update strategy'
          }, 'strategy_update_response');
        }
      } else if (type === 'trade_outcome') {
        this.logger.info('Received trade outcome for:', message.content?.strategyId);
        
        if (!message.content?.strategyId || !message.content?.trade) {
          await this.sendMessage(senderId, { 
            success: false, 
            error: 'Invalid trade outcome: missing strategyId or trade'
          }, 'trade_outcome_response');
          return;
        }
        
        const result = this.recordTradeOutcome(
          message.content.strategyId,
          message.content.trade,
          message.content.success,
          message.content.returnPct
        );
        
        await this.sendMessage(senderId, { 
          success: result, 
          strategyId: message.content.strategyId
        }, 'trade_outcome_response');
      } else if (type === 'performance_request') {
        // Handle performance report requests
        this.logger.info('Received performance report request');
        this.logger.info(`Performance request content: ${JSON.stringify(message.content)}`);
        this.logger.info(`Message sender ID: ${senderId}`);
        
        const strategyId = message.content?.strategyId || message.strategyId || null;
        this.logger.info(`Strategy ID for performance report: ${strategyId}`);
        
        const report = this.getPerformanceReport(strategyId);
        this.logger.info(`Generated performance report: ${JSON.stringify(report)}`);
        
        if (!senderId) {
          this.logger.error('Cannot send response: No sender ID provided in the message');
          return;
        }
        
        // Debug the message we're about to send
        const responseContent = {
          report: report,
          timestamp: new Date().toISOString()
        };
        this.logger.info(`Sending response content to ${senderId}: ${JSON.stringify(responseContent)}`);
        
        await this.sendMessage(senderId, responseContent, 'performance_response');
        this.logger.info(`Performance response sent to ${senderId}`);
      } else {
        this.logger.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      if (message.from) {
        await this.sendMessage(message.from, {
          type: 'error_response',
          error: error.message,
          originalMessage: message
        });
      }
    }
  }
  
  /**
   * Request a prompt from the Prompt Engineering Agent (simplified)
   * @param {string} promptType - Type of prompt to request
   * @returns {Object} The requested prompt
   */
  async requestPrompt(promptType) {
    try {
      this.logger.info(`Requesting ${promptType} prompt (simplified method)`);
      
      // Return a default prompt for testing purposes
      return { 
        content: `Trading strategy prompt for ${promptType} strategies. 
        This is a simplified mock prompt for testing.
        
        When analyzing market data:
        1. Look for clear trend patterns
        2. Evaluate momentum indicators
        3. Consider volatility levels
        4. Generate clear buy/sell signals with risk parameters`,
        type: promptType,
        version: '1.0'
      };
    } catch (error) {
      this.logger.error(`Error requesting prompt: ${error.message}`);
      // Return a default prompt in case of failure
      return { 
        content: `Default ${promptType} prompt content`,
        type: promptType,
        version: '1.0'
      };
    }
  }
}

module.exports = new StrategyAgent();
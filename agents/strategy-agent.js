/**
 * Strategy Agent
 * 
 * Responsible for analyzing market data and generating trading signals.
 * This agent implements various trading strategies and makes trading
 * decisions based on market conditions and risk parameters.
 */

const BaseAgent = require('../core/base-agent');
const promptEngineeringAgent = require('./prompt-engineering-agent');

class StrategyAgent extends BaseAgent {
  constructor() {
    super('strategy', 'strategy');
    this.activeStrategies = new Map();
    this.marketState = {};
    this.currentPositions = {};
    this.strategyPerformance = {};
    
    // Debug: Log that agent is created
    console.log('Strategy Agent created');
  }
  
  /**
   * Initialize the agent with strategies
   * @param {Array} strategies - List of strategies to use
   * @returns {boolean} Success status
   */
  async initialize(strategies = []) {
    try {
      // Call base initialization
      await super.initialize();
      
      // Debug: Log that initialization is in progress
      console.log('Strategy Agent initializing...');
      
      // Get prompt from Prompt Engineering Agent
      const prompt = await promptEngineeringAgent.getPrompt('strategy');
      
      // Store the prompt
      await this.storeKnowledge('prompts', 'current', prompt);
      
      // Register initial strategies
      if (strategies.length > 0) {
        for (const strategy of strategies) {
          await this.registerStrategy(strategy);
        }
      } else {
        // Register default strategies
        await this.registerDefaultStrategies();
      }
      
      this.logger.info('Strategy Agent initialized with prompt and strategies');
      console.log('Strategy Agent initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Error initializing Strategy Agent:', error);
      console.error('Error initializing Strategy Agent:', error);
      throw error;
    }
  }
  
  /**
   * Register a new trading strategy
   * @param {object} strategy - Strategy configuration
   * @returns {boolean} Success status
   */
  async registerStrategy(strategy) {
    try {
      if (!strategy.id || !strategy.name || !strategy.type) {
        throw new Error('Invalid strategy configuration');
      }
      
      // Add strategy to active strategies
      this.activeStrategies.set(strategy.id, {
        ...strategy,
        enabled: strategy.enabled !== false, // Default to enabled
        lastUpdated: new Date(),
        performance: {
          wins: 0,
          losses: 0,
          totalReturns: 0
        }
      });
      
      this.logger.info(`Registered strategy: ${strategy.name} (${strategy.id})`);
      
      // Store strategy in knowledge base
      await this.storeKnowledge('strategies', strategy.id, strategy);
      
      return true;
    } catch (error) {
      this.logger.error(`Error registering strategy ${strategy?.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Register default trading strategies
   * @returns {boolean} Success status
   */
  async registerDefaultStrategies() {
    try {
      // In a real implementation, this would load strategies from a library
      // For demonstration purposes, we'll set up some simple strategies
      
      const defaultStrategies = [
        {
          id: 'trend-following',
          name: 'Trend Following',
          type: 'technical',
          description: 'Follows market trends using moving averages',
          parameters: {
            shortPeriod: 20,
            longPeriod: 50,
            signalThreshold: 0.01
          },
          timeframes: ['1h', '4h', '1d'],
          markets: ['crypto', 'forex'],
          enabled: true
        },
        {
          id: 'mean-reversion',
          name: 'Mean Reversion',
          type: 'statistical',
          description: 'Trades price reversions to the mean',
          parameters: {
            lookbackPeriod: 30,
            deviationThreshold: 2.0,
            holdingPeriod: 5
          },
          timeframes: ['15m', '1h', '4h'],
          markets: ['crypto', 'stocks'],
          enabled: true
        },
        {
          id: 'breakout',
          name: 'Breakout',
          type: 'technical',
          description: 'Trades breakouts from key levels',
          parameters: {
            lookbackPeriod: 20,
            volatilityFactor: 1.5,
            confirmationCandles: 3
          },
          timeframes: ['1h', '4h', '1d'],
          markets: ['crypto', 'forex', 'stocks'],
          enabled: true
        }
      ];
      
      for (const strategy of defaultStrategies) {
        await this.registerStrategy(strategy);
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error registering default strategies:', error);
      return false;
    }
  }
  
  /**
   * Process market data and generate trading signals
   * @param {object} data - Processed market data
   * @returns {object} Trading signals
   */
  async process(data) {
    try {
      this.logger.info('Processing market data for trading signals');
      console.log('Processing market data for trading signals');
      
      // Update market state
      this.updateMarketState(data);
      
      // Generate signals for each strategy
      const signals = [];
      
      for (const [strategyId, strategy] of this.activeStrategies.entries()) {
        if (!strategy.enabled) continue;
        
        try {
          // In a real implementation, this would use more sophisticated strategy logic
          // For demonstration, we'll use a simple implementation
          const signal = await this.executeStrategy(strategy, data);
          
          if (signal) {
            signals.push({
              ...signal,
              strategyId,
              strategyName: strategy.name,
              timestamp: new Date()
            });
          }
        } catch (strategyError) {
          this.logger.error(`Error executing strategy ${strategyId}:`, strategyError);
        }
      }
      
      // Store signals in knowledge base
      if (signals.length > 0) {
        await this.storeKnowledge('signals', `signals-${Date.now()}`, signals);
      }
      
      console.log(`Generated ${signals.length} trading signals`);
      return signals;
    } catch (error) {
      this.logger.error('Error generating trading signals:', error);
      console.error('Error generating trading signals:', error);
      throw error;
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
   * Execute a specific trading strategy
   * @param {object} strategy - Strategy to execute
   * @param {object} data - Market data
   * @returns {object|null} Trading signal
   */
  async executeStrategy(strategy, data) {
    // This is a simplified implementation
    // A real implementation would have more sophisticated logic
    
    switch (strategy.id) {
      case 'trend-following':
        return this.executeTrendFollowingStrategy(strategy, data);
      
      case 'mean-reversion':
        return this.executeMeanReversionStrategy(strategy, data);
      
      case 'breakout':
        return this.executeBreakoutStrategy(strategy, data);
      
      default:
        this.logger.warn(`Unknown strategy: ${strategy.id}`);
        return null;
    }
  }
  
  /**
   * Execute trend following strategy
   * @param {object} strategy - Strategy configuration
   * @param {object} data - Market data
   * @returns {object|null} Trading signal
   */
  executeTrendFollowingStrategy(strategy, data) {
    // Simple implementation of trend following
    const trend = data.processed.trend;
    
    if (trend === 'strong_up') {
      return {
        action: 'BUY',
        reason: 'Strong uptrend detected',
        confidence: 0.8,
        params: {
          entryPrice: this.marketState.price,
          stopLoss: this.marketState.price * 0.95,
          takeProfit: this.marketState.price * 1.1
        }
      };
    } else if (trend === 'strong_down') {
      return {
        action: 'SELL',
        reason: 'Strong downtrend detected',
        confidence: 0.8,
        params: {
          entryPrice: this.marketState.price,
          stopLoss: this.marketState.price * 1.05,
          takeProfit: this.marketState.price * 0.9
        }
      };
    }
    
    return null;
  }
  
  /**
   * Execute mean reversion strategy
   * @param {object} strategy - Strategy configuration
   * @param {object} data - Market data
   * @returns {object|null} Trading signal
   */
  executeMeanReversionStrategy(strategy, data) {
    // Simple implementation of mean reversion
    const currentPrice = this.marketState.price;
    const mean = data.processed.mean;
    const deviation = (currentPrice - mean) / mean;
    
    if (deviation > strategy.parameters.deviationThreshold / 100) {
      return {
        action: 'SELL',
        reason: 'Price significantly above mean',
        confidence: 0.7,
        params: {
          entryPrice: currentPrice,
          stopLoss: currentPrice * 1.03,
          takeProfit: mean
        }
      };
    } else if (deviation < -strategy.parameters.deviationThreshold / 100) {
      return {
        action: 'BUY',
        reason: 'Price significantly below mean',
        confidence: 0.7,
        params: {
          entryPrice: currentPrice,
          stopLoss: currentPrice * 0.97,
          takeProfit: mean
        }
      };
    }
    
    return null;
  }
  
  /**
   * Execute breakout strategy
   * @param {object} strategy - Strategy configuration
   * @param {object} data - Market data
   * @returns {object|null} Trading signal
   */
  executeBreakoutStrategy(strategy, data) {
    // Simple implementation of breakout strategy
    // In a real implementation, this would use more sophisticated breakout detection
    
    const prices = data.original.prices;
    const currentPrice = prices[prices.length - 1];
    
    // Calculate a simple resistance level
    const max = Math.max(...prices.slice(0, -3));
    
    // Calculate a simple support level
    const min = Math.min(...prices.slice(0, -3));
    
    // Check for breakout
    if (currentPrice > max * (1 + strategy.parameters.volatilityFactor / 100)) {
      return {
        action: 'BUY',
        reason: 'Bullish breakout detected',
        confidence: 0.75,
        params: {
          entryPrice: currentPrice,
          stopLoss: max,
          takeProfit: currentPrice * 1.1
        }
      };
    } else if (currentPrice < min * (1 - strategy.parameters.volatilityFactor / 100)) {
      return {
        action: 'SELL',
        reason: 'Bearish breakout detected',
        confidence: 0.75,
        params: {
          entryPrice: currentPrice,
          stopLoss: min,
          takeProfit: currentPrice * 0.9
        }
      };
    }
    
    return null;
  }
  
  /**
   * Handle special agent-specific messages
   * @param {object} message - Message object
   */
  async handleMessage(message) {
    // Call parent handler
    await super.handleMessage(message);
    
    try {
      console.log(`Strategy Agent handling message: ${message.type}`);
      
      if (message.type === 'data_response') {
        console.log('Received processed market data, generating signals...');
        
        const signals = await this.process(message.content);
        
        console.log('Sending trading signals to:', message.from);
        await this.sendMessage(message.from, signals, 'signal_response');
        
        console.log('Signals sent successfully');
      }
      
      else if (message.type === 'strategy_update') {
        console.log('Received strategy update for:', message.content.strategyId);
        
        const strategy = this.activeStrategies.get(message.content.strategyId);
        
        if (strategy) {
          // Update strategy configuration
          const updatedStrategy = {
            ...strategy,
            ...message.content.updates,
            lastUpdated: new Date()
          };
          
          this.activeStrategies.set(message.content.strategyId, updatedStrategy);
          
          // Store updated strategy
          await this.storeKnowledge('strategies', message.content.strategyId, updatedStrategy);
          
          await this.sendMessage(
            message.from,
            { success: true, strategyId: message.content.strategyId },
            'strategy_update_response'
          );
        } else {
          await this.sendMessage(
            message.from,
            { 
              success: false, 
              error: `Strategy ${message.content.strategyId} not found` 
            },
            'strategy_update_response'
          );
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.logger.error('Error handling message:', error);
      await this.sendMessage(message.from, { error: error.message }, 'error');
    }
  }
}

module.exports = new StrategyAgent(); 
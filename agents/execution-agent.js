/**
 * Execution Agent
 * 
 * Responsible for optimizing order execution
 * Handles trade execution based on signals received
 */

const winston = require('winston');
const Joi = require('joi');
const EventEmitter = require('events');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ExecutionAgent - ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/execution-agent.log' })
  ]
});

/**
 * Execution Agent class
 */
class ExecutionAgent extends EventEmitter {
  /**
   * Initialize the Execution Agent
   */
  constructor() {
    super();
    
    // Execution parameters
    this.params = {
      slippageTolerance: 0.001, // 0.1% default slippage tolerance
      executionStrategy: 'market', // default execution strategy
      transactionCostModel: 'basic', // basic transaction cost model
      retryAttempts: 3, // number of retry attempts for failed orders
      retryDelayMs: 1000, // delay between retry attempts
      circuitBreakerThreshold: 0.05, // 5% price deviation triggers circuit breaker
      emergencyStopLoss: 0.10, // 10% emergency stop loss
      expireAfterSeconds: 60, // orders expire after 60 seconds by default
      smartRoutingEnabled: true, // enable smart order routing by default
      orderSizeLimit: 100000, // maximum order size in USD
      aggressiveness: 0.5 // execution aggressiveness (0-1)
    };
    
    // Execution metrics
    this.metrics = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      totalSlippage: 0,
      averageSlippage: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      transactionCosts: 0,
      
      // Track metrics by order type
      ordersByType: {
        market: { total: 0, successful: 0, failed: 0, avgSlippage: 0 },
        limit: { total: 0, successful: 0, failed: 0, avgSlippage: 0 },
        smart: { total: 0, successful: 0, failed: 0, avgSlippage: 0 }
      },
      
      // Historical execution data
      executionHistory: []
    };
    
    // Registered exchanges
    this.exchanges = {};
    
    // Agent state
    this.initialized = false;
    this.messenger = null;
    this.knowledgeBase = null;
    
    logger.info('Execution Agent created');
  }
  
  /**
   * Initialize the agent
   * @param {Object} messenger - Agent messenger instance
   * @param {Object} knowledgeBase - Knowledge base instance
   * @param {Object} options - Additional options for initialization
   * @returns {Boolean} - Initialization success status
   */
  async initialize(messenger = null, knowledgeBase = null, options = {}) {
    try {
      logger.info('Initializing Execution Agent');
      
      // Set agent messenger and knowledge base
      this.messenger = messenger;
      this.knowledgeBase = knowledgeBase;
      
      // Apply custom execution parameters if provided
      if (options.executionParams) {
        this.params = { ...this.params, ...options.executionParams };
        logger.info(`Custom execution parameters applied: ${JSON.stringify(options.executionParams)}`);
      }
      
      // Reset metrics
      this.resetMetrics();
      
      // Setup message handling if messenger is provided
      if (this.messenger) {
        this.setupMessageHandling();
        logger.info('Message handling configured');
      }
      
      // Apply circuit breaker from options
      if (options.circuitBreakerThreshold) {
        this.params.circuitBreakerThreshold = options.circuitBreakerThreshold;
        logger.info(`Circuit breaker threshold set to ${this.params.circuitBreakerThreshold}`);
      }
      
      this.initialized = true;
      logger.info('Execution Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Setup message handling for agent communication
   */
  setupMessageHandling() {
    if (!this.messenger) {
      logger.warn('Cannot setup message handling: messenger not provided');
      return;
    }
    
    // Handle trade execution requests
    this.messenger.subscribe('trade_execution', async (message) => {
      logger.info(`Received trade execution request: ${JSON.stringify(message)}`);
      
      try {
        // Validate the incoming execution request
        const validatedSignal = this.validateTradeSignal(message.signal);
        
        if (!validatedSignal) {
          logger.error(`Invalid trade signal: ${JSON.stringify(message.signal)}`);
          
          // Respond with error
          this.messenger.publish('execution_response', {
            success: false,
            originalSignal: message.signal,
            error: 'Invalid trade signal format',
            timestamp: new Date().toISOString()
          });
          
          return;
        }
        
        // Extract execution parameters from the message
        const executionParams = message.params || {};
        
        // Execute the trade
        const result = await this.executeTrade(validatedSignal, executionParams);
        
        // Send execution response
        this.messenger.publish('execution_response', {
          success: result.success,
          originalSignal: message.signal,
          executionResult: result,
          timestamp: new Date().toISOString()
        });
        
        // Store execution result in knowledge base if available
        if (this.knowledgeBase) {
          await this.knowledgeBase.storeKnowledge(
            'executions',
            `${validatedSignal.symbol}.${Date.now()}`,
            result
          );
        }
      } catch (error) {
        logger.error(`Error processing execution request: ${error.message}`);
        
        // Respond with error
        this.messenger.publish('execution_response', {
          success: false,
          originalSignal: message.signal,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handle execution parameter updates
    this.messenger.subscribe('execution_params_update', (message) => {
      logger.info(`Received execution parameters update: ${JSON.stringify(message)}`);
      
      try {
        // Update execution parameters
        this.params = { ...this.params, ...message.params };
        logger.info(`Execution parameters updated: ${JSON.stringify(this.params)}`);
        
        // Acknowledge update
        this.messenger.publish('execution_params_updated', {
          success: true,
          params: this.params,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error(`Error updating execution parameters: ${error.message}`);
        
        // Respond with error
        this.messenger.publish('execution_params_updated', {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  /**
   * Register an exchange for trade execution
   * @param {String} exchangeId - Exchange identifier
   * @param {Object} exchangeClient - Exchange client instance
   * @returns {Boolean} - Registration success status
   */
  registerExchange(exchangeId, exchangeClient) {
    try {
      logger.info(`Registering exchange: ${exchangeId}`);
      
      // Validate exchange client has required methods
      const requiredMethods = [
        'getMarketData',
        'executeTrade',
        'getAccountBalance',
        'checkOrderStatus'
      ];
      
      for (const method of requiredMethods) {
        if (typeof exchangeClient[method] !== 'function') {
          throw new Error(`Exchange client must implement ${method} method`);
        }
      }
      
      // Register the exchange
      this.exchanges[exchangeId] = {
        client: exchangeClient,
        connected: false,
        lastConnected: null
      };
      
      logger.info(`Exchange ${exchangeId} registered successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to register exchange ${exchangeId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Connect to a registered exchange
   * @param {String} exchangeId - Exchange identifier
   * @returns {Boolean} - Connection success status
   */
  async connectToExchange(exchangeId) {
    try {
      logger.info(`Connecting to exchange: ${exchangeId}`);
      
      // Check if exchange is registered
      if (!this.exchanges[exchangeId]) {
        logger.warn(`Exchange ${exchangeId} not registered, creating mock implementation`);
        
        // Create a mock exchange implementation for testing
        this.exchanges[exchangeId] = {
          client: this.createMockExchangeClient(exchangeId),
          connected: false,
          lastConnected: null
        };
      }
      
      // Connect to the exchange
      const exchange = this.exchanges[exchangeId];
      
      if (exchange.client.connect) {
        await exchange.client.connect();
      }
      
      exchange.connected = true;
      exchange.lastConnected = new Date();
      
      logger.info(`Successfully connected to exchange: ${exchangeId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to connect to exchange ${exchangeId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Create a mock exchange client for testing
   * @param {String} exchangeId - Exchange identifier
   * @returns {Object} - Mock exchange client
   */
  createMockExchangeClient(exchangeId) {
    logger.info(`Creating mock exchange client for ${exchangeId}`);
    
    return {
      getMarketData: async (symbol) => {
        // Try to get market data from knowledge base if available
        if (this.knowledgeBase) {
          const marketData = await this.knowledgeBase.retrieveKnowledge('market_data', `${symbol}.current`);
          if (marketData) {
            return marketData;
          }
        }
        
        // Return mock data if knowledge base data not available
        return {
          symbol,
          bid: 10000,
          ask: 10010,
          last: 10005,
          volume: 100,
          timestamp: Date.now()
        };
      },
      
      executeTrade: async (trade) => {
        // Simulate execution with random slippage
        const slippage = (Math.random() * 0.002) - 0.001; // +/- 0.1%
        const executedPrice = trade.params.entryPrice * (1 + slippage);
        
        // Calculate transaction cost (0.1% fee)
        const transactionCost = trade.params.positionSize * 0.001;
        
        return {
          success: Math.random() > 0.05, // 95% success rate
          orderId: `mock-${Date.now()}`,
          executedPrice,
          executedQuantity: trade.params.positionSize / executedPrice,
          timestamp: new Date().toISOString(),
          transactionCost,
          slippage
        };
      },
      
      getAccountBalance: async () => {
        return {
          totalBalance: 100000,
          availableBalance: 95000,
          inOrders: 5000,
          timestamp: Date.now()
        };
      },
      
      checkOrderStatus: async (orderId) => {
        return {
          orderId,
          status: 'FILLED',
          filledQuantity: 1.0,
          remainingQuantity: 0.0,
          avgFillPrice: 10005,
          timestamp: Date.now()
        };
      },
      
      connect: async () => {
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      }
    };
  }
  
  /**
   * Validate a trade signal using Joi schema
   * @param {Object} signal - Trade signal to validate
   * @returns {Object|null} - Validated signal or null if invalid
   */
  validateTradeSignal(signal) {
    try {
      // Define validation schema
      const schema = Joi.object({
        action: Joi.string().valid('BUY', 'SELL').required(),
        symbol: Joi.string().required(),
        confidence: Joi.number().min(0).max(1).required(),
        strategyId: Joi.string().required(),
        params: Joi.object({
          entryPrice: Joi.number().required(),
          positionSize: Joi.number().required(),
          stopLoss: Joi.number().optional(),
          takeProfit: Joi.number().optional(),
          orderType: Joi.string().valid('MARKET', 'LIMIT', 'SMART').optional(),
          timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK').optional(),
          expireAfter: Joi.number().optional(),
          slippageTolerance: Joi.number().optional()
        }).required()
      });
      
      // Validate signal against schema
      const { error, value } = schema.validate(signal);
      
      if (error) {
        logger.error(`Signal validation failed: ${error.message}`);
        return null;
      }
      
      return value;
    } catch (error) {
      logger.error(`Error validating signal: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Execute a trade based on a signal
   * @param {Object} signal - The trade signal
   * @param {Object} options - Execution options
   * @returns {Object} - Execution result
   */
  async executeTrade(signal, options = {}) {
    try {
      const startTime = Date.now();
      logger.info(`Executing trade: ${signal.action} ${signal.symbol}`);
      
      // Validate the signal
      const validatedSignal = this.validateTradeSignal(signal);
      if (!validatedSignal) {
        throw new Error(`Invalid trade signal: ${JSON.stringify(signal)}`);
      }
      
      // Determine exchange to use
      const exchangeId = options.exchange || Object.keys(this.exchanges)[0] || 'coinbase';
      
      // Check if exchange is connected
      if (!this.exchanges[exchangeId]) {
        await this.connectToExchange(exchangeId);
      }
      
      if (!this.exchanges[exchangeId]?.connected) {
        throw new Error(`Exchange ${exchangeId} not connected`);
      }
      
      // Get exchange client
      const exchange = this.exchanges[exchangeId];
      
      // Determine execution strategy
      const executionStrategy = options.executionStrategy || this.params.executionStrategy;
      
      // Update metrics for the chosen order type
      this.metrics.ordersByType[executionStrategy] = this.metrics.ordersByType[executionStrategy] || { 
        total: 0, successful: 0, failed: 0, avgSlippage: 0 
      };
      this.metrics.ordersByType[executionStrategy].total++;
      
      // Get current market data
      const marketData = await exchange.client.getMarketData(signal.symbol);
      
      // Execute using the appropriate strategy with retry logic
      let executionResult = null;
      let attempts = 0;
      let lastError = null;
      
      while (attempts < this.params.retryAttempts && !executionResult) {
        attempts++;
        
        try {
          switch (executionStrategy) {
            case 'market':
              executionResult = await this.executeMarketOrder(signal, marketData, exchange, options);
              break;
            case 'limit':
              executionResult = await this.executeLimitOrder(signal, marketData, exchange, options);
              break;
            case 'smart':
              executionResult = await this.executeSmartOrder(signal, marketData, exchange, options);
              break;
            default:
              executionResult = await this.executeMarketOrder(signal, marketData, exchange, options);
          }
        } catch (error) {
          lastError = error;
          logger.error(`Execution attempt ${attempts} failed: ${error.message}`);
          
          // Wait before retry
          if (attempts < this.params.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, this.params.retryDelayMs));
          }
        }
      }
      
      // If all attempts failed, throw the last error
      if (!executionResult) {
        throw new Error(`Failed to execute trade after ${attempts} attempts: ${lastError.message}`);
      }
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.metrics.totalOrders++;
      this.metrics.totalExecutionTime += executionTime;
      this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.totalOrders;
      
      if (executionResult.success) {
        this.metrics.successfulOrders++;
        this.metrics.ordersByType[executionStrategy].successful++;
        
        // Calculate and track slippage
        if (executionResult.slippage !== undefined) {
          this.metrics.totalSlippage += Math.abs(executionResult.slippage);
          this.metrics.averageSlippage = this.metrics.totalSlippage / this.metrics.successfulOrders;
          
          // Update slippage by order type
          const totalTypeSlippage = this.metrics.ordersByType[executionStrategy].avgSlippage * 
            (this.metrics.ordersByType[executionStrategy].successful - 1);
          this.metrics.ordersByType[executionStrategy].avgSlippage = 
            (totalTypeSlippage + Math.abs(executionResult.slippage)) / 
            this.metrics.ordersByType[executionStrategy].successful;
        }
        
        // Track transaction costs
        if (executionResult.transactionCost) {
          this.metrics.transactionCosts += executionResult.transactionCost;
        }
      } else {
        this.metrics.failedOrders++;
        this.metrics.ordersByType[executionStrategy].failed++;
      }
      
      // Store execution in history
      this.metrics.executionHistory.push({
        ...executionResult,
        executionTime,
        strategy: executionStrategy,
        timestamp: new Date().toISOString()
      });
      
      // Return the result with execution time
      return {
        ...executionResult,
        executionTime,
        strategy: executionStrategy
      };
    } catch (error) {
      logger.error(`Trade execution failed: ${error.message}`);
      
      // Update failed orders metrics
      this.metrics.totalOrders++;
      this.metrics.failedOrders++;
      
      if (options.executionStrategy) {
        this.metrics.ordersByType[options.executionStrategy].total++;
        this.metrics.ordersByType[options.executionStrategy].failed++;
      }
      
      // Return error result
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Execute a market order
   * @param {Object} signal - The trade signal
   * @param {Object} marketData - Current market data
   * @param {Object} exchange - Exchange to use
   * @param {Object} options - Additional options
   * @returns {Object} - Execution result
   */
  async executeMarketOrder(signal, marketData, exchange, options = {}) {
    logger.info(`Executing market order: ${signal.action} ${signal.symbol}`);
    
    // Apply slippage for realistic simulation
    const slippageTolerance = options.slippageTolerance || this.params.slippageTolerance;
    
    // Prepare the order
    const order = {
      ...signal,
      params: {
        ...signal.params,
        orderType: 'MARKET',
        slippageTolerance
      }
    };
    
    // Execute the order
    const result = await exchange.client.executeTrade(order);
    
    // Calculate slippage percentage
    let slippage = 0;
    if (result.executedPrice && signal.params.entryPrice) {
      slippage = (result.executedPrice - signal.params.entryPrice) / signal.params.entryPrice;
      // Invert slippage for sell orders (negative slippage is good for sells)
      if (signal.action === 'SELL') {
        slippage = -slippage;
      }
    }
    
    // Return the result with slippage calculated
    return {
      ...result,
      slippage
    };
  }
  
  /**
   * Execute a limit order
   * @param {Object} signal - The trade signal
   * @param {Object} marketData - Current market data
   * @param {Object} exchange - Exchange to use
   * @param {Object} options - Additional options
   * @returns {Object} - Execution result
   */
  async executeLimitOrder(signal, marketData, exchange, options = {}) {
    logger.info(`Executing limit order: ${signal.action} ${signal.symbol}`);
    
    // Determine limit price based on signal action
    let limitPrice;
    if (signal.action === 'BUY') {
      // Set limit price slightly below entry price for buy orders
      limitPrice = signal.params.entryPrice * (1 - 0.001); // 0.1% below
    } else {
      // Set limit price slightly above entry price for sell orders
      limitPrice = signal.params.entryPrice * (1 + 0.001); // 0.1% above
    }
    
    // Prepare the order
    const order = {
      ...signal,
      params: {
        ...signal.params,
        orderType: 'LIMIT',
        limitPrice,
        timeInForce: options.timeInForce || 'GTC', // Good Till Cancelled
        expireAfter: options.expireAfter || this.params.expireAfterSeconds
      }
    };
    
    // For simulation, determine if the limit order would be filled
    // In a real exchange, this would be handled by the exchange
    const currentPrice = signal.action === 'BUY' ? marketData.ask : marketData.bid;
    const limitPriceFavorable = signal.action === 'BUY' ? 
      limitPrice >= currentPrice : limitPrice <= currentPrice;
    
    let result;
    
    if (limitPriceFavorable) {
      // Order would be filled immediately
      result = await exchange.client.executeTrade(order);
    } else {
      // Simulate partial fill or timeout
      const fillProbability = 0.7; // 70% chance of filling the order
      
      if (Math.random() < fillProbability) {
        // Order gets filled after a delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        result = await exchange.client.executeTrade(order);
      } else {
        // Order times out
        return {
          success: false,
          error: 'Limit order expired without filling',
          orderType: 'LIMIT',
          limitPrice,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Calculate slippage (difference between requested limit price and executed price)
    let slippage = 0;
    if (result.executedPrice && limitPrice) {
      slippage = (result.executedPrice - limitPrice) / limitPrice;
      // Invert slippage for sell orders
      if (signal.action === 'SELL') {
        slippage = -slippage;
      }
    }
    
    // Return the result with order details
    return {
      ...result,
      orderType: 'LIMIT',
      limitPrice,
      slippage
    };
  }
  
  /**
   * Execute a smart order (adaptive order routing)
   * @param {Object} signal - The trade signal
   * @param {Object} marketData - Current market data
   * @param {Object} exchange - Exchange to use
   * @param {Object} options - Additional options
   * @returns {Object} - Execution result
   */
  async executeSmartOrder(signal, marketData, exchange, options = {}) {
    logger.info(`Executing smart order: ${signal.action} ${signal.symbol}`);
    
    // Determine market conditions
    const volatility = this.estimateVolatility(signal.symbol);
    const spread = marketData.spread || (marketData.ask - marketData.bid) / marketData.bid;
    const volume = marketData.volume || 1000;
    
    // Determine best execution strategy based on market conditions
    let executionStrategy;
    
    if (spread > 0.005) { // Spread > 0.5%
      // Wide spread - use limit orders
      executionStrategy = 'limit';
    } else if (volatility > 0.01) { // High volatility
      // Volatile market - use market orders for quick execution
      executionStrategy = 'market';
    } else if (signal.params.positionSize > volume * 0.1) { // Large order
      // Large order - split into chunks
      return this.executeIceberg(signal, marketData, exchange, options);
    } else {
      // Normal conditions - use market orders
      executionStrategy = 'market';
    }
    
    logger.info(`Smart routing selected strategy: ${executionStrategy}`);
    
    // Execute using the selected strategy
    if (executionStrategy === 'market') {
      return this.executeMarketOrder(signal, marketData, exchange, options);
    } else if (executionStrategy === 'limit') {
      return this.executeLimitOrder(signal, marketData, exchange, options);
    }
  }
  
  /**
   * Execute an iceberg order (splitting large orders into smaller chunks)
   * @param {Object} signal - The trade signal
   * @param {Object} marketData - Current market data
   * @param {Object} exchange - Exchange to use
   * @param {Object} options - Additional options
   * @returns {Object} - Execution result
   */
  async executeIceberg(signal, marketData, exchange, options = {}) {
    logger.info(`Executing iceberg order: ${signal.action} ${signal.symbol}`);
    
    // Determine chunk size (10% of position size)
    const chunkSize = signal.params.positionSize * 0.1;
    const numChunks = 10;
    
    // Track overall execution results
    let totalExecutedQuantity = 0;
    let totalCost = 0;
    let allSuccess = true;
    let chunkResults = [];
    
    // Execute chunks sequentially
    for (let i = 0; i < numChunks; i++) {
      // Create chunk signal
      const chunkSignal = {
        ...signal,
        params: {
          ...signal.params,
          positionSize: chunkSize
        }
      };
      
      // Add delay between chunks
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Execute the chunk
      const chunkResult = await this.executeMarketOrder(chunkSignal, marketData, exchange, options);
      chunkResults.push(chunkResult);
      
      if (chunkResult.success) {
        totalExecutedQuantity += chunkResult.executedQuantity;
        totalCost += chunkResult.executedQuantity * chunkResult.executedPrice;
      } else {
        allSuccess = false;
      }
    }
    
    // Calculate average execution price
    const avgExecutionPrice = totalExecutedQuantity > 0 ? 
      totalCost / totalExecutedQuantity : 0;
    
    // Calculate slippage
    let slippage = 0;
    if (avgExecutionPrice && signal.params.entryPrice) {
      slippage = (avgExecutionPrice - signal.params.entryPrice) / signal.params.entryPrice;
      // Invert slippage for sell orders
      if (signal.action === 'SELL') {
        slippage = -slippage;
      }
    }
    
    // Return aggregated result
    return {
      success: allSuccess,
      orderType: 'ICEBERG',
      executedPrice: avgExecutionPrice,
      executedQuantity: totalExecutedQuantity,
      slippage,
      timestamp: new Date().toISOString(),
      chunkResults
    };
  }
  
  /**
   * Estimate volatility for a symbol
   * @param {String} symbol - Trading symbol
   * @returns {Number} - Estimated volatility
   */
  estimateVolatility(symbol) {
    // Try to get historical prices from knowledge base
    if (this.knowledgeBase) {
      const historicalData = this.knowledgeBase.retrieveKnowledge('market_data', `${symbol}.recent`);
      
      if (historicalData && historicalData.prices && historicalData.prices.length > 1) {
        // Calculate standard deviation of price returns
        const returns = [];
        for (let i = 1; i < historicalData.prices.length; i++) {
          returns.push(
            (historicalData.prices[i] - historicalData.prices[i-1]) / historicalData.prices[i-1]
          );
        }
        
        // Calculate standard deviation
        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
      }
    }
    
    // Default to low volatility if no data available
    return 0.005; // 0.5% volatility
  }
  
  /**
   * Get execution metrics
   * @returns {Object} - Current execution metrics
   */
  getExecutionMetrics() {
    return {
      ...this.metrics,
      // Add derived metrics
      executionSuccessRate: this.metrics.totalOrders > 0 ? 
        this.metrics.successfulOrders / this.metrics.totalOrders : 0,
      recentExecutions: this.metrics.executionHistory.slice(-10)
    };
  }
  
  /**
   * Reset execution metrics
   */
  resetMetrics() {
    this.metrics = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      totalSlippage: 0,
      averageSlippage: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      transactionCosts: 0,
      
      // Track metrics by order type
      ordersByType: {
        market: { total: 0, successful: 0, failed: 0, avgSlippage: 0 },
        limit: { total: 0, successful: 0, failed: 0, avgSlippage: 0 },
        smart: { total: 0, successful: 0, failed: 0, avgSlippage: 0 }
      },
      
      // Historical execution data
      executionHistory: []
    };
    
    logger.info('Execution metrics reset');
  }
}

// Create and export execution agent instance
const executionAgent = new ExecutionAgent();

module.exports = executionAgent; 
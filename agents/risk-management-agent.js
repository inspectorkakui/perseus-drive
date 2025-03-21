/**
 * Risk Management Agent
 * 
 * Responsible for evaluating trading decisions and ensuring they comply
 * with risk parameters. This agent handles position sizing, exposure
 * monitoring, and risk metric calculation.
 */

const BaseAgent = require('../core/base-agent');
const promptEngineeringAgent = require('./prompt-engineering-agent');

class RiskManagementAgent extends BaseAgent {
  /**
   * Create a new Risk Management Agent
   */
  constructor() {
    super('risk-management', 'risk');
    
    // Initialize risk parameters
    this.riskParameters = {
      maxPositionSize: 0.05,        // 5% of portfolio per position
      maxTotalExposure: 0.50,       // 50% max total exposure
      maxDrawdown: 0.15,            // 15% max drawdown
      stopLossDefault: 0.03,        // 3% default stop loss
      positionSizing: 'risk-based', // risk-based or fixed-size
      riskPerTrade: 0.01,           // 1% risk per trade
      correlationThreshold: 0.7     // Correlation threshold for diversification
    };
    
    // Initialize portfolio state
    this.portfolioState = {
      totalValue: 100000,           // Placeholder portfolio value
      currentPositions: new Map(),  // Map of current positions
      currentExposure: 0,           // Current exposure as ratio
      highWaterMark: 100000,        // Portfolio high water mark
      currentDrawdown: 0            // Current drawdown as ratio
    };
    
    // Initialize risk metrics
    this.riskMetrics = {
      var95: 0,                     // 95% Value at Risk
      averageDrawdown: 0,           // Average drawdown
      maxDrawdown: 0,               // Maximum drawdown
      sharpeRatio: 0,               // Sharpe ratio
      correlationMatrix: {}         // Correlation between assets
    };
    
    this.logger.info('Risk Management Agent created');
  }
  
  /**
   * Initialize the agent
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(options = {}) {
    try {
      await super.initialize();
      
      this.logger.info('Initializing Risk Management Agent...');
      
      // Get prompt from Prompt Engineering Agent
      const prompt = await promptEngineeringAgent.getRiskManagementPrompt();
      await this.storeKnowledge('prompts', 'risk-management', prompt);
      
      // Load risk parameters from options or knowledge base
      if (options.riskParameters) {
        this.riskParameters = { ...this.riskParameters, ...options.riskParameters };
      } else {
        try {
          const storedParams = await this.getKnowledge('risk', 'parameters');
          if (storedParams) {
            this.riskParameters = storedParams;
          }
        } catch (err) {
          this.logger.warn('No stored risk parameters found, using defaults');
        }
      }
      
      // Load portfolio state from options or knowledge base
      if (options.portfolioState) {
        this.portfolioState = { ...this.portfolioState, ...options.portfolioState };
      } else {
        try {
          const storedState = await this.getKnowledge('risk', 'portfolio-state');
          if (storedState) {
            this.portfolioState = storedState;
          }
        } catch (err) {
          this.logger.warn('No stored portfolio state found, using defaults');
        }
      }
      
      // Store initial parameters and state
      await this.storeKnowledge('risk', 'parameters', this.riskParameters);
      await this.storeKnowledge('risk', 'portfolio-state', this.portfolioState);
      
      this.logger.info('Risk Management Agent initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Error initializing Risk Management Agent:', error);
      return false;
    }
  }
  
  /**
   * Evaluate a trade for compliance with risk parameters
   * @param {Object} tradeSignal - The trade signal to evaluate
   * @param {Object} marketData - Current market data
   * @returns {Promise<Object>} Evaluation result with position sizing
   */
  async evaluateTrade(tradeSignal, marketData) {
    try {
      this.logger.info(`Evaluating trade for ${tradeSignal.symbol || 'unknown'}`);
      
      // Validate inputs
      if (!tradeSignal || !tradeSignal.action || !marketData) {
        throw new Error('Invalid trade signal or market data');
      }
      
      // Skip evaluation if it's a close signal
      if (tradeSignal.action === 'CLOSE') {
        return {
          approved: true,
          reason: 'Close signals are always approved',
          originalSignal: tradeSignal
        };
      }
      
      // Check overall exposure
      if (this.portfolioState.currentExposure >= this.riskParameters.maxTotalExposure) {
        return {
          approved: false,
          reason: 'Maximum portfolio exposure reached',
          originalSignal: tradeSignal
        };
      }
      
      // Check drawdown limits
      if (this.portfolioState.currentDrawdown >= this.riskParameters.maxDrawdown) {
        return {
          approved: false,
          reason: 'Maximum drawdown threshold reached',
          originalSignal: tradeSignal
        };
      }
      
      // Calculate position size
      const positionSize = await this._calculatePositionSize(tradeSignal, marketData);
      
      // Check if position is already held for this symbol
      const symbol = tradeSignal.symbol || marketData.symbol;
      const existingPosition = this.portfolioState.currentPositions.get(symbol);
      
      if (existingPosition) {
        if (
          (existingPosition.direction === 'long' && tradeSignal.action === 'BUY') || 
          (existingPosition.direction === 'short' && tradeSignal.action === 'SELL')
        ) {
          return {
            approved: false,
            reason: `Already have a ${existingPosition.direction} position for ${symbol}`,
            originalSignal: tradeSignal
          };
        }
      }
      
      // Calculate risk metrics for this trade
      const riskMetrics = await this._calculateTradeRiskMetrics(tradeSignal, marketData, positionSize);
      
      // Determine stop loss and take profit levels
      const stopLoss = tradeSignal.params?.stopLoss || this._calculateStopLoss(tradeSignal, marketData);
      const takeProfit = tradeSignal.params?.takeProfit || this._calculateTakeProfit(tradeSignal, marketData);
      
      // Check risk/reward ratio
      const riskRewardRatio = this._calculateRiskRewardRatio(tradeSignal, marketData, stopLoss, takeProfit);
      
      if (riskRewardRatio < 1.5) { // Minimum 1.5:1 reward/risk ratio
        return {
          approved: false,
          reason: `Insufficient risk/reward ratio (${riskRewardRatio.toFixed(2)}:1)`,
          riskRewardRatio,
          originalSignal: tradeSignal
        };
      }
      
      // Make final decision
      const approved = true; // Simplified for now, will add more checks
      
      // Create modified trade signal with risk parameters
      const modifiedSignal = {
        ...tradeSignal,
        positionSize,
        riskMetrics,
        params: {
          ...tradeSignal.params,
          stopLoss,
          takeProfit,
          riskRewardRatio
        }
      };
      
      return {
        approved,
        reason: approved ? 'Trade complies with risk parameters' : 'Trade violates risk parameters',
        originalSignal: tradeSignal,
        modifiedSignal: approved ? modifiedSignal : null,
        riskMetrics
      };
    } catch (error) {
      this.logger.error('Error evaluating trade:', error);
      return {
        approved: false,
        reason: `Error evaluating trade: ${error.message}`,
        originalSignal: tradeSignal
      };
    }
  }
  
  /**
   * Update portfolio state with a new position or closed position
   * @param {Object} trade - Trade details
   * @param {string} trade.symbol - Asset symbol
   * @param {string} trade.action - Trade action (BUY, SELL, CLOSE)
   * @param {number} trade.price - Execution price
   * @param {number} trade.quantity - Trade quantity
   * @param {string} trade.direction - Position direction (long, short)
   * @returns {Promise<Object>} Updated portfolio state
   */
  async updatePortfolio(trade) {
    try {
      this.logger.info(`Updating portfolio with trade for ${trade.symbol}`);
      
      const { symbol, action, price, quantity, direction } = trade;
      
      // Clone current state
      const newState = { ...this.portfolioState };
      
      // Handle new positions
      if (action === 'BUY' || action === 'SELL') {
        const positionValue = price * quantity;
        const existingPosition = newState.currentPositions.get(symbol);
        
        if (existingPosition) {
          // Update existing position
          const updatedPosition = {
            ...existingPosition,
            quantity: existingPosition.quantity + quantity,
            averagePrice: (existingPosition.averagePrice * existingPosition.quantity + price * quantity) / 
                          (existingPosition.quantity + quantity),
            value: existingPosition.value + positionValue
          };
          
          newState.currentPositions.set(symbol, updatedPosition);
        } else {
          // Create new position
          newState.currentPositions.set(symbol, {
            symbol,
            direction: action === 'BUY' ? 'long' : 'short',
            quantity,
            averagePrice: price,
            value: positionValue,
            openTime: new Date().toISOString()
          });
        }
        
        // Update exposure
        newState.currentExposure = this._calculateTotalExposure(newState.currentPositions, newState.totalValue);
      }
      
      // Handle closed positions
      if (action === 'CLOSE') {
        const existingPosition = newState.currentPositions.get(symbol);
        
        if (existingPosition) {
          // Calculate P&L
          const pnl = direction === 'long' 
            ? (price - existingPosition.averagePrice) * existingPosition.quantity
            : (existingPosition.averagePrice - price) * existingPosition.quantity;
          
          // Update portfolio value
          newState.totalValue += pnl;
          
          // Remove position
          newState.currentPositions.delete(symbol);
          
          // Update high water mark if needed
          if (newState.totalValue > newState.highWaterMark) {
            newState.highWaterMark = newState.totalValue;
          }
          
          // Update current drawdown
          newState.currentDrawdown = 1 - (newState.totalValue / newState.highWaterMark);
          
          // Update exposure
          newState.currentExposure = this._calculateTotalExposure(newState.currentPositions, newState.totalValue);
        }
      }
      
      // Store updated state
      this.portfolioState = newState;
      await this.storeKnowledge('risk', 'portfolio-state', this.portfolioState);
      
      return this.portfolioState;
    } catch (error) {
      this.logger.error('Error updating portfolio:', error);
      throw error;
    }
  }
  
  /**
   * Calculate position size based on risk parameters and strategy
   * @param {Object} tradeSignal - Trade signal
   * @param {Object} marketData - Current market data
   * @returns {Promise<number>} Position size
   * @private
   */
  async _calculatePositionSize(tradeSignal, marketData) {
    const { positionSizing, riskPerTrade, maxPositionSize } = this.riskParameters;
    const portfolioValue = this.portfolioState.totalValue;
    
    // Get current price from market data or trade signal
    const currentPrice = marketData.prices?.[0] || tradeSignal.params?.entryPrice;
    
    if (!currentPrice) {
      throw new Error('Cannot calculate position size without price information');
    }
    
    let positionSize;
    
    if (positionSizing === 'risk-based') {
      // Calculate stop loss distance
      const stopLoss = tradeSignal.params?.stopLoss || this._calculateStopLoss(tradeSignal, marketData);
      const entryPrice = tradeSignal.params?.entryPrice || currentPrice;
      
      // Calculate risk distance as a percentage
      const riskDistance = Math.abs(entryPrice - stopLoss) / entryPrice;
      
      if (riskDistance === 0) {
        throw new Error('Stop loss is identical to entry price, cannot calculate risk-based position size');
      }
      
      // Calculate position size based on risk per trade
      const riskAmount = portfolioValue * riskPerTrade;
      positionSize = riskAmount / (currentPrice * riskDistance);
    } else {
      // Fixed-size position sizing (as a percentage of portfolio)
      positionSize = portfolioValue * maxPositionSize / currentPrice;
    }
    
    // Ensure position doesn't exceed max size
    const maxSizeByValue = portfolioValue * maxPositionSize / currentPrice;
    positionSize = Math.min(positionSize, maxSizeByValue);
    
    return positionSize;
  }
  
  /**
   * Calculate stop loss for a trade
   * @param {Object} tradeSignal - Trade signal
   * @param {Object} marketData - Current market data
   * @returns {number} Stop loss price
   * @private
   */
  _calculateStopLoss(tradeSignal, marketData) {
    const currentPrice = marketData.prices?.[0] || tradeSignal.params?.entryPrice;
    
    if (!currentPrice) {
      throw new Error('Cannot calculate stop loss without price information');
    }
    
    // Default stop loss percentage
    const stopLossPercent = this.riskParameters.stopLossDefault;
    
    // Calculate based on direction
    if (tradeSignal.action === 'BUY') {
      return currentPrice * (1 - stopLossPercent);
    } else {
      return currentPrice * (1 + stopLossPercent);
    }
  }
  
  /**
   * Calculate take profit for a trade
   * @param {Object} tradeSignal - Trade signal
   * @param {Object} marketData - Current market data
   * @returns {number} Take profit price
   * @private
   */
  _calculateTakeProfit(tradeSignal, marketData) {
    const currentPrice = marketData.prices?.[0] || tradeSignal.params?.entryPrice;
    const stopLoss = tradeSignal.params?.stopLoss || this._calculateStopLoss(tradeSignal, marketData);
    
    if (!currentPrice) {
      throw new Error('Cannot calculate take profit without price information');
    }
    
    // Calculate risk distance
    const riskDistance = Math.abs(currentPrice - stopLoss);
    
    // Target reward/risk ratio of 2:1
    const targetRatio = 2;
    
    // Calculate based on direction
    if (tradeSignal.action === 'BUY') {
      return currentPrice + (riskDistance * targetRatio);
    } else {
      return currentPrice - (riskDistance * targetRatio);
    }
  }
  
  /**
   * Calculate risk/reward ratio for a trade
   * @param {Object} tradeSignal - Trade signal
   * @param {Object} marketData - Current market data
   * @param {number} stopLoss - Stop loss price
   * @param {number} takeProfit - Take profit price
   * @returns {number} Risk/reward ratio
   * @private
   */
  _calculateRiskRewardRatio(tradeSignal, marketData, stopLoss, takeProfit) {
    const currentPrice = marketData.prices?.[0] || tradeSignal.params?.entryPrice;
    
    if (!currentPrice || !stopLoss || !takeProfit) {
      throw new Error('Cannot calculate risk/reward ratio without price information');
    }
    
    const riskDistance = Math.abs(currentPrice - stopLoss);
    const rewardDistance = Math.abs(currentPrice - takeProfit);
    
    if (riskDistance === 0) {
      throw new Error('Risk distance is zero, cannot calculate risk/reward ratio');
    }
    
    return rewardDistance / riskDistance;
  }
  
  /**
   * Calculate total portfolio exposure
   * @param {Map} positions - Current positions
   * @param {number} portfolioValue - Total portfolio value
   * @returns {number} Total exposure as a ratio
   * @private
   */
  _calculateTotalExposure(positions, portfolioValue) {
    let totalExposure = 0;
    
    for (const position of positions.values()) {
      totalExposure += position.value;
    }
    
    return totalExposure / portfolioValue;
  }
  
  /**
   * Calculate risk metrics for a trade
   * @param {Object} tradeSignal - Trade signal
   * @param {Object} marketData - Current market data
   * @param {number} positionSize - Position size
   * @returns {Promise<Object>} Trade risk metrics
   * @private
   */
  async _calculateTradeRiskMetrics(tradeSignal, marketData, positionSize) {
    const currentPrice = marketData.prices?.[0] || tradeSignal.params?.entryPrice;
    const stopLoss = tradeSignal.params?.stopLoss || this._calculateStopLoss(tradeSignal, marketData);
    
    // Calculate maximum potential loss (dollar value)
    const maxLoss = Math.abs(currentPrice - stopLoss) * positionSize;
    
    // Calculate value at risk (VaR)
    const var95 = maxLoss;  // Simplified; in a real system, this would use statistical methods
    
    // Calculate position risk contribution as percentage of portfolio
    const positionRisk = maxLoss / this.portfolioState.totalValue;
    
    return {
      var95,
      maxLoss,
      positionRisk,
      positionSize
    };
  }
  
  /**
   * Set risk parameters
   * @param {Object} parameters - New risk parameters
   * @returns {Promise<Object>} Updated risk parameters
   */
  async setRiskParameters(parameters) {
    try {
      this.riskParameters = { ...this.riskParameters, ...parameters };
      
      // Store updated parameters
      await this.storeKnowledge('risk', 'parameters', this.riskParameters);
      
      this.logger.info('Updated risk parameters', this.riskParameters);
      return this.riskParameters;
    } catch (error) {
      this.logger.error('Error setting risk parameters:', error);
      throw error;
    }
  }
  
  /**
   * Get current risk parameters
   * @returns {Object} Current risk parameters
   */
  getRiskParameters() {
    return this.riskParameters;
  }
  
  /**
   * Get current portfolio state
   * @returns {Object} Current portfolio state
   */
  getPortfolioState() {
    return this.portfolioState;
  }
}

module.exports = new RiskManagementAgent(); 
/**
 * Risk Management Agent Tests
 */

const { expect } = require('chai');
const sinon = require('sinon');
const riskManagementAgent = require('../agents/risk-management-agent');
const promptEngineeringAgent = require('../agents/prompt-engineering-agent');

describe('Risk Management Agent', function() {
  // Setup sandbox for stubs and spies
  let sandbox;
  
  beforeEach(async function() {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Stub the prompt engineering agent
    sandbox.stub(promptEngineeringAgent, 'getRiskManagementPrompt').resolves('Risk management prompt content');
    
    // Stub the storeKnowledge and getKnowledge methods
    sandbox.stub(riskManagementAgent, 'storeKnowledge').resolves(true);
    sandbox.stub(riskManagementAgent, 'getKnowledge').callsFake((category, key) => {
      if (category === 'risk' && key === 'parameters') {
        return Promise.resolve({
          maxPositionSize: 0.05,
          maxTotalExposure: 0.50,
          maxDrawdown: 0.15,
          stopLossDefault: 0.03,
          positionSizing: 'risk-based',
          riskPerTrade: 0.01,
          correlationThreshold: 0.7
        });
      } else if (category === 'risk' && key === 'portfolio-state') {
        return Promise.resolve({
          totalValue: 100000,
          currentPositions: new Map(),
          currentExposure: 0,
          highWaterMark: 100000,
          currentDrawdown: 0
        });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    // Initialize the agent
    await riskManagementAgent.initialize();
  });
  
  afterEach(function() {
    // Restore all stubbed methods
    sandbox.restore();
  });
  
  describe('Initialization', function() {
    it('should initialize with default risk parameters', async function() {
      // Reset stubs to ensure we get default values
      riskManagementAgent.getKnowledge.restore();
      sandbox.stub(riskManagementAgent, 'getKnowledge').rejects(new Error('Not found'));
      
      await riskManagementAgent.initialize();
      
      const params = riskManagementAgent.getRiskParameters();
      expect(params).to.have.property('maxPositionSize', 0.05);
      expect(params).to.have.property('maxTotalExposure', 0.50);
      expect(params).to.have.property('riskPerTrade', 0.01);
    });
    
    it('should initialize with custom risk parameters from options', async function() {
      const customParams = {
        maxPositionSize: 0.03,
        riskPerTrade: 0.005
      };
      
      await riskManagementAgent.initialize({ riskParameters: customParams });
      
      const params = riskManagementAgent.getRiskParameters();
      expect(params).to.have.property('maxPositionSize', 0.03);
      expect(params).to.have.property('maxTotalExposure', 0.50); // Unchanged
      expect(params).to.have.property('riskPerTrade', 0.005);
    });
  });
  
  describe('Trade Evaluation', function() {
    it('should approve valid trade signals', async function() {
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY',
        params: {
          entryPrice: 50000
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(result.approved).to.be.true;
      expect(result.modifiedSignal).to.exist;
      expect(result.modifiedSignal.positionSize).to.be.a('number');
      expect(result.modifiedSignal.params.stopLoss).to.be.a('number');
      expect(result.modifiedSignal.params.takeProfit).to.be.a('number');
    });
    
    it('should automatically approve CLOSE signals', async function() {
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'CLOSE'
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(result.approved).to.be.true;
      expect(result.reason).to.include('Close signals are always approved');
    });
    
    it('should reject trades that exceed maximum exposure', async function() {
      // Set current exposure to max
      riskManagementAgent.portfolioState.currentExposure = riskManagementAgent.riskParameters.maxTotalExposure;
      
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY',
        params: {
          entryPrice: 50000
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(result.approved).to.be.false;
      expect(result.reason).to.include('Maximum portfolio exposure reached');
    });
    
    it('should reject trades with poor risk/reward ratios', async function() {
      // Create a trade with a tight take profit that will result in poor R/R
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY',
        params: {
          entryPrice: 50000,
          stopLoss: 49000,     // 2% stop loss
          takeProfit: 50500    // Only 1% take profit - 0.5:1 R/R ratio
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(result.approved).to.be.false;
      expect(result.reason).to.include('Insufficient risk/reward ratio');
    });
    
    it('should reject duplicate positions', async function() {
      // Add an existing long position
      riskManagementAgent.portfolioState.currentPositions.set('BTC-USD', {
        symbol: 'BTC-USD',
        direction: 'long',
        quantity: 1,
        averagePrice: 48000,
        value: 48000,
        openTime: new Date().toISOString()
      });
      
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY', // Trying to buy again
        params: {
          entryPrice: 50000
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(result.approved).to.be.false;
      expect(result.reason).to.include('Already have a long position');
    });
  });
  
  describe('Position Sizing', function() {
    it('should calculate risk-based position size correctly', async function() {
      // Reset any custom state
      riskManagementAgent.riskParameters.positionSizing = 'risk-based';
      riskManagementAgent.riskParameters.riskPerTrade = 0.01; // 1% risk per trade
      riskManagementAgent.portfolioState.totalValue = 100000;
      
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY',
        params: {
          entryPrice: 50000,
          stopLoss: 48500 // 3% stop loss
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      // Spy on the private method
      const calculateSizeSpy = sandbox.spy(riskManagementAgent, '_calculatePositionSize');
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      expect(calculateSizeSpy.calledOnce).to.be.true;
      
      // Manual calculation for comparison:
      // Risk amount = Portfolio value * risk per trade = 100000 * 0.01 = 1000
      // Risk distance = (Entry - Stop) / Entry = (50000 - 48500) / 50000 = 0.03
      // Position size = Risk amount / (Price * Risk distance) = 1000 / (50000 * 0.03) = 0.66...
      const expectedSizeApprox = 0.67; // Approximate value
      
      expect(result.modifiedSignal.positionSize).to.be.closeTo(expectedSizeApprox, 0.1);
    });
    
    it('should calculate fixed position size correctly', async function() {
      // Set to fixed position sizing
      riskManagementAgent.riskParameters.positionSizing = 'fixed-size';
      riskManagementAgent.riskParameters.maxPositionSize = 0.05; // 5% of portfolio
      riskManagementAgent.portfolioState.totalValue = 100000;
      
      const tradeSignal = {
        symbol: 'BTC-USD',
        action: 'BUY',
        params: {
          entryPrice: 50000
        }
      };
      
      const marketData = {
        symbol: 'BTC-USD',
        prices: [50000],
        timestamp: Date.now()
      };
      
      const result = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);
      
      // Manual calculation for comparison:
      // Position size = Portfolio value * max position size / price = 100000 * 0.05 / 50000 = 0.1
      const expectedSize = 0.1;
      
      expect(result.modifiedSignal.positionSize).to.be.closeTo(expectedSize, 0.01);
    });
  });
  
  describe('Portfolio Management', function() {
    it('should update portfolio state when adding a new position', async function() {
      // Initial portfolio setup
      riskManagementAgent.portfolioState = {
        totalValue: 100000,
        currentPositions: new Map(),
        currentExposure: 0,
        highWaterMark: 100000,
        currentDrawdown: 0
      };
      
      // Define trade for a new position
      const trade = {
        symbol: 'ETH-USD',
        action: 'BUY',
        price: 3000,
        quantity: 5,
        direction: 'long'
      };
      
      // Update the portfolio
      const newState = await riskManagementAgent.updatePortfolio(trade);
      
      // Verify the updates
      expect(newState.currentPositions.has('ETH-USD')).to.be.true;
      
      const position = newState.currentPositions.get('ETH-USD');
      expect(position.quantity).to.equal(5);
      expect(position.averagePrice).to.equal(3000);
      expect(position.value).to.equal(15000);
      expect(position.direction).to.equal('long');
      
      // Verify exposure calculation: 15000 / 100000 = 0.15
      expect(newState.currentExposure).to.be.closeTo(0.15, 0.01);
    });
    
    it('should update portfolio state when closing a position with profit', async function() {
      // Initialize with an existing position
      const initialPosition = {
        symbol: 'BTC-USD',
        direction: 'long',
        quantity: 2,
        averagePrice: 45000,
        value: 90000,
        openTime: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      };
      
      riskManagementAgent.portfolioState = {
        totalValue: 100000,
        currentPositions: new Map([['BTC-USD', initialPosition]]),
        currentExposure: 0.9, // 90%
        highWaterMark: 100000,
        currentDrawdown: 0
      };
      
      // Define trade to close the position with profit
      const trade = {
        symbol: 'BTC-USD',
        action: 'CLOSE',
        price: 50000, // Closed at 50000, which is 5000 higher than entry
        quantity: 2,
        direction: 'long'
      };
      
      // Update the portfolio
      const newState = await riskManagementAgent.updatePortfolio(trade);
      
      // Verify position is removed
      expect(newState.currentPositions.has('BTC-USD')).to.be.false;
      
      // Calculate expected P&L: (50000 - 45000) * 2 = 10000
      // New portfolio value: 100000 + 10000 = 110000
      expect(newState.totalValue).to.equal(110000);
      
      // Verify high water mark is updated
      expect(newState.highWaterMark).to.equal(110000);
      
      // Verify exposure is zero
      expect(newState.currentExposure).to.equal(0);
      
      // Verify drawdown is zero (at high water mark)
      expect(newState.currentDrawdown).to.equal(0);
    });
    
    it('should update portfolio state when closing a position with loss', async function() {
      // Initialize with an existing position
      const initialPosition = {
        symbol: 'BTC-USD',
        direction: 'long',
        quantity: 2,
        averagePrice: 45000,
        value: 90000,
        openTime: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      };
      
      riskManagementAgent.portfolioState = {
        totalValue: 100000,
        currentPositions: new Map([['BTC-USD', initialPosition]]),
        currentExposure: 0.9, // 90%
        highWaterMark: 100000,
        currentDrawdown: 0
      };
      
      // Define trade to close the position with loss
      const trade = {
        symbol: 'BTC-USD',
        action: 'CLOSE',
        price: 42500, // Closed at 42500, which is 2500 lower than entry
        quantity: 2,
        direction: 'long'
      };
      
      // Update the portfolio
      const newState = await riskManagementAgent.updatePortfolio(trade);
      
      // Verify position is removed
      expect(newState.currentPositions.has('BTC-USD')).to.be.false;
      
      // Calculate expected P&L: (42500 - 45000) * 2 = -5000
      // New portfolio value: 100000 - 5000 = 95000
      expect(newState.totalValue).to.equal(95000);
      
      // Verify high water mark stays the same
      expect(newState.highWaterMark).to.equal(100000);
      
      // Verify exposure is zero
      expect(newState.currentExposure).to.equal(0);
      
      // Verify drawdown: (1 - 95000/100000) = 0.05 or 5%
      expect(newState.currentDrawdown).to.be.closeTo(0.05, 0.001);
    });
  });
  
  describe('Risk Parameter Management', function() {
    it('should update risk parameters', async function() {
      const newParameters = {
        maxPositionSize: 0.03,
        riskPerTrade: 0.005,
        maxDrawdown: 0.10
      };
      
      const result = await riskManagementAgent.setRiskParameters(newParameters);
      
      expect(result.maxPositionSize).to.equal(0.03);
      expect(result.riskPerTrade).to.equal(0.005);
      expect(result.maxDrawdown).to.equal(0.10);
      
      // Verify that other parameters are unchanged
      expect(result.maxTotalExposure).to.equal(0.50);
      expect(result.stopLossDefault).to.equal(0.03);
    });
  });
}); 
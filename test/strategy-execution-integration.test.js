/**
 * Strategy and Execution Agent Integration Tests
 * 
 * Tests the integration between the Strategy Agent and Execution Agent.
 */

const strategyAgent = require('../agents/strategy-agent');
const executionAgent = require('../agents/execution-agent');
const knowledgeBase = require('../tools/knowledge-base');
const agentMessenger = require('../tools/agent-messenger');

// Sample market data for testing
const sampleMarketData = {
  symbol: 'BTC-USD',
  timestamp: Date.now(),
  prices: [9500, 9600, 9650, 9700, 9800, 10000, 10200, 10300, 10250, 10400],
  volumes: [10, 12, 8, 15, 20, 25, 30, 22, 18, 24],
  spread: 0.001, // 0.1% spread for smart routing tests
  volume: 1500 // Test volume for smart routing
};

// Helper to wait for async operations
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Run the integration test
 */
async function runIntegrationTest() {
  console.log('Starting Strategy and Execution Agent Integration Test');
  
  try {
    // Knowledge base is already initialized in the constructor
    console.log('Knowledge Base ready');
    
    // Store sample market data in knowledge base for execution agent to use
    await knowledgeBase.storeKnowledge('market_data', `${sampleMarketData.symbol}.current`, sampleMarketData);
    await knowledgeBase.storeKnowledge('market_data', `${sampleMarketData.symbol}.recent`, {
      prices: sampleMarketData.prices,
      volumes: sampleMarketData.volumes,
      timestamp: sampleMarketData.timestamp
    });
    
    console.log('Stored sample market data in knowledge base');
    
    // Initialize agent messenger
    agentMessenger.clearAllQueues();
    console.log('Agent Messenger cleared');
    
    // Initialize strategy agent
    const strategyInitialized = await strategyAgent.initialize();
    console.log(`Strategy Agent initialized: ${strategyInitialized}`);
    
    // Initialize execution agent
    const executionInitialized = await executionAgent.initialize();
    console.log(`Execution Agent initialized: ${executionInitialized}`);
    
    if (!strategyInitialized || !executionInitialized) {
      throw new Error('Failed to initialize agents');
    }
    
    // Connect to exchange
    const exchangeConnected = await executionAgent.connectToExchange('coinbase');
    console.log(`Exchange connection status: ${exchangeConnected}`);
    
    if (!exchangeConnected) {
      console.warn('Warning: Exchange connection failed, will use mock execution');
    }
    
    // Process market data with strategy agent
    console.log('Processing market data with Strategy Agent');
    const signals = await strategyAgent.process(sampleMarketData);
    console.log(`Strategy Agent generated ${signals.length} signals`);
    
    if (signals.length === 0) {
      console.log('No signals generated, creating a test signal');
      signals.push({
        action: 'BUY',
        symbol: 'BTC-USD',
        confidence: 0.8,
        strategyId: 'test-strategy',
        params: {
          entryPrice: sampleMarketData.prices[sampleMarketData.prices.length - 1],
          positionSize: 100, // Smaller position for testing
          stopLoss: sampleMarketData.prices[sampleMarketData.prices.length - 1] * 0.95,
          takeProfit: sampleMarketData.prices[sampleMarketData.prices.length - 1] * 1.1
        }
      });
    }
    
    // Process each signal with execution agent
    console.log('Executing signals with Execution Agent');
    
    const executionResults = [];
    
    // Test different execution strategies
    const executionStrategies = ['market', 'limit', 'smart'];
    let strategyIndex = 0;
    
    for (const signal of signals) {
      // Use a different execution strategy for each signal (round-robin)
      const executionStrategy = executionStrategies[strategyIndex % executionStrategies.length];
      strategyIndex++;
      
      console.log(`Executing signal: ${signal.action} ${signal.symbol} with ${executionStrategy} strategy`);
      
      // Execute the trade
      const result = await executionAgent.executeTrade(signal, {
        executionStrategy,
        exchange: 'coinbase'
      });
      executionResults.push(result);
      
      console.log(`Execution result: ${result.success ? 'Success' : 'Failed'}`);
      if (result.success) {
        console.log(`Executed at price: ${result.executedPrice}, quantity: ${result.executedQuantity}`);
        console.log(`Transaction cost: ${result.transactionCost ? result.transactionCost.toFixed(4) : 'Unknown'}`);
      } else {
        console.log(`Execution error: ${result.error}`);
      }
    }
    
    // Wait for any async operations to complete
    await wait(500);
    
    // Get execution metrics
    const metrics = executionAgent.getExecutionMetrics();
    console.log('Execution Metrics:');
    console.log(`- Total Orders: ${metrics.totalOrders}`);
    console.log(`- Successful Orders: ${metrics.successfulOrders}`);
    console.log(`- Failed Orders: ${metrics.failedOrders}`);
    console.log(`- Average Slippage: ${metrics.averageSlippage * 100}%`);
    console.log(`- Average Execution Time: ${metrics.averageExecutionTime}ms`);
    console.log(`- Transaction Costs: ${metrics.transactionCosts ? metrics.transactionCosts.toFixed(4) : 0}`);
    
    // Log metrics for each order type
    console.log('Order Types:');
    for (const [type, stats] of Object.entries(metrics.ordersByType)) {
      console.log(`- ${type}: ${stats.total} total, ${stats.successful} successful, ${stats.failed} failed`);
    }
    
    // Record trade outcomes for the first signal
    if (signals.length > 0 && executionResults.length > 0 && executionResults[0].success) {
      const signal = signals[0];
      const result = executionResults[0];
      
      // Simulate a successful trade outcome
      console.log('Recording trade outcome for strategy performance tracking');
      
      const tradeOutcome = {
        strategyId: signal.strategyId || 'test-strategy',
        trade: {
          action: signal.action,
          symbol: signal.symbol,
          entryPrice: result.executedPrice,
          exitPrice: result.executedPrice * 1.05, // Simulate a 5% profit
          quantity: result.executedQuantity,
          entryTime: result.timestamp,
          exitTime: new Date().toISOString()
        },
        success: true,
        returnPct: 5.0 // 5% return
      };
      
      const recordResult = await strategyAgent.recordTradeOutcome(
        tradeOutcome.strategyId,
        tradeOutcome.trade,
        tradeOutcome.success,
        tradeOutcome.returnPct
      );
      
      console.log(`Trade outcome recorded: ${recordResult}`);
    }
    
    // Get strategy performance report
    console.log('Getting strategy performance report');
    const performanceReport = strategyAgent.getPerformanceReport();
    console.log('Strategy Performance:');
    console.log(`- Total Signals: ${performanceReport.totalSignals}`);
    console.log(`- Win Rate: ${performanceReport.winRate * 100}%`);
    console.log(`- Profit Factor: ${performanceReport.profitFactor}`);
    console.log(`- Average Return: ${performanceReport.averageReturn}%`);
    
    console.log('Integration Test Completed Successfully');
    return true;
  } catch (error) {
    console.error('Integration Test Failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runIntegrationTest()
    .then(success => {
      console.log(`Test ${success ? 'Passed' : 'Failed'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error in test:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTest }; 
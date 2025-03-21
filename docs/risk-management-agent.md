# Risk Management Agent

## Overview

The Risk Management Agent is a critical component of the Perseus Drive trading system responsible for evaluating trading decisions against predefined risk parameters. This agent ensures that all trading activities adhere to risk management principles, safeguarding the portfolio from excessive drawdowns and managing exposure efficiently.

## Responsibilities

- Evaluating trade signals for compliance with risk parameters
- Determining appropriate position sizing
- Managing overall portfolio exposure
- Calculating and tracking risk metrics
- Enforcing stop loss and take profit levels
- Maintaining portfolio state and drawdown metrics

## Risk Parameters

The Risk Management Agent uses the following default risk parameters:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| maxPositionSize | 5% | Maximum size for any single position as a percentage of portfolio |
| maxTotalExposure | 50% | Maximum total exposure across all positions |
| maxDrawdown | 15% | Maximum acceptable drawdown before limiting new positions |
| stopLossDefault | 3% | Default stop loss percentage if not specified in trade signal |
| positionSizing | 'risk-based' | Strategy for position sizing ('risk-based' or 'fixed-size') |
| riskPerTrade | 1% | Maximum risk per trade as percentage of portfolio (for risk-based sizing) |
| correlationThreshold | 0.7 | Correlation threshold used for diversification analysis |

## Position Sizing Strategies

### Risk-Based Sizing

With risk-based position sizing, the agent calculates the appropriate position size based on:
- The distance between entry price and stop loss (risk per share)
- The maximum risk amount per trade (portfolio value × riskPerTrade)

The formula used is:
```
positionSize = (portfolio value × risk per trade) / (price × risk distance percentage)
```

This ensures that each trade risks exactly the specified percentage of the portfolio, regardless of the volatility of the asset or the tightness of the stop loss.

### Fixed-Size Positioning

With fixed-size positioning, each position is sized to a fixed percentage of the portfolio:
```
positionSize = (portfolio value × maxPositionSize) / price
```

## Integration with Strategy Agent

The Risk Management Agent works closely with the Strategy Agent:

1. Strategy Agent generates trade signals
2. Risk Management Agent evaluates these signals
3. If approved, Risk Management Agent adjusts position size and adds risk parameters
4. Modified signals are passed back to Strategy Agent for execution

## Trade Evaluation Process

When evaluating a trade signal, the agent follows this process:

1. Validate inputs (trade signal and market data)
2. Check if current portfolio exposure is below maximum threshold
3. Check if current drawdown is below maximum threshold
4. Calculate appropriate position size based on risk parameters
5. Check for duplicate positions
6. Calculate risk metrics for the trade
7. Determine stop loss and take profit levels
8. Check if risk/reward ratio meets minimum threshold (default 1.5:1)
9. Return evaluation result with approved/rejected status and reasoning

## Portfolio State Management

The agent maintains the following portfolio state:

| State Property | Description |
|----------------|-------------|
| totalValue | Total portfolio value |
| currentPositions | Map of all current positions |
| currentExposure | Current exposure as ratio of portfolio |
| highWaterMark | Highest portfolio value reached |
| currentDrawdown | Current drawdown as ratio from high water mark |

## Risk Metrics

The agent tracks the following risk metrics:

| Metric | Description |
|--------|-------------|
| var95 | 95% Value at Risk |
| averageDrawdown | Average drawdown |
| maxDrawdown | Maximum historical drawdown |
| sharpeRatio | Sharpe ratio (return per unit of risk) |
| correlationMatrix | Asset correlation matrix for diversification analysis |

## Usage Example

```javascript
const riskManagementAgent = require('../agents/risk-management-agent');
const marketData = {
  symbol: 'BTC-USD',
  prices: [50000],
  timestamp: Date.now()
};

// Initialize with custom parameters
await riskManagementAgent.initialize({
  riskParameters: {
    maxPositionSize: 0.03,
    riskPerTrade: 0.005,
    maxDrawdown: 0.10
  }
});

// Evaluate a trade signal
const tradeSignal = {
  symbol: 'BTC-USD',
  action: 'BUY',
  params: {
    entryPrice: 50000
  }
};

const evaluation = await riskManagementAgent.evaluateTrade(tradeSignal, marketData);

if (evaluation.approved) {
  // Execute trade with modified signal that includes position sizing and risk parameters
  console.log(`Trade approved with position size: ${evaluation.modifiedSignal.positionSize}`);
  console.log(`Stop loss set at: ${evaluation.modifiedSignal.params.stopLoss}`);
  console.log(`Take profit set at: ${evaluation.modifiedSignal.params.takeProfit}`);
} else {
  console.log(`Trade rejected: ${evaluation.reason}`);
}
```

## Future Enhancements

- Advanced correlation-based position sizing
- Dynamic adjustment of risk parameters based on market conditions
- Machine learning models for predicting optimal position sizing
- Integration with external risk management APIs
- Enhanced visualization of risk metrics and portfolio state
- Stress testing and scenario analysis capabilities 
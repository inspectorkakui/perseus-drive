# External Data Provider System

## Overview

The External Data Provider System in Perseus Drive is designed to standardize access to market data from various exchanges and data sources. The system implements a provider-based architecture where each exchange or data source is accessed through a standardized interface, enabling the trading system to seamlessly switch between data sources based on availability, performance, or cost considerations.

## Architecture

### Core Components

1. **BaseProvider Class** - Abstract base class that defines the standard interface for all provider implementations
2. **ProviderManager** - Central component responsible for managing provider instances, handling failover, and providing unified data access
3. **Provider Implementations** - Concrete implementations for specific exchanges (e.g., Coinbase, Binance)

### Provider Interface

All providers must implement the BaseProvider interface, which includes:

```javascript
class BaseProvider {
  // Core methods
  async initialize(config)
  async getMarketData(symbol, options)
  async getHistoricalData(symbol, timeframe, options)
  async subscribe(symbol, channel)
  async unsubscribe(symbol, channel)
  
  // Utility methods
  isConnected()
  getRateLimits()
}
```

### Data Flow

1. Trading agents request data from the ProviderManager
2. ProviderManager selects the appropriate provider based on availability and priority
3. If the primary provider fails, ProviderManager automatically fails over to alternative providers
4. Data is normalized to a standard format regardless of the source provider

## Implemented Providers

### Coinbase Provider

**Status:** Complete

The Coinbase Provider connects to Coinbase Advanced Trade API and WebSocket services to provide:

- Real-time market data for supported trading pairs
- Historical price candles with various timeframes
- WebSocket streaming for tickers, trades, and order book updates

**Features:**

- Automatic authentication and session management
- Rate limit handling with automatic retries
- WebSocket reconnection with exponential backoff
- Data normalization to the Perseus Drive standard format

**Usage Example:**

```javascript
// Initialize with authentication
await coinbaseProvider.initialize({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
});

// Get current market data
const btcData = await coinbaseProvider.getMarketData('BTC-USD');

// Get historical data
const historicalData = await coinbaseProvider.getHistoricalData('ETH-USD', '1h', {
  start: new Date('2023-01-01'),
  end: new Date('2023-01-31')
});

// Subscribe to real-time data
await coinbaseProvider.subscribe('BTC-USD', 'ticker', (data) => {
  console.log('New BTC price:', data.price);
});
```

### Binance Provider

**Status:** In Development

The Binance Provider will connect to Binance's API and WebSocket services to provide similar functionality to the Coinbase Provider but for the Binance exchange.

**Planned Features:**

- Support for spot and futures markets
- Advanced order book data access
- Optimized rate limit management

## Provider Manager

The Provider Manager serves as the central access point for all data needs within the Perseus Drive system. It implements:

1. **Provider Registration** - Dynamic registration of provider instances
2. **Priority-based Selection** - Configurable provider priorities
3. **Automatic Failover** - Seamless switching to backup providers on failure
4. **Request Aggregation** - Combining similar requests to reduce API calls

**Usage Example:**

```javascript
// Register providers
providerManager.registerProvider('coinbase', coinbaseProvider, { priority: 1 });
providerManager.registerProvider('binance', binanceProvider, { priority: 2 });

// Set default provider
providerManager.setDefaultProvider('coinbase');

// Get market data (will automatically use coinbase, or fall back to binance if coinbase fails)
const marketData = await providerManager.getMarketData('BTC-USD');
```

## Data Normalization

All providers normalize data to a standard format to ensure consistency across the system:

### Market Data Format

```javascript
{
  provider: 'coinbase',  // Source provider ID
  symbol: 'BTC-USD',     // Trading pair
  price: 50000.25,       // Current price
  bid: 50000.00,         // Best bid price
  ask: 50000.50,         // Best ask price
  volume24h: 1250.5,     // 24h trading volume
  high24h: 51200.75,     // 24h high price
  low24h: 49800.25,      // 24h low price
  timestamp: 1678901234567 // Timestamp in milliseconds
}
```

### Historical Data Format

```javascript
[
  {
    provider: 'coinbase',
    timestamp: 1678901234567,
    open: 50000.25,
    high: 50100.75,
    low: 49950.50,
    close: 50050.25,
    volume: 125.5
  },
  // Additional candles...
]
```

## Error Handling

The provider system implements robust error handling:

1. **Request Retries** - Automatic retry for transient errors
2. **Rate Limit Management** - Respects exchange rate limits with adaptive delays
3. **Circuit Breaking** - Temporary disabling of providers that consistently fail
4. **Error Propagation** - Standardized error formats for upstream components

## Next Steps

1. Complete implementation of the Binance Provider
2. Add support for additional data sources (e.g., FTX, Kraken)
3. Implement advanced data caching mechanisms to reduce API calls
4. Develop provider performance metrics tracking
5. Create adapter for historical data providers (e.g., Kaiko, CryptoCompare) 
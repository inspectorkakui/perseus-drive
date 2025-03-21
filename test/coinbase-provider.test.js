/**
 * Coinbase Provider Tests
 */

const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const WebSocket = require('ws');
const coinbaseProvider = require('../providers/coinbase-provider');

describe('Coinbase Provider', function() {
  // Setup sandbox for stubs and spies
  let sandbox;
  
  beforeEach(function() {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Disable real HTTP requests
    nock.disableNetConnect();
    // But allow localhost for WebSocket connections in tests
    nock.enableNetConnect('localhost');
  });
  
  afterEach(function() {
    // Restore all stubbed methods
    sandbox.restore();
    
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });
  
  describe('Initialization', function() {
    it('should initialize without authentication', async function() {
      // Mock API time endpoint (used for auth check)
      nock('https://api.exchange.coinbase.com')
        .get('/time')
        .reply(200, {
          iso: '2023-07-04T12:00:00.000Z',
          epoch: 1688472000
        });
      
      const result = await coinbaseProvider.initialize();
      
      expect(result).to.be.true;
      expect(coinbaseProvider.isAuthenticated).to.be.false;
      expect(coinbaseProvider.initialized).to.be.true;
    });
    
    it('should initialize with authentication', async function() {
      // Mock API time endpoint (used for auth check)
      nock('https://api.exchange.coinbase.com')
        .get('/time')
        .reply(200, {
          iso: '2023-07-04T12:00:00.000Z',
          epoch: 1688472000
        });
      
      const options = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        apiPassphrase: 'test-passphrase'
      };
      
      const result = await coinbaseProvider.initialize(options);
      
      expect(result).to.be.true;
      expect(coinbaseProvider.isAuthenticated).to.be.true;
      expect(coinbaseProvider.apiKey).to.equal('test-api-key');
      expect(coinbaseProvider.initialized).to.be.true;
    });
    
    it('should handle authentication failure', async function() {
      // Mock API time endpoint with error response
      nock('https://api.exchange.coinbase.com')
        .get('/time')
        .reply(401, { message: 'Invalid API key' });
      
      const options = {
        apiKey: 'invalid-api-key',
        apiSecret: 'invalid-api-secret',
        apiPassphrase: 'invalid-passphrase'
      };
      
      const result = await coinbaseProvider.initialize(options);
      
      expect(result).to.be.true; // Initialization still succeeds
      expect(coinbaseProvider.isAuthenticated).to.be.false; // But authentication fails
      expect(coinbaseProvider.initialized).to.be.true;
    });
  });
  
  describe('Market Data', function() {
    beforeEach(async function() {
      // Initialize the provider before each test
      await coinbaseProvider.initialize();
    });
    
    it('should get market data for a symbol', async function() {
      // Mock API responses
      nock('https://api.exchange.coinbase.com')
        .get('/products/BTC-USD/ticker')
        .reply(200, {
          trade_id: 12345,
          price: '50000.00',
          size: '0.01',
          time: '2023-07-04T12:00:00.000Z',
          bid: '49900.00',
          ask: '50100.00',
          volume: '1000.00'
        });
      
      nock('https://api.exchange.coinbase.com')
        .get('/products/BTC-USD/stats')
        .reply(200, {
          open: '48000.00',
          high: '51000.00',
          low: '47500.00',
          volume: '2500.00',
          last: '50000.00',
          volume_30day: '75000.00'
        });
      
      const marketData = await coinbaseProvider.getMarketData(['BTC-USD']);
      
      expect(marketData).to.be.an('array');
      expect(marketData).to.have.lengthOf(1);
      
      const data = marketData[0];
      expect(data.provider).to.equal('coinbase');
      expect(data.symbol).to.equal('BTC-USD');
      expect(data.prices[0]).to.equal(50000);
      expect(data.bid).to.equal(49900);
      expect(data.ask).to.equal(50100);
      expect(data.volume).to.equal(2500);
      expect(data.high).to.equal(51000);
      expect(data.low).to.equal(47500);
      expect(data.open).to.equal(48000);
      
      // Calculated change and percent
      expect(data.change).to.equal(2000); // 50000 - 48000
      expect(data.changePercent).to.be.closeTo(4.17, 0.01); // (50000 - 48000) / 48000 * 100
    });
    
    it('should handle errors when getting market data', async function() {
      // Mock failed API response
      nock('https://api.exchange.coinbase.com')
        .get('/products/BTC-USD/ticker')
        .reply(500, { message: 'Internal server error' });
      
      // Even with an error, it should return an empty array rather than throwing
      const marketData = await coinbaseProvider.getMarketData(['BTC-USD']);
      
      expect(marketData).to.be.an('array');
      expect(marketData).to.have.lengthOf(0);
    });
  });
  
  describe('Historical Data', function() {
    beforeEach(async function() {
      // Initialize the provider before each test
      await coinbaseProvider.initialize();
    });
    
    it('should get historical data with default parameters', async function() {
      // Sample candle data format [timestamp, low, high, open, close, volume]
      const sampleCandles = [
        [1688472000, 48000, 49000, 48500, 49000, 100],
        [1688468400, 47800, 48600, 48000, 48500, 150],
        [1688464800, 47500, 48200, 47600, 48000, 200]
      ];
      
      nock('https://api.exchange.coinbase.com')
        .get('/products/BTC-USD/candles')
        .query({ granularity: 3600 }) // Default 1 hour
        .reply(200, sampleCandles);
      
      const historicalData = await coinbaseProvider.getHistoricalData('BTC-USD');
      
      expect(historicalData).to.be.an('array');
      expect(historicalData).to.have.lengthOf(3);
      
      const firstCandle = historicalData[0];
      expect(firstCandle.provider).to.equal('coinbase');
      expect(firstCandle.symbol).to.equal('BTC-USD');
      expect(firstCandle.timestamp).to.equal(1688472000000); // Converted to ms
      expect(firstCandle.low).to.equal(48000);
      expect(firstCandle.high).to.equal(49000);
      expect(firstCandle.open).to.equal(48500);
      expect(firstCandle.close).to.equal(49000);
      expect(firstCandle.volume).to.equal(100);
    });
    
    it('should get historical data with custom parameters', async function() {
      // Sample candle data
      const sampleCandles = [
        [1688400000, 48000, 49000, 48500, 49000, 100],
        [1688313600, 47800, 48600, 48000, 48500, 150]
      ];
      
      const options = {
        granularity: 86400, // 1 day in seconds
        startTime: 1688313600000, // July 3, 2023
        endTime: 1688400000000 // July 4, 2023
      };
      
      // Convert millisecond timestamps to ISO strings as Coinbase API expects them
      const startISO = new Date(options.startTime).toISOString();
      const endISO = new Date(options.endTime).toISOString();
      
      nock('https://api.exchange.coinbase.com')
        .get('/products/BTC-USD/candles')
        .query({
          granularity: options.granularity,
          start: startISO,
          end: endISO
        })
        .reply(200, sampleCandles);
      
      const historicalData = await coinbaseProvider.getHistoricalData('BTC-USD', options);
      
      expect(historicalData).to.be.an('array');
      expect(historicalData).to.have.lengthOf(2);
      expect(historicalData[0].timestamp).to.equal(1688400000000);
      expect(historicalData[0].open).to.equal(48500);
    });
  });
  
  describe('WebSocket Functionality', function() {
    let mockServer;
    let socketUrl = 'ws://localhost:8080';
    
    beforeEach(async function() {
      // Create a mock WebSocket server
      mockServer = new WebSocket.Server({ port: 8080 });
      
      // Override the WebSocket URL to point to our mock server
      coinbaseProvider.wsUrl = socketUrl;
      
      // Override the private connect method
      sandbox.stub(coinbaseProvider, '_connectWebSocket').callsFake(async function() {
        this.wsConnection = new WebSocket(socketUrl);
        
        return new Promise((resolve) => {
          this.wsConnection.on('open', () => {
            this.connected = true;
            resolve(true);
          });
          
          this.wsConnection.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              this._handleWebSocketMessage(message);
            } catch (error) {
              console.error('Error processing mock WebSocket message:', error);
            }
          });
        });
      });
      
      // Initialize the provider
      await coinbaseProvider.initialize();
    });
    
    afterEach(function(done) {
      // Close the mock server
      if (mockServer) {
        mockServer.close(() => {
          done();
        });
      } else {
        done();
      }
      
      // Clean up
      if (coinbaseProvider.wsConnection) {
        coinbaseProvider.wsConnection.terminate();
        coinbaseProvider.wsConnection = null;
        coinbaseProvider.connected = false;
      }
    });
    
    it('should subscribe to market data', async function() {
      // Create a spy for the callback
      const callbackSpy = sinon.spy();
      
      // Handle the subscription message on the mock server
      mockServer.on('connection', (socket) => {
        socket.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'subscribe') {
            // Send back a subscription confirmation
            socket.send(JSON.stringify({
              type: 'subscriptions',
              channels: [
                {
                  name: message.channels[0],
                  product_ids: message.product_ids
                }
              ]
            }));
            
            // Send a sample ticker message after subscription
            setTimeout(() => {
              socket.send(JSON.stringify({
                type: 'ticker',
                product_id: 'BTC-USD',
                price: '50000.00',
                best_bid: '49900.00',
                best_ask: '50100.00',
                volume_24h: '5000.00',
                time: '2023-07-04T12:00:00.000Z'
              }));
            }, 100);
          }
        });
      });
      
      // Call the subscribe method
      const result = await coinbaseProvider.subscribeToMarketData(['BTC-USD'], 'ticker', callbackSpy);
      
      expect(result).to.be.true;
      
      // Wait for the ticker message
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify the callback was called with the normalized message
      expect(callbackSpy.calledOnce).to.be.true;
      
      const callArgs = callbackSpy.firstCall.args[0];
      expect(callArgs.provider).to.equal('coinbase');
      expect(callArgs.symbol).to.equal('BTC-USD');
      expect(callArgs.price).to.equal(50000);
    });
    
    it('should unsubscribe from market data', async function() {
      // Set up a mock subscription
      coinbaseProvider.subscriptions.set('ticker-BTC-USD', {
        symbols: ['BTC-USD'],
        channel: 'ticker',
        callback: () => {}
      });
      
      // Handle the unsubscribe message
      mockServer.on('connection', (socket) => {
        socket.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'unsubscribe') {
            // Send back confirmation
            socket.send(JSON.stringify({
              type: 'subscriptions',
              channels: []
            }));
          }
        });
      });
      
      // Call the unsubscribe method
      const result = await coinbaseProvider.unsubscribeFromMarketData(['BTC-USD'], 'ticker');
      
      expect(result).to.be.true;
      
      // Verify the subscription was removed
      expect(coinbaseProvider.subscriptions.has('ticker-BTC-USD')).to.be.false;
    });
  });
  
  describe('Disconnect', function() {
    it('should disconnect and clean up resources', async function() {
      // Create mock subscriptions
      coinbaseProvider.subscriptions.set('ticker-BTC-USD', {
        symbols: ['BTC-USD'],
        channel: 'ticker',
        callback: () => {}
      });
      
      // Stub the unsubscribe method
      const unsubscribeSpy = sandbox.stub(coinbaseProvider, 'unsubscribeFromMarketData').resolves(true);
      
      // Stub the websocket
      coinbaseProvider.wsConnection = {
        terminate: sandbox.spy()
      };
      coinbaseProvider.connected = true;
      
      // Call disconnect
      const result = await coinbaseProvider.disconnect();
      
      expect(result).to.be.true;
      expect(unsubscribeSpy.calledOnce).to.be.true;
      expect(coinbaseProvider.wsConnection.terminate.calledOnce).to.be.true;
      expect(coinbaseProvider.subscriptions.size).to.equal(0);
      expect(coinbaseProvider.connected).to.be.false;
    });
  });
  
  describe('Data Normalization', function() {
    it('should normalize market data', function() {
      const rawData = {
        symbol: 'ETH-USD',
        price: 3000,
        bid: 2990,
        ask: 3010,
        volume: 5000,
        high24h: 3100,
        low24h: 2900,
        open24h: 2950,
        timestamp: 1688472000000
      };
      
      const normalized = coinbaseProvider._normalizeMarketData(rawData);
      
      expect(normalized.provider).to.equal('coinbase');
      expect(normalized.symbol).to.equal('ETH-USD');
      expect(normalized.prices[0]).to.equal(3000);
      expect(normalized.bid).to.equal(2990);
      expect(normalized.ask).to.equal(3010);
      expect(normalized.volume).to.equal(5000);
      expect(normalized.high).to.equal(3100);
      expect(normalized.low).to.equal(2900);
      expect(normalized.open).to.equal(2950);
      expect(normalized.change).to.equal(50); // 3000 - 2950
      expect(normalized.changePercent).to.be.closeTo(1.69, 0.01); // (3000 - 2950) / 2950 * 100
    });
    
    it('should normalize historical data', function() {
      const rawCandle = {
        symbol: 'ETH-USD',
        timestamp: 1688472000000,
        low: 2900,
        high: 3100,
        open: 2950,
        close: 3000,
        volume: 5000
      };
      
      const normalized = coinbaseProvider._normalizeHistoricalData(rawCandle);
      
      expect(normalized.provider).to.equal('coinbase');
      expect(normalized.symbol).to.equal('ETH-USD');
      expect(normalized.timestamp).to.equal(1688472000000);
      expect(normalized.low).to.equal(2900);
      expect(normalized.high).to.equal(3100);
      expect(normalized.open).to.equal(2950);
      expect(normalized.close).to.equal(3000);
      expect(normalized.volume).to.equal(5000);
    });
    
    it('should normalize WebSocket ticker messages', function() {
      const message = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '50000.00',
        best_bid: '49900.00',
        best_ask: '50100.00',
        volume_24h: '5000.00',
        time: '2023-07-04T12:00:00.000Z'
      };
      
      const normalized = coinbaseProvider._normalizeWebSocketMessage(message);
      
      expect(normalized.provider).to.equal('coinbase');
      expect(normalized.symbol).to.equal('BTC-USD');
      expect(normalized.type).to.equal('ticker');
      expect(normalized.price).to.equal(50000);
      expect(normalized.bid).to.equal(49900);
      expect(normalized.ask).to.equal(50100);
      expect(normalized.volume).to.equal(5000);
      expect(normalized.timestamp).to.equal(new Date('2023-07-04T12:00:00.000Z').getTime());
    });
    
    it('should normalize WebSocket match messages', function() {
      const message = {
        type: 'match',
        product_id: 'BTC-USD',
        price: '50000.00',
        size: '0.1',
        side: 'buy',
        time: '2023-07-04T12:00:00.000Z'
      };
      
      const normalized = coinbaseProvider._normalizeWebSocketMessage(message);
      
      expect(normalized.provider).to.equal('coinbase');
      expect(normalized.symbol).to.equal('BTC-USD');
      expect(normalized.type).to.equal('match');
      expect(normalized.price).to.equal(50000);
      expect(normalized.size).to.equal(0.1);
      expect(normalized.side).to.equal('buy');
      expect(normalized.timestamp).to.equal(new Date('2023-07-04T12:00:00.000Z').getTime());
    });
  });
}); 
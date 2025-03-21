# Perseus Drive

<div align="center">
  <img src="docs/assets/perseus-logo.png" alt="Perseus Drive" width="800">
  <h3>AI-driven investment analysis and decision-making system</h3>
</div>

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](test/debug-suite.js)
[![Documentation](https://img.shields.io/badge/docs-latest-blue.svg)](docs/system-architecture.md)
[![Last Commit](https://img.shields.io/badge/last%20commit-March%202025-orange.svg)]()

## 📋 Overview

Perseus Drive is a sophisticated AI-driven investment analysis and decision-making system that employs a recursive agent architecture for market analysis, strategy development, risk management, and trading signal generation. The system leverages specialized AI agents that collaborate to process market data, identify opportunities, evaluate risk, and generate actionable insights.

## 🚀 Project Status

**Current Release: v0.2.0 (Phase 2)**

Perseus Drive development is proceeding according to our phased roadmap:

- **Phase 1: Core Infrastructure** ✅ COMPLETE
  - Agent-based architecture implementation
  - Knowledge base and messenger system
  - Logging and debugging infrastructure
  - Data processing agent
  - Strategy agent (base implementation)
  - Prompt engineering agent

- **Phase 2: Trading System Development** 🔄 IN PROGRESS
  - External data provider architecture ✅ COMPLETE
  - Coinbase data provider connector ✅ COMPLETE
  - Risk Management Agent ✅ COMPLETE
  - Binance data provider connector 🔄 IN PROGRESS
  - Strategy agent enhancements 🔄 IN PROGRESS
  - Integration testing and performance optimization 🔄 IN PROGRESS

All implemented components have passed comprehensive validation through the debug suite and dedicated unit tests.

A detailed progress report for Phase 2 is available in [docs/phase2-progress.md](docs/phase2-progress.md).

## 🏗️ Architecture

Perseus Drive employs a recursive agent architecture where specialized AI agents collaborate to perform complex trading functions. The system consists of:

1. **Core Agents**
   - Prompt Engineering Agent
   - Strategy Agent
   - Data Processing Agent
   - Risk Management Agent

2. **Core Components**
   - Knowledge Base
   - Agent Messenger
   - External Data Provider System

For a detailed architecture overview, see [System Architecture Documentation](docs/system-architecture.md).

<div align="center">
  <img src="docs/assets/system-architecture-diagram.png" alt="Perseus Drive Architecture" width="800">
</div>

## 📂 Project Structure

```
perseus-drive/
├── agents/                 # Agent implementations
│   ├── prompt-engineering-agent.js
│   ├── strategy-agent.js
│   ├── data-processing-agent.js
│   ├── risk-management-agent.js
│   └── base-agent.js
├── core/                   # Core system architecture
│   ├── index.js
│   └── config.js
├── providers/              # External data provider connectors
│   ├── base-provider.js
│   ├── provider-manager.js
│   ├── coinbase-provider.js
│   └── binance-provider.js
├── tools/                  # System tools for agent communication
│   ├── agent-messenger.js
│   ├── knowledge-base.js
│   └── logger.js
├── test/                   # Test suites 
│   ├── debug-suite.js
│   ├── strategy-agent.test.js
│   ├── coinbase-provider.test.js
│   └── agent-messenger.test.js
└── docs/                   # Documentation
    ├── system-architecture.md
    ├── external-data-providers.md
    ├── risk-management-agent.md
    ├── phase2-progress.md
    └── next-steps.md
```

## ✨ Features

- **Multi-Agent Architecture**: Specialized agents work together to perform complex trading functions
- **Knowledge Sharing**: Centralized knowledge base for persistent data storage
- **Trading Strategies**: Multiple implemented strategies (Mean Reversion, Breakout)
- **Performance Tracking**: Comprehensive metrics including win rate, profit factor, and drawdown
- **Signal Generation**: Automated trading signal generation from market data
- **Messaging System**: Robust inter-agent communication protocol
- **External Data Integration**: Modular connectors to cryptocurrency exchanges with standardized interface
- **Risk Management**: Position sizing and portfolio monitoring based on configurable risk parameters

## 🔄 Recent Updates

- **2025-03-22**: Completed code review and validation of all Phase 2 components
- **2025-03-21**: Implemented Risk Management Agent with position sizing and risk evaluation
- **2025-03-20**: Completed Coinbase Provider implementation with WebSocket integration
- **2025-03-18**: Implemented External Data Provider architecture
- **2025-03-15**: Finalized Phase 1 components and began Phase 2 development

For detailed roadmap information, see [docs/next-steps.md](docs/next-steps.md).

## 🔧 Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (for persistent storage)

### Installation
1. Clone the repository
```bash
git clone [repository-url]
cd perseus-drive
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with required configuration including API keys
```

### Running Tests
```bash
node test/debug-suite.js
```

## 🛣️ Development Roadmap

### Completed (Phase 1)
- Core agent system architecture 
- Inter-agent communication protocol
- Knowledge base implementation
- Strategy Agent with signal generation
- Data Processing Agent with market data handling
- Prompt Engineering Agent with template management
- System integration and validation

### In Progress (Phase 2)
- ✅ External data provider architecture
- ✅ Coinbase data provider connector
- ✅ Risk Management Agent
- 🔄 Binance data provider connector
- 🔄 Advanced multi-timeframe strategies
- 🔄 Strategy optimization framework

### Upcoming (Phase 3)
- Trade Execution Agent development
- Integration with exchange order management
- Portfolio balancing algorithms
- Backtesting visualization tools
- Strategy performance dashboard

## 📚 Documentation
See the `/docs` directory for detailed documentation:
- [System Architecture](docs/system-architecture.md)
- [External Data Providers](docs/external-data-providers.md)
- [Risk Management Agent](docs/risk-management-agent.md)
- [Phase 2 Progress Report](docs/phase2-progress.md)
- [Next Steps](docs/next-steps.md)

## 🤝 Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📜 License
This project is licensed under the terms of the proprietary license - see the [LICENSE](LICENSE) file for details.

## Proprietary Notice
This project is proprietary and not intended for public use or distribution. All rights reserved. 
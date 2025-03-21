# Perseus Drive

<div align="center">
  <img src="docs/assets/perseus-logo.png" alt="Perseus Drive" width="800">
  <h3>AI-driven investment analysis and decision-making system</h3>
</div>

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](test/debug-suite.js)

## Project Overview
Perseus Drive is a private AI-driven investment analysis and decision-making system that employs a recursive agent design for market analysis, strategy development, and trading signal generation.

## Current Status
The system has reached a significant milestone with the successful validation of the core agent ecosystem. All essential components are now fully functional:

- ✅ Core agent infrastructure fully implemented
- ✅ Strategy Agent functioning with signal generation and performance tracking
- ✅ Data Processing Agent operational for market data analysis
- ✅ Prompt Engineering Agent managing prompt optimization
- ✅ Knowledge Base providing persistent storage
- ✅ Agent Messenger handling inter-agent communication

## Project Structure
```
perseus-drive/
├── agents/                 # Agent implementations
│   ├── prompt-engineering-agent.js
│   ├── strategy-agent.js
│   ├── data-processing-agent.js
│   └── base-agent.js
├── core/                   # Core system architecture
│   ├── index.js
│   └── config.js
├── tools/                  # MCP tools for agent communication
│   ├── agent-messenger.js
│   ├── knowledge-base.js
│   └── logger.js
├── test/                   # Test suites 
│   ├── debug-suite.js
│   ├── strategy-agent.test.js
│   └── agent-messenger.test.js
└── docs/                   # Documentation
    ├── ARCHITECTURE.md
    ├── ROADMAP.md
    └── system_diagram.md
```

## Features
- **Multi-Agent Architecture**: Specialized agents work together to perform complex trading functions
- **Knowledge Sharing**: Centralized knowledge base for persistent data storage
- **Trading Strategies**: Multiple implemented strategies (Mean Reversion, Breakout)
- **Performance Tracking**: Comprehensive metrics including win rate, profit factor, and drawdown
- **Signal Generation**: Automated trading signal generation from market data
- **Messaging System**: Robust inter-agent communication protocol

## Recent Updates
- Fixed Strategy Agent signal generation for uptrend and downtrend data
- Implemented comprehensive performance tracking with key metrics
- Resolved messaging timeout issues between agents
- Successfully validated the full system integration with all tests passing

## Setup

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
# Edit .env with required configuration
```

### Running Tests
```bash
node test/debug-suite.js
```

## Development Roadmap

### Completed
- Core agent system architecture 
- Inter-agent communication protocol
- Knowledge base implementation
- Strategy Agent with signal generation
- Data Processing Agent with market data handling
- Prompt Engineering Agent with template management
- System integration and validation

### In Progress
- External data provider integration
- Advanced multi-timeframe strategies
- Strategy optimization framework

### Upcoming
- Risk Management Agent implementation
- Execution Agent development
- Portfolio management capabilities
- Backtesting visualization tools

## Documentation
See the `/docs` directory for detailed documentation:
- `ARCHITECTURE.md`: Technical architecture design
- `ROADMAP.md`: Development roadmap and milestones
- `system_diagram.md`: System component diagrams and data flow

## Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is proprietary software. See the [LICENSE](LICENSE) file for details.

## Proprietary Notice
This project is proprietary and not intended for public use or distribution. All rights reserved. 
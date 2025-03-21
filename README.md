# Perseus Drive

Private AI-driven investment analysis and decision-making system.

## Overview
Personal project for automated investment analysis and decision support using advanced AI techniques.

## Status
🚧 Under active development - Private repository

## Note
This is a private, proprietary project. Not intended for public use or contributions.

## Project Structure
- `/agents` - Specialized AI agents for different trading functions
- `/core` - Core system architecture and common utilities
- `/docs` - Documentation and system design
- `/tools` - Custom MCP (Multi-Agent Communication Protocol) tools
- `/test` - Test scripts and validation tools

## Current Features
- **Multi-Agent Communication Framework**: Event-driven messaging system for agent coordination
- **Knowledge Base**: Versioned repository for shared agent knowledge
- **Prompt Engineering Agent**: Central agent that manages prompts for all other agents
- **Data Processing Agent**: Collects and processes market data for strategy development
- **Base Agent Class**: Foundation for all specialized agent implementations

## Setup Instructions
1. Clone this repository
```bash
git clone [repository-url] perseus-drive
cd perseus-drive
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Run tests
```bash
node test/simple-test.js
```

5. Start the system
```bash
npm run dev
```

## Development Roadmap

### Phase 1: Recursive AI Agent System (Current)
- ✅ Design core architecture
- ✅ Implement Prompt Engineering Agent
- ✅ Build Agent Messenger tool
- ✅ Create Knowledge Base
- ✅ Implement Base Agent class
- ✅ Develop Data Processing Agent
- ⬜ Implement Strategy Agent
- ⬜ Implement Risk Management Agent
- ⬜ Implement Execution Agent

### Phase 2: Trading Strategy Implementation
- ⬜ Market data integration
- ⬜ Technical analysis framework
- ⬜ Strategy development and backtesting
- ⬜ Signal generation

### Phase 3: Backtesting and Optimization
- ⬜ Comprehensive backtesting engine
- ⬜ Performance evaluation metrics
- ⬜ Strategy optimization

### Phase 4: Deployment and Monitoring
- ⬜ Production deployment
- ⬜ Performance tracking
- ⬜ Continuous improvement

## Documentation
See the `/docs` directory for detailed documentation:
- `ARCHITECTURE.md` - System design and component relationships
- `ROADMAP.md` - Development milestones and timelines
- `QUICK_START.md` - Setup and development guide
- `system_diagram.md` - Visual representation of system architecture

## License
Proprietary and confidential 
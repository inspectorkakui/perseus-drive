# Perseus Drive Quick Start Guide

This guide provides a rapid onboarding for developers to get started with the Perseus Drive codebase.

## Environment Setup

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)
- Git
- MongoDB (for persistent storage, optional for development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/perseus-drive.git
cd perseus-drive
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit the `.env` file with your specific configuration:
- Add your API keys if needed
- Configure database settings if using MongoDB
- Adjust any other environment-specific settings

## Project Structure

### Key Directories
- `/agents` - Contains all agent implementations
- `/core` - Core system architecture 
- `/tools` - MCP (Multi-Channel Protocol) tools for agent communication
- `/test` - Test suites and testing utilities
- `/docs` - Documentation files

### Key Files
- `index.js` - Main entry point for the application
- `.env` - Environment configuration (not in version control)
- `package.json` - Project metadata and dependencies
- `test/debug-suite.js` - Main test suite for system validation

## Running the System

### Development Mode
```bash
npm run dev
```
This runs the application with hot reloading using nodemon.

### Production Mode
```bash
npm start
```

### Running Tests
```bash
node test/debug-suite.js
```
This runs the comprehensive debug suite that validates all components.

## Agent Overview

The system consists of several specialized agents:

### Strategy Agent
- Located in `agents/strategy-agent.js`
- Responsible for generating trading signals
- Implements various trading strategies
- Tracks performance metrics

### Data Processing Agent
- Located in `agents/data-processing-agent.js`
- Handles market data analysis
- Calculates technical indicators
- Processes data for the Strategy Agent

### Prompt Engineering Agent
- Located in `agents/prompt-engineering-agent.js`
- Manages prompts for all agents
- Optimizes prompts for specific tasks
- Provides templating functionality

## Core Tools

### Knowledge Base
- Located in `tools/knowledge-base.js`
- Provides persistent storage for all agents
- Supports versioning and categorization

### Agent Messenger
- Located in `tools/agent-messenger.js`
- Facilitates inter-agent communication
- Handles message queues and routing

## Development Workflow

1. **Fork the repository** (if not a core contributor)
2. **Create a new branch** for your feature or fix
3. **Implement changes** following the code style of the project
4. **Run tests** to ensure everything works
5. **Submit a pull request** with a clear description of changes

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more detailed contribution guidelines.

## Common Tasks

### Adding a New Strategy
1. Add your strategy to the `strategies` object in `agents/strategy-agent.js`
2. Implement the strategy logic in the `executeStrategy` method
3. Update the performance tracking for your strategy
4. Add tests for the new strategy in `test/strategy-agent.test.js`

### Adding a New Agent
1. Create a new file in the `agents` directory
2. Extend the `BaseAgent` class from `core/base-agent.js`
3. Implement required methods (initialize, handleMessage)
4. Register the agent in the main initialization flow
5. Add tests for the new agent

## Troubleshooting

### Common Issues

1. **Agent messaging timeout**
   - Check that all agents are properly registered
   - Ensure the message format is correct
   - Verify that the receiving agent is handling the message type

2. **Knowledge Base errors**
   - Check that categories follow the correct format
   - Ensure you're using the correct version parameter
   - Verify that the data structure is valid JSON

3. **Strategy generation failure**
   - Check the market data format
   - Ensure the strategy implementation is correct
   - Verify that performance tracking is properly initialized

## Getting Help

If you need assistance, please:

1. Check the existing documentation
2. Review open and closed issues on GitHub
3. Create a new issue if needed
4. Contact the core development team 
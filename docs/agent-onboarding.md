# Perseus Drive Agent Onboarding Guide

## Introduction

Welcome to the Perseus Drive project! This document serves as a comprehensive guide for new developers and AI agents joining the project. It provides an overview of the system architecture, component interactions, code conventions, and development workflow.

## System Overview

Perseus Drive is an advanced trading system built with a recursive multi-agent architecture. The system is designed to handle the entire trading lifecycle, from market data processing to trade execution, through specialized agents that communicate via a message-passing infrastructure.

### Key Features

- **Recursive Agent Architecture**: Self-improving system through prompt reinjection
- **Multi-Strategy Trading**: Multiple trading strategies with performance tracking
- **Risk Management**: Comprehensive risk evaluation and position sizing
- **Exchange Integration**: Connectivity to cryptocurrency exchanges
- **Performance Monitoring**: Tracking and analysis of trading performance

## Component Architecture

### Core Agents

1. **Prompt Engineering Agent** (`agents/prompt-engineering-agent.js`)
   - Generates and refines prompts for all other agents
   - Maintains prompt versioning and optimization
   - Enables the recursive nature of the system

2. **Strategy Agent** (`agents/strategy-agent.js`)
   - Analyzes market data to generate trading signals
   - Implements multiple strategy algorithms
   - Tracks performance of different strategies

3. **Risk Management Agent** (`agents/risk-management-agent.js`)
   - Validates trading signals based on risk parameters
   - Implements position sizing algorithms
   - Monitors portfolio risk metrics

4. **Data Processing Agent** (`agents/data-processing-agent.js`)
   - Cleans and normalizes market data
   - Calculates technical indicators
   - Performs feature engineering for strategy input

5. **Execution Agent** (`agents/execution-agent.js`)
   - Optimizes order execution
   - Manages connections to exchanges
   - Implements different execution strategies (market, limit, smart)

### Core Infrastructure

1. **Knowledge Base** (`tools/knowledge-base.js`)
   - Central repository for system knowledge
   - Implements versioning and data management
   - Provides querying capabilities

2. **Agent Messenger** (`tools/agent-messenger.js`)
   - Facilitates inter-agent communication
   - Implements publish-subscribe pattern
   - Manages message routing and delivery

3. **Provider Manager** (`providers/provider-manager.js`)
   - Manages connections to external data sources
   - Handles provider registration and failover
   - Normalizes data from different providers

## Component Interactions

### Data Flow

1. External market data enters through Provider Manager
2. Data Processing Agent normalizes and enriches the data
3. Strategy Agent analyzes the data to generate trading signals
4. Risk Management Agent validates signals based on risk parameters
5. Execution Agent executes approved signals as trades
6. Performance metrics are tracked and fed back to the Prompt Engineering Agent
7. Prompt Engineering Agent refines prompts based on performance data

### Message Flow

All inter-agent communication follows a standardized message format:

```json
{
  "id": "unique-message-id",
  "type": "message_type",
  "source": "sender_agent_id",
  "target": "recipient_agent_id",
  "content": { /* message payload */ },
  "timestamp": "ISO-8601 timestamp"
}
```

## Code Conventions

### File Structure

- Each agent has its own file in the `agents/` directory
- Common utilities are placed in the `tools/` directory
- Exchange connectors are in the `providers/` directory
- Tests are located in the `test/` directory

### Coding Standards

- Use ES6+ JavaScript features
- Each agent extends EventEmitter for event-based communication
- Comprehensive error handling and logging
- JSDoc-style comments for functions and classes
- Async/await pattern for asynchronous operations

### Testing Approach

- Unit tests for individual components
- Integration tests for agent interactions
- End-to-end tests for the complete trading flow
- Run tests using `npm test` or specific test suites with `npm run test:integration`

## Development Workflow

### Setting Up Your Environment

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/perseus-drive.git
   cd perseus-drive
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

### Development Process

1. **Understanding the Codebase**
   - Start by exploring the agent implementations
   - Review the system architecture document
   - Run the integration tests to see the system in action

2. **Making Changes**
   - Branch for new features: `git checkout -b feature/your-feature-name`
   - Branch for bugfixes: `git checkout -b fix/issue-description`
   - Follow the existing code patterns and conventions

3. **Testing Your Changes**
   - Write unit tests for new functionality
   - Update integration tests as needed
   - Verify all tests pass with `npm test`

4. **Submitting Changes**
   - Ensure code is well-documented
   - Update relevant documentation
   - Create a pull request with a clear description

## Working with the Recursive Architecture

The recursive architecture is a key innovation in Perseus Drive. Understanding how to work with it effectively is crucial:

1. **Prompt Engineering**
   - Prompts are versioned and stored in the Knowledge Base
   - Each agent has specific prompt templates
   - The Prompt Engineering Agent optimizes prompts based on performance

2. **Knowledge Sharing**
   - Use the Knowledge Base for sharing data between agents
   - Store structured data with appropriate categories and keys
   - Retrieve and update knowledge as needed

3. **Agent Communication**
   - Use the Agent Messenger for inter-agent communication
   - Follow the standard message format
   - Subscribe to relevant message types

## Monitoring and Debugging

1. **Logging**
   - Each component uses Winston for logging
   - Logs are stored in the `logs/` directory
   - Log levels can be configured in the environment

2. **Performance Monitoring**
   - Trading performance is tracked by the Performance Monitor
   - System health is monitored through logs and metrics
   - Use the debug tools for detailed introspection

3. **Common Issues**
   - Check connection status for external providers
   - Verify message routing between agents
   - Ensure Knowledge Base is accessible

## Additional Resources

- [System Architecture](system-architecture.md) - Detailed system architecture documentation
- [External Data Providers](external-data-providers.md) - Information on supported data providers
- [Risk Management](risk-management-agent.md) - Details on risk management algorithms
- [Quick Start Guide](QUICK_START.md) - Quick start guide for running the system

## Getting Help

If you encounter issues or have questions, please:

1. Check the existing documentation
2. Review related test cases
3. Look for similar issues in the issue tracker
4. Reach out to the core development team

Welcome aboard and happy coding! 
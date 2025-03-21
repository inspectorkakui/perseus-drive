# Perseus Drive Architecture

## System Overview
Perseus Drive employs a recursive AI agent system architecture that mimics a hedge fund structure. The system is designed around specialized agents that each handle distinct aspects of the trading process, communicating through a custom Multi-Agent Communication Protocol (MCP).

## Agent Ecosystem

### Core Agents

1. **Prompt Engineering Agent**
   - Optimizes and manages prompts for all other agents
   - Evolves prompts based on system performance and feedback
   - Maintains prompt library and versioning

2. **Strategy Agent**
   - Develops trading strategies
   - Processes market data
   - Generates trading signals

3. **Execution Agent**
   - Converts trading signals to executable orders
   - Optimizes order execution
   - Manages transaction costs

4. **Risk Management Agent**
   - Monitors portfolio risk
   - Sets position limits
   - Provides risk mitigation recommendations

5. **Data Processing Agent**
   - Collects and cleans market data
   - Performs feature engineering
   - Manages data storage and retrieval

## Communication Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Data Processing│◄─────┤  Strategy Agent │◄─────┤ Execution Agent │
│     Agent       │      │                 │      │                 │
│                 │      │                 │      │                 │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│Risk Management  │◄─────┤Prompt Engineering
│    Agent        │      │     Agent       │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
```

## Prompt Re-injection System
The system utilizes prompt re-injection to enable knowledge transfer between agents:

1. Agent A produces output
2. Prompt Engineering Agent processes and optimizes the output
3. Output is injected into Agent B's prompt
4. Agent B processes with the enhanced context
5. Knowledge continually circulates and evolves throughout the system

## Custom MCP Tools
The following custom tools will be developed for agent communication:

1. **Prompt Manager** - Handles prompt storage, retrieval, and versioning
2. **Knowledge Base** - Central repository for shared agent knowledge
3. **Agent Messenger** - Protocol for direct agent-to-agent communication
4. **Performance Monitor** - Tracks and evaluates agent performance metrics
5. **Market Data Interface** - Standardized API for accessing market data 
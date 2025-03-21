# Perseus Drive Architecture

## System Overview
Perseus Drive employs a recursive AI agent system architecture that mimics a hedge fund structure. The system is designed around specialized agents that each handle distinct aspects of the trading process, communicating through a custom Multi-Agent Communication Protocol (MCP).

## Agent Ecosystem

### Core Agents

1. **Prompt Engineering Agent** ✅
   - **Status**: Fully implemented and tested
   - **Function**: Optimizes and manages prompts for all other agents
   - **Features**:
     - Prompt template management
     - Context optimization
     - Prompt versioning

2. **Strategy Agent** ✅
   - **Status**: Fully implemented and tested
   - **Function**: Develops trading strategies and generates signals
   - **Features**:
     - Multiple strategy implementations (Mean Reversion, Breakout, etc.)
     - Performance tracking with metrics (win rate, profit factor)
     - Strategy registration framework
     - Signal generation for different market conditions

3. **Execution Agent** 🔄
   - **Status**: Planned for future implementation
   - **Function**: Converts trading signals to executable orders
   - **Integration Points**: Will connect with Strategy Agent and Broker

4. **Risk Management Agent** 🔄
   - **Status**: Planned for future implementation
   - **Function**: Monitors portfolio risk and provides risk controls
   - **Integration Points**: Will connect with Strategy and Execution Agents

5. **Data Processing Agent** ✅
   - **Status**: Fully implemented and tested
   - **Function**: Collects, normalizes and processes market data
   - **Features**:
     - Data cleaning and normalization
     - Feature engineering capabilities
     - Technical indicator calculation

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

## Current Implementation Status

### Implemented Components
- ✅ **Base Agent Class**: Foundation for all agent implementations
- ✅ **Agent Messenger**: Fully tested message routing system
- ✅ **Knowledge Base**: Persistent storage with versioning
- ✅ **Logger**: Comprehensive logging system
- ✅ **Prompt Engineering Agent**: Complete with template management
- ✅ **Data Processing Agent**: Complete with data normalization
- ✅ **Strategy Agent**: Complete with signal generation and performance tracking

### Fixed Issues in Strategy Agent
- ✅ **Signal Generation**: Now correctly generates signals for both uptrend and downtrend data
- ✅ **Performance Tracking**: Properly calculates and stores metrics like win rate and profit factor
- ✅ **Messaging**: Successfully sends and receives messages with other agents

### Pending Components
- 🔄 **Execution Agent**: Not yet implemented
- 🔄 **Risk Management Agent**: Not yet implemented
- 🔄 **External Data Provider Integration**: In progress
- 🔄 **Advanced Strategy Optimization**: In progress

## Prompt Re-injection System
The system utilizes prompt re-injection to enable knowledge transfer between agents:

1. Agent A produces output
2. Prompt Engineering Agent processes and optimizes the output
3. Output is injected into Agent B's prompt
4. Agent B processes with the enhanced context
5. Knowledge continually circulates and evolves throughout the system

## MCP Tools Integration

1. **Prompt Manager** ✅
   - **Status**: Implemented in Prompt Engineering Agent
   - **Function**: Manages prompt templates and versioning

2. **Knowledge Base** ✅
   - **Status**: Fully implemented and tested
   - **Function**: Central repository for shared knowledge
   - **Features**: Category-based storage, versioning

3. **Agent Messenger** ✅
   - **Status**: Fully implemented and tested
   - **Function**: Routes messages between agents
   - **Features**: Message queuing, agent registration

4. **Performance Monitor** ✅
   - **Status**: Implemented in Strategy Agent
   - **Function**: Tracks strategy performance metrics
   - **Features**: Win rate, profit factor, drawdown calculation

5. **Market Data Interface** ✅
   - **Status**: Basic implementation complete
   - **Function**: Standardized access to market data
   - **Features**: Data normalization, technical indicators 
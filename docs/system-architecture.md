# Perseus Drive System Architecture

## Overview

Perseus Drive employs a recursive agent-based architecture for AI-driven trading and investment decision-making. The system consists of specialized agents that work together to analyze market data, develop strategies, evaluate risk, and generate trading signals. This document describes the current architecture and component relationships.

## Agent Architecture

The system is built around specialized agents, each handling a specific aspect of the trading process:

### Core Agents

1. **Prompt Engineering Agent** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Manages and optimizes prompts for all other agents
   - **Features**:
     - Template management
     - Prompt versioning
     - Context optimization

2. **Strategy Agent** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Develops and executes trading strategies
   - **Features**:
     - Multiple strategy implementations
     - Signal generation
     - Performance tracking
     - Strategy registration framework

3. **Risk Management Agent** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Evaluates risk and manages position sizing
   - **Features**:
     - Position sizing algorithms
     - Risk parameter configuration
     - Trade evaluation
     - Portfolio risk monitoring

4. **Data Processing Agent** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Processes and normalizes market data
   - **Features**:
     - Data cleaning
     - Feature engineering
     - Technical indicator calculation

## External Data Provider System

The External Data Provider system consists of:

1. **Provider Manager** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Manages multiple data providers
   - **Features**:
     - Provider registration and management
     - Failover handling
     - Data normalization

2. **Coinbase Provider** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Connects to Coinbase exchange API
   - **Features**:
     - Real-time data via WebSocket
     - Historical data retrieval
     - Symbol mapping

3. **Binance Provider** 🔄
   - **Status**: Implementation in progress
   - **Function**: Connects to Binance exchange API
   - **Features**:
     - Real-time data via WebSocket
     - Historical data retrieval
     - Symbol mapping

## Core Components

1. **Knowledge Base** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Centralized data storage for agents
   - **Features**:
     - Persistent storage
     - Query capabilities
     - Data versioning

2. **Agent Messenger** ✅
   - **Status**: Implemented and fully functional
   - **Function**: Facilitates communication between agents
   - **Features**:
     - Message routing
     - Message queuing
     - Agent registration

3. **Performance Monitor** ✅
   - **Status**: Implemented and functional
   - **Function**: Tracks strategy performance
   - **Features**:
     - Win rate calculation
     - Profit factor analysis
     - Drawdown tracking

## Communication Protocol

All agent communication follows a standardized message format:

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

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph "Perseus Drive System"
        PE[Prompt Engineering Agent] --> |Manages prompts| SA[Strategy Agent]
        PE --> |Manages prompts| RM[Risk Management Agent]
        PE --> |Manages prompts| DP[Data Processing Agent]
        
        KB[Knowledge Base] <--> PE
        KB <--> SA
        KB <--> RM
        KB <--> DP
        
        AM[Agent Messenger] --- PE
        AM --- SA
        AM --- RM
        AM --- DP
        
        PM[Performance Monitor] --> PE
        PM --> SA
        PM --> RM
        PM --> DP
        
        DP --> |Market data| SA
        SA --> |Strategy signals| RM
        RM --> |Risk limits| SA
        
        MDI[Market Data Interface] --> DP
        
        subgraph "Provider System"
            PM1[Provider Manager] --> BP1[Coinbase Provider]
            PM1 --> BP2[Binance Provider]
            PM1 --> BP3[Future Providers...]
        end
        
        PM1 --> MDI
    end
    
    subgraph "External Systems"
        MD[Market Data] --> BP1
        MD --> BP2
    end
    
    classDef implemented fill:#d5f9e5,stroke:#333,stroke-width:2px;
    classDef inProgress fill:#f9f9d5,stroke:#333,stroke-width:2px;
    classDef planned fill:#f9d5e5,stroke:#333,stroke-width:2px;
    
    class PE,SA,DP,KB,AM,PM,MDI,PM1,BP1 implemented;
    class RM implemented;
    class BP2 inProgress;
    class BP3 planned;
```

## Current Status

The Perseus Drive system has completed implementation of all core agents (Prompt Engineering, Strategy, Risk Management, and Data Processing) with full Knowledge Base and Agent Messenger components. The system can process market data, generate trading signals, evaluate risk, and track performance metrics.

The External Data Provider system has been implemented with a fully functional Provider Manager and Coinbase Provider. The Binance Provider implementation is in progress.

Future components planned for Phase 3 include:
- Trade Execution Agent
- Portfolio Management
- Backtesting Framework
- System Dashboard
- Machine Learning Integration 
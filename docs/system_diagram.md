# Perseus Drive System Architecture

```mermaid
flowchart TD
    subgraph "Perseus Drive System"
        PE[Prompt Engineering Agent] --> |Manages prompts| SA[Strategy Agent]
        PE --> |Manages prompts| EA[Execution Agent]
        PE --> |Manages prompts| RM[Risk Management Agent]
        PE --> |Manages prompts| DP[Data Processing Agent]
        
        KB[Knowledge Base] <--> PE
        KB <--> SA
        KB <--> EA
        KB <--> RM
        KB <--> DP
        
        AM[Agent Messenger] --- PE
        AM --- SA
        AM --- EA
        AM --- RM
        AM --- DP
        
        PM[Performance Monitor] --> PE
        PM --> SA
        PM --> EA
        PM --> RM
        PM --> DP
        
        DP --> |Market data| SA
        SA --> |Trade signals| EA
        EA --> |Execution reports| RM
        RM --> |Risk limits| SA
        
        MDI[Market Data Interface] --> DP
    end
    
    subgraph "External Systems"
        MD[Market Data] --> MDI
        EA --> |Orders| BK[Broker]
        BK --> |Fills| EA
    end
    
    style PE fill:#f9d5e5,stroke:#333,stroke-width:2px
    style AM fill:#d5e5f9,stroke:#333,stroke-width:2px
    style KB fill:#e5f9d5,stroke:#333,stroke-width:2px
    style PM fill:#f9e5d5,stroke:#333,stroke-width:2px
    style MDI fill:#e5d5f9,stroke:#333,stroke-width:2px
```

## Component Description

### Core Agents
- **Prompt Engineering Agent**: Central agent that manages and evolves prompts for all other agents
- **Strategy Agent**: Develops trading strategies and generates trading signals
- **Execution Agent**: Converts signals to executable orders and manages execution
- **Risk Management Agent**: Monitors portfolio risk and sets position limits
- **Data Processing Agent**: Collects, processes, and prepares market data

### MCP Tools
- **Agent Messenger**: Communication protocol for inter-agent messaging
- **Knowledge Base**: Central repository for shared knowledge
- **Performance Monitor**: Tracks and evaluates agent performance
- **Market Data Interface**: Standardized API for accessing market data

### External Systems
- **Market Data**: External market data providers
- **Broker**: Trading execution platform

## Data Flow

1. Market data flows into the system through the Market Data Interface
2. Data Processing Agent prepares and processes the data
3. Strategy Agent analyzes data and generates trading signals
4. Execution Agent converts signals to orders and sends to broker
5. Risk Management Agent monitors positions and applies risk limits
6. Prompt Engineering Agent continually optimizes all agent prompts based on performance
7. Knowledge is shared between agents via the Knowledge Base
8. All inter-agent communication happens through the Agent Messenger 
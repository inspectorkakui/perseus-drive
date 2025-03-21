/**
 * Prompt Engineering Agent
 * 
 * Central agent responsible for generating, customizing, and optimizing
 * prompts for all other agents in the Perseus Drive system.
 */

const BaseAgent = require('../core/base-agent');
const fs = require('fs').promises;
const path = require('path');

class PromptEngineeringAgent extends BaseAgent {
  constructor() {
    super('prompt-engineering', 'core');
    this.promptLibrary = {};
    this.promptVersions = {};
    this.promptTemplates = {};
    
    // Debug: Log that agent is created
    console.log('Prompt Engineering Agent created');
  }
  
  /**
   * Initialize the agent and load default prompts
   * @returns {boolean} Success status
   */
  async initialize() {
    try {
      // Call base initialization
      await super.initialize();
      
      // Debug: Log that initialization is in progress
      console.log('Prompt Engineering Agent initializing...');
      
      // Load default prompts
      await this.loadDefaultPrompts();
      
      this.logger.info('Prompt Engineering Agent initialized with default prompts');
      console.log('Prompt Engineering Agent initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Error initializing Prompt Engineering Agent:', error);
      console.error('Error initializing Prompt Engineering Agent:', error);
      throw error;
    }
  }
  
  /**
   * Load default prompts from the prompts directory
   * @returns {boolean} Success status
   */
  async loadDefaultPrompts() {
    try {
      // In a real implementation, this would load prompts from a directory
      // For demonstration purposes, we'll set some default prompts
      
      this.promptLibrary = {
        'data': this.getDataProcessingPrompt(),
        'strategy': this.getStrategyPrompt(),
        'risk': this.getRiskManagementPrompt(),
        'execution': this.getExecutionPrompt(),
        'system': this.getSystemPrompt()
      };
      
      // Store default prompts in the knowledge base
      for (const [key, prompt] of Object.entries(this.promptLibrary)) {
        await this.storeKnowledge('prompts', key, prompt);
      }
      
      this.logger.info('Default prompts loaded');
      return true;
    } catch (error) {
      this.logger.error('Error loading default prompts:', error);
      return false;
    }
  }
  
  /**
   * Get the prompt for a specific agent type
   * @param {string} agentType - Type of agent to get prompt for
   * @returns {object} Prompt object
   */
  async getPrompt(agentType) {
    try {
      this.logger.info(`Getting prompt for ${agentType}`);
      
      // First check if it exists in the knowledge base
      const storedPrompt = await this.getKnowledge('prompts', agentType);
      
      if (storedPrompt) {
        this.logger.info(`Retrieved ${agentType} prompt from knowledge base`);
        return storedPrompt.data;
      }
      
      // Fall back to the local prompt library
      if (this.promptLibrary[agentType]) {
        this.logger.info(`Retrieved ${agentType} prompt from local library`);
        return this.promptLibrary[agentType];
      }
      
      // If no prompt found, generate a basic one
      this.logger.warn(`No prompt found for ${agentType}, generating basic prompt`);
      const basicPrompt = this.generateBasicPrompt(agentType);
      
      // Store it for future use
      await this.storeKnowledge('prompts', agentType, basicPrompt);
      
      return basicPrompt;
    } catch (error) {
      this.logger.error(`Error getting prompt for ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Customize a prompt with context information
   * @param {string} basePrompt - Base prompt to customize
   * @param {object} context - Context information
   * @returns {string} Customized prompt
   */
  customizePrompt(basePrompt, context = {}) {
    try {
      // In a real implementation, this would use more sophisticated prompt engineering
      // For demonstration, we'll do simple context injection
      
      let customPrompt = basePrompt;
      
      // Add market conditions if provided
      if (context.marketConditions) {
        customPrompt += `\n\nCurrent market conditions: ${context.marketConditions}`;
      }
      
      // Add previous outputs if provided
      if (context.previousOutputs) {
        customPrompt += `\n\nPrevious outputs: ${JSON.stringify(context.previousOutputs, null, 2)}`;
      }
      
      // Add system directives if provided
      if (context.systemDirectives) {
        customPrompt += `\n\nSystem directives: ${context.systemDirectives}`;
      }
      
      // Add custom parameters if provided
      if (context.parameters) {
        for (const [key, value] of Object.entries(context.parameters)) {
          customPrompt = customPrompt.replace(`{{${key}}}`, value);
        }
      }
      
      return customPrompt;
    } catch (error) {
      this.logger.error('Error customizing prompt:', error);
      return basePrompt; // Return original prompt if customization fails
    }
  }
  
  /**
   * Update a prompt and store the new version
   * @param {string} agentType - Type of agent to update prompt for
   * @param {object} prompt - New prompt
   * @returns {boolean} Success status
   */
  async updatePrompt(agentType, prompt) {
    try {
      this.logger.info(`Updating prompt for ${agentType}`);
      
      // Store in knowledge base
      await this.storeKnowledge('prompts', agentType, prompt);
      
      // Update local library
      this.promptLibrary[agentType] = prompt;
      
      return true;
    } catch (error) {
      this.logger.error(`Error updating prompt for ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate a basic prompt for an agent type
   * @param {string} agentType - Type of agent
   * @returns {object} Basic prompt
   */
  generateBasicPrompt(agentType) {
    // Generate a basic prompt based on agent type
    const systemPrompt = `You are the ${agentType} agent for Perseus Drive. `
      + `Your role is to handle ${agentType}-related tasks in the trading system.`;
    
    return {
      system: systemPrompt,
      user: `Perform your ${agentType} duties based on the provided information.`,
      version: '1.0.0',
      created: new Date()
    };
  }
  
  /**
   * Generate default prompts for all agent types
   */
  
  getDataProcessingPrompt() {
    return {
      system: `You are the Data Processing Agent for Perseus Drive. 
Your role is to clean, transform, and analyze market data to prepare it for strategic decisions.
Focus on identifying patterns, calculating technical indicators, and extracting meaningful features.`,
      user: `Process the given market data, performing necessary transformations and calculations.
Calculate key statistics and technical indicators.
Identify important patterns or anomalies in the data.
Return the processed data in a structured format.`,
      version: '1.0.0',
      created: new Date()
    };
  }
  
  getStrategyPrompt() {
    return {
      system: `You are the Strategy Agent for Perseus Drive.
Your role is to analyze processed market data and generate trading signals.
Focus on implementing trading strategies, recognizing market conditions, and optimizing entry/exit points.`,
      user: `Analyze the provided market data and current positions.
Generate trading signals based on your strategy framework.
Evaluate market conditions and adjust your approach accordingly.
Provide clear recommendations with supporting rationale.`,
      version: '1.0.0',
      created: new Date()
    };
  }
  
  getRiskManagementPrompt() {
    return {
      system: `You are the Risk Management Agent for Perseus Drive.
Your role is to evaluate trading decisions and ensure they comply with risk parameters.
Focus on position sizing, exposure limits, and protecting capital.`,
      user: `Evaluate the proposed trade within our risk management framework.
Check compliance with position sizing rules and exposure limits.
Calculate key risk metrics (VaR, drawdown potential, etc.).
Approve, modify, or reject the trade based on risk assessment.`,
      version: '1.0.0',
      created: new Date()
    };
  }
  
  /**
   * Get a prompt for the Execution Agent
   * @returns {Object} The prompt for execution operations
   */
  getExecutionPrompt() {
    try {
      this.logger.info('Getting execution prompt');
      
      // Return a structured prompt for execution operations
      return {
        system: `You are the Execution Agent for Perseus Drive.
          Your role is to optimize trade execution by minimizing slippage,
          market impact, and transaction costs while ensuring timely execution.
          
          For each trade signal, you should determine:
          1. The optimal execution strategy (market, limit, or advanced)
          2. The appropriate order sizing based on liquidity
          3. The expected slippage and how to minimize it
          4. The transaction costs
          
          Always monitor market conditions and adapt your execution approach
          based on current liquidity and volatility.`,
        examples: [
          {
            signal: {
              action: 'BUY',
              symbol: 'BTC-USD',
              confidence: 0.8,
              params: {
                entryPrice: 50000,
                positionSize: 5000,
                stopLoss: 49000,
                takeProfit: 55000
              }
            },
            execution: {
              strategy: 'market',
              orderType: 'market',
              slippageExpectation: '0.1%',
              transactionCost: '0.2%',
              timing: 'immediate'
            }
          },
          {
            signal: {
              action: 'SELL',
              symbol: 'ETH-USD',
              confidence: 0.7,
              params: {
                entryPrice: 3000,
                positionSize: 3000,
                stopLoss: 3150,
                takeProfit: 2700
              }
            },
            execution: {
              strategy: 'limit',
              orderType: 'limit',
              limitPrice: 3020,
              slippageExpectation: '0%',
              transactionCost: '0.1%',
              timing: 'next 1 hour'
            }
          }
        ],
        version: '1.0.0',
        created: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting execution prompt:', error);
      // Return a default prompt
      return {
        system: 'You are the Execution Agent for Perseus Drive. Execute trades efficiently.',
        examples: [],
        version: '1.0.0',
        created: new Date().toISOString()
      };
    }
  }
  
  getSystemPrompt() {
    return {
      system: `You are the System Management Agent for Perseus Drive.
Your role is to coordinate all other agents and manage system-wide operations.
Focus on ensuring proper communication, resolving conflicts, and optimizing overall performance.`,
      user: `Monitor the trading system's overall operation.
Coordinate communication between specialized agents.
Resolve any conflicts or issues that arise.
Optimize system performance and resource allocation.`,
      version: '1.0.0',
      created: new Date()
    };
  }
  
  /**
   * Handle special agent-specific messages
   * @param {object} message - Message object
   */
  async handleMessage(message) {
    // Call parent handler
    await super.handleMessage(message);
    
    try {
      console.log(`Prompt Engineering Agent handling message: ${message.type}`);
      
      // Handle prompt request
      if (message.type === 'prompt_request') {
        console.log('Received prompt request for:', message.content.agentType);
        
        const prompt = await this.getPrompt(message.content.agentType);
        const customizedPrompt = this.customizePrompt(
          prompt, 
          message.content.context || {}
        );
        
        await this.sendMessage(
          message.from,
          { prompt: customizedPrompt },
          'prompt_response'
        );
      }
      
      // Handle prompt update
      else if (message.type === 'prompt_update') {
        console.log('Received prompt update for:', message.content.agentType);
        
        await this.updatePrompt(
          message.content.agentType,
          message.content.prompt
        );
        
        await this.sendMessage(
          message.from,
          { success: true },
          'prompt_update_response'
        );
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.logger.error('Error handling message:', error);
      await this.sendMessage(message.from, { error: error.message }, 'error');
    }
  }
}

module.exports = new PromptEngineeringAgent(); 
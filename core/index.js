/**
 * Perseus Drive
 * AI Trading Algorithm System
 * 
 * Main entry point for the Perseus Drive system.
 * Initializes all components and starts the agent ecosystem.
 */

require('dotenv').config();
const express = require('express');
const winston = require('winston');

// Import agents
const promptEngineeringAgent = require('../agents/prompt-engineering-agent');
const dataProcessingAgent = require('../agents/data-processing-agent');

// Import MCP tools
const agentMessenger = require('../tools/agent-messenger');
const knowledgeBase = require('../tools/knowledge-base');

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'perseus-drive.log' })
  ]
});

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: 'Perseus Drive',
    version: '0.1.0',
    activeAgents: Array.from(agentMessenger.activeAgents)
  });
});

// Add routes for knowledge base access
app.get('/api/knowledge/categories', (req, res) => {
  const categories = knowledgeBase.getCategories();
  res.json({ categories });
});

app.get('/api/knowledge/:category', async (req, res) => {
  try {
    const items = await knowledgeBase.queryByCategory(req.params.category);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge/:category/:key', async (req, res) => {
  try {
    const knowledge = await knowledgeBase.getKnowledge(
      req.params.category,
      req.params.key
    );
    
    if (!knowledge) {
      return res.status(404).json({ error: 'Knowledge not found' });
    }
    
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize system
async function initializeSystem() {
  try {
    logger.info('Initializing Perseus Drive system...');
    
    // Initialize the Prompt Engineering Agent
    await promptEngineeringAgent.initialize();
    
    // Initialize the Data Processing Agent
    await dataProcessingAgent.initialize();
    
    // Register agents with the messaging system
    // Note: This is now handled by the agent.initialize() method
    // but keeping it for backward compatibility
    agentMessenger.registerAgent('prompt-engineering', 'core');
    agentMessenger.registerAgent('data-processing', 'data');
    
    logger.info('Perseus Drive system initialized successfully');
    
    // Event listeners for agent communication
    agentMessenger.on('message:received', (message) => {
      logger.debug(`Message received: ${message.id}`, { message });
    });
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Perseus Drive API running on port ${PORT}`);
    });
    
  } catch (error) {
    logger.error('Error initializing Perseus Drive system:', error);
    process.exit(1);
  }
}

// Start the system
initializeSystem().catch(error => {
  logger.error('Fatal error during system initialization:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down Perseus Drive system...');
  // Perform cleanup
  process.exit(0);
});

// Export for testing
module.exports = app; 
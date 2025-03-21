# Perseus Drive Quick Start Guide

This guide will help you get started with developing and running the Perseus Drive AI Trading Algorithm system.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB (optional, for data storage)

## Installation

1. Clone the repository:
   ```bash
   git clone [repository-url] perseus-drive
   cd perseus-drive
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your specific configuration values:
   - Add your OpenAI API key
   - Configure database connection (if using MongoDB)
   - Set security keys

## Running the System

Start the development server:
```bash
npm run dev
```

The system will initialize and start running on http://localhost:3000 (or the port specified in your .env file).

## Development Workflow

### Adding a New Agent

1. Create a new agent file in the `agents/` directory:
   ```bash
   touch agents/your-agent-name.js
   ```

2. Implement the agent following the existing agent patterns.

3. Register the agent in `core/index.js`.

### Extending MCP Tools

1. Create a new tool file in the `tools/` directory:
   ```bash
   touch tools/your-tool-name.js
   ```

2. Implement the tool functionality.

3. Import and use the tool in relevant agents or system components.

## Testing

Run tests with:
```bash
npm test
```

## API Endpoints

- `GET /api/status` - Check system status and active agents

## Project Structure

- `/agents` - AI agents for different trading functions
- `/core` - Core system architecture and utilities
- `/docs` - Documentation
- `/tools` - Custom MCP tools for agent communication

## Next Steps

1. Review the `ARCHITECTURE.md` document to understand the system design
2. Check the `ROADMAP.md` file for development milestones
3. Implement the Knowledge Base tool in `/tools`
4. Create the base Agent class in `/core`

## Troubleshooting

If you encounter any issues:

1. Check the logs in `perseus-drive.log` and `agent-communication.log`
2. Ensure your OpenAI API key is valid
3. Verify all dependencies are installed correctly

## Contributing

See `CONTRIBUTING.md` for guidelines on contributing to the project. 
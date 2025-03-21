# Contributing to Perseus Drive

Thank you for your interest in contributing to the Perseus Drive project. This document provides guidelines and instructions for contributing.

## Development Workflow

### Setting Up the Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/username/perseus-drive.git
   cd perseus-drive
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the environment:
   ```bash
   cp .env.example .env
   # Edit .env with appropriate values
   ```

### Branch Naming Convention

- `feature/feature-name` - For new features
- `fix/issue-description` - For bug fixes
- `docs/documentation-update` - For documentation updates
- `refactor/component-name` - For code refactoring

### Commit Message Guidelines

Please follow these guidelines for commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if needed
3. Submit a pull request with a clear description of the changes

## Code Standards

### JavaScript Style Guide

- Use ES6+ syntax
- Use 2 spaces for indentation
- Use semicolons at the end of statements
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes

### Testing

Before submitting a PR, make sure all tests pass:

```bash
npm run debug
```

## Agent Development

When developing new agents or modifying existing ones:

1. Ensure the agent extends the `BaseAgent` class
2. Implement required methods (`initialize`, `process`, `handleMessage`)
3. Register the agent with the agent messenger
4. Update documentation to reflect changes

## Adding New MCP Tools

When adding new Multi-Agent Communication Protocol tools:

1. Place tool files in the `/tools` directory
2. Export consistent APIs for all agents to use
3. Document the tool's purpose and usage
4. Add appropriate tests

## Documentation

Always update documentation when making changes:

- Update `README.md` with new features
- Update `docs/ARCHITECTURE.md` with architectural changes
- Update `docs/system_diagram.md` with system component changes
- Update `docs/ROADMAP.md` with new milestones or completed tasks

## Questions

If you have any questions about contributing, please contact the Perseus Drive team.

Thank you for contributing to Perseus Drive! 
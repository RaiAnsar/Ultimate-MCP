# Installation Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- At least one AI provider API key (OpenRouter, Anthropic, OpenAI, or Google)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ultimate-mcp-server.git
cd ultimate-mcp-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# At least one AI provider key is required
OPENROUTER_API_KEY=your_openrouter_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Optional: For persistence features
DATABASE_URL=postgresql://user:pass@localhost:5432/ultimate_mcp
REDIS_URL=redis://localhost:6379

# Optional: Logging level
LOG_LEVEL=info
```

### 4. Build the Server

```bash
npm run build
```

### 5. Test the Installation

Run the test script to verify everything is working:

```bash
node test-server.js
```

## Claude Desktop Integration

### 1. Locate Claude Configuration

- **macOS**: `~/Library/Application Support/Claude/claude.json`
- **Windows**: `%APPDATA%\Claude\claude.json`
- **Linux**: `~/.config/claude/claude.json`

### 2. Add Server Configuration

Edit your `claude.json` file:

```json
{
  "mcpServers": {
    "ultimate": {
      "command": "node",
      "args": ["/absolute/path/to/ultimate-mcp-server/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the server.

## Claude Code Integration

Add to your Claude Code settings:

```bash
claude code --set-mcp-server ultimate "node /path/to/ultimate-mcp-server/dist/index.js"
```

## Docker Installation (Optional)

### 1. Build Docker Image

```bash
docker build -t ultimate-mcp-server .
```

### 2. Run with Docker

```bash
docker run -e OPENROUTER_API_KEY=your-key ultimate-mcp-server
```

## Development Setup

### 1. Install Dev Dependencies

```bash
npm install --save-dev
```

### 2. Run in Development Mode

```bash
npm run dev
```

### 3. Run Tests

```bash
npm test
```

### 4. Lint Code

```bash
npm run lint
```

## Optional Components

### PostgreSQL Setup

For conversation persistence:

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt-get install postgresql  # Ubuntu

# Create database
createdb ultimate_mcp

# Run migrations
npm run migrate
```

### Redis Setup

For fast caching:

```bash
# Install Redis
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server
```

## Troubleshooting

### Server Won't Start

1. Check Node.js version: `node --version` (must be 18+)
2. Verify build completed: `ls dist/index.js`
3. Check environment variables: `cat .env`

### Connection Issues

1. Verify API keys are valid
2. Check network connectivity
3. Review logs: `LOG_LEVEL=debug node dist/index.js`

### Claude Can't Find Server

1. Use absolute paths in configuration
2. Ensure file has execute permissions: `chmod +x dist/index.js`
3. Check Claude logs for errors

### Performance Issues

1. Enable Redis caching
2. Adjust rate limits in configuration
3. Use fewer parallel AI calls

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GOOGLE_API_KEY` | Google API key | - |
| `DATABASE_URL` | PostgreSQL connection | - |
| `REDIS_URL` | Redis connection | - |
| `LOG_LEVEL` | Logging level | info |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `RATE_LIMIT_WINDOW` | Rate limit window (seconds) | 60 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Advanced Configuration

Create a `config.json` for advanced settings:

```json
{
  "orchestration": {
    "defaultStrategy": "parallel",
    "maxConcurrency": 5,
    "timeout": 30000
  },
  "cache": {
    "ttl": 3600,
    "maxSize": 1000
  },
  "providers": {
    "openrouter": {
      "defaultModel": "anthropic/claude-3-opus"
    }
  }
}
```

## Updating

### 1. Pull Latest Changes

```bash
git pull origin main
```

### 2. Update Dependencies

```bash
npm update
```

### 3. Rebuild

```bash
npm run build
```

### 4. Restart Server

Restart Claude Desktop or your MCP client to use the updated server.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ultimate-mcp-server/issues)
- **Documentation**: See [README.md](README.md) and [FEATURES.md](FEATURES.md)
- **Examples**: Check the `examples/` directory
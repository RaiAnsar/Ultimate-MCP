# Quick Start Guide - OpenRouter Only

Since you already have Claude, this server is configured to use **OpenRouter** for accessing 100+ other AI models with just one API key!

## 1. Get OpenRouter API Key

1. Go to https://openrouter.ai/keys
2. Sign up/login 
3. Create a new API key
4. Copy the key (starts with `sk-or-v1-`)

## 2. Configure Environment

Create a `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

That's it! Just one key needed.

## 3. Build & Run

```bash
npm install
npm run build
```

## 4. Add to Claude Desktop

Edit your Claude configuration file:

**macOS**: `~/Library/Application Support/Claude/claude.json`

```json
{
  "mcpServers": {
    "ultimate": {
      "command": "node",
      "args": ["/path/to/ultimate-mcp-server/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
      }
    }
  }
}
```

## Available Models via OpenRouter

With your OpenRouter key, you get access to:

- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Google**: Gemini Pro, Gemini Flash  
- **Meta**: Llama 3 70B, Llama 3 8B
- **Mistral**: Mixtral 8x7B, Mistral 7B
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **Cohere**: Command R+
- **And 90+ more models!**

## Why OpenRouter?

- **One API key** for all models
- **Pay only for what you use**
- **Free models available** for testing
- **No need for multiple accounts**
- **Unified billing**

## Test It

After setup, restart Claude Desktop and try:

```
"Use the orchestrate tool to compare how GPT-4 and Gemini Pro would solve this problem..."
```

The server will automatically use your OpenRouter key to access both models!

## Costs

OpenRouter has very competitive pricing:
- Many free models available
- GPT-3.5 Turbo: ~$0.0005 per 1K tokens
- Most models: $0.001-0.01 per 1K tokens
- Set spending limits in OpenRouter dashboard

## Note on Claude

Since you're already using Claude directly, we've disabled Claude/Anthropic models in this server to avoid redundancy. You get the best of both worlds:
- Direct Claude access (through me!)  
- Access to 100+ other models through the Ultimate MCP Server
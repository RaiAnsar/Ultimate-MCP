#!/bin/bash

# Ultimate MCP Server Setup Script
# One-click installation for macOS/Linux

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Ultimate MCP Server Setup${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed!${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js version 20+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js v$(node -v) detected${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Build the server
echo -e "${YELLOW}Building the server...${NC}"
npm run build

# Check for OpenRouter API key
echo ""
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}OpenRouter API key not found in environment.${NC}"
    echo "Please enter your OpenRouter API key (get one at https://openrouter.ai/keys):"
    read -s OPENROUTER_API_KEY
    echo ""
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# OpenRouter API Key
OPENROUTER_API_KEY=$OPENROUTER_API_KEY

# Environment
NODE_ENV=production

# Logging
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Detect Claude installation
echo ""
echo -e "${YELLOW}Detecting Claude installation...${NC}"

CLAUDE_DESKTOP=false
CLAUDE_CODE=false

# Check for Claude Desktop config
if [ -f "$HOME/.claude/claude.json" ] || [ -f "$HOME/Library/Application Support/Claude/claude.json" ]; then
    CLAUDE_DESKTOP=true
    echo -e "${GREEN}✓ Claude Desktop detected${NC}"
fi

# Check for Claude Code
if command -v claude &> /dev/null; then
    CLAUDE_CODE=true
    echo -e "${GREEN}✓ Claude Code detected${NC}"
fi

# Get absolute path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Add to Claude
if [ "$CLAUDE_CODE" = true ]; then
    echo ""
    echo -e "${YELLOW}Adding Ultimate MCP Server to Claude Code...${NC}"
    
    # Remove old installations if any
    claude mcp remove ultimate 2>/dev/null || true
    
    # Add with user scope
    claude mcp add ultimate node "$SCRIPT_DIR/dist/index.js" \
        -e OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
        --scope user
    
    echo -e "${GREEN}✓ Added to Claude Code${NC}"
    
elif [ "$CLAUDE_DESKTOP" = true ]; then
    echo ""
    echo -e "${YELLOW}Claude Desktop detected. Add this to your claude.json:${NC}"
    echo ""
    cat << EOF
{
  "mcpServers": {
    "ultimate": {
      "command": "node",
      "args": ["$SCRIPT_DIR/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "$OPENROUTER_API_KEY",
        "LOG_LEVEL": "info"
      }
    }
  }
}
EOF
    echo ""
    echo -e "${YELLOW}Location: ~/.claude/claude.json or ~/Library/Application Support/Claude/claude.json${NC}"
else
    echo -e "${YELLOW}No Claude installation detected.${NC}"
    echo "Install Claude Code: https://docs.anthropic.com/en/docs/claude-code"
    echo "Or Claude Desktop: https://claude.ai/download"
fi

# Success message
echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  Setup Complete! 🎉${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}Features enabled:${NC}"
echo "  ✓ 100+ AI models via OpenRouter"
echo "  ✓ 7 orchestration strategies"
echo "  ✓ Advanced debugging tools"
echo "  ✓ Codebase analysis (NEW!)"
echo "  ✓ Thinking mode (NEW!)"
echo ""

if [ "$CLAUDE_CODE" = true ] || [ "$CLAUDE_DESKTOP" = true ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Restart Claude to load the Ultimate MCP Server"
    echo "2. Test with: /ask analyze_error \"TypeError: Cannot read property 'x' of undefined\""
    echo "3. Try codebase analysis: /ask analyze_codebase"
else
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Install Claude Code or Claude Desktop"
    echo "2. Run this setup script again"
fi

echo ""
echo -e "${BLUE}Built to be praised by kings and loved by ministers 👑${NC}"
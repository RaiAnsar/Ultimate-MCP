#!/bin/bash

# Ultimate MCP Server - Cursor 1-Click Installer
# This script automates the installation for Cursor IDE

echo "🚀 Ultimate MCP Server - Cursor Installation"
echo "=========================================="

# Check if Cursor is installed
if ! command -v cursor &> /dev/null; then
    echo "❌ Cursor IDE not found. Please install Cursor first."
    echo "   Download from: https://cursor.sh"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're in the Ultimate MCP directory
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo "❌ Error: This script must be run from the Ultimate MCP directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building server..."
npm run build

# Check if build succeeded
if [ ! -f "$SCRIPT_DIR/dist/index.js" ]; then
    echo "❌ Build failed. Please check for errors above."
    exit 1
fi

# Prompt for API key
echo ""
echo "🔑 Enter your OpenRouter API key:"
echo "   (Get one at https://openrouter.ai/keys)"
read -s OPENROUTER_KEY
echo ""

# Create Cursor MCP configuration
echo "⚙️  Configuring Cursor..."

# Use Cursor's MCP install command
cursor mcp install \
    --name "ultimate-mcp" \
    --command "node" \
    --args "$SCRIPT_DIR/dist/index.js" \
    --env "OPENROUTER_API_KEY=$OPENROUTER_KEY"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Restart Cursor to load the Ultimate MCP Server"
    echo "2. Try these commands in Cursor:"
    echo "   - Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)"
    echo "   - Type: @ultimate ask 'Explain async/await'"
    echo "   - Or: @ultimate orchestrate 'Design a REST API' --strategy debate"
    echo ""
    echo "📚 Documentation: https://github.com/RaiAnsar/Ultimate-MCP"
else
    echo ""
    echo "❌ Installation failed. Manual setup instructions:"
    echo "1. Open Cursor Settings (Cmd+, or Ctrl+,)"
    echo "2. Search for 'MCP Servers'"
    echo "3. Add this configuration:"
    echo "{"
    echo "  \"name\": \"ultimate-mcp\","
    echo "  \"command\": \"node\","
    echo "  \"args\": [\"$SCRIPT_DIR/dist/index.js\"],"
    echo "  \"env\": {"
    echo "    \"OPENROUTER_API_KEY\": \"$OPENROUTER_KEY\""
    echo "  }"
    echo "}"
fi
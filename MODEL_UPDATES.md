# Model Updates Guide

## Current Working Models (as of January 2025)

### OpenAI Models
- `openai/gpt-4o` - GPT-4 Optimized
- `openai/gpt-4o-mini` - GPT-4 Optimized Mini

### Google Models
- `google/gemini-2.5-pro` - Gemini 2.5 Pro (2M token context)
- `google/gemini-2.5-flash` - Gemini 2.5 Flash (1M token context)

### Meta Models
- `meta-llama/llama-3.3-70b-instruct` - Llama 3.3 70B
- `meta-llama/llama-3.1-8b-instruct` - Llama 3.1 8B

### Other Models
- `qwen/qwen-2.5-coder-32b-instruct` - Qwen 2.5 Coder
- `deepseek/deepseek-v3` - DeepSeek V3
- `perplexity/llama-3.1-sonar-large-128k-online` - Perplexity Sonar

## Common Model Changes

### Deprecated Models → New Models
- `google/gemini-pro` → `google/gemini-2.5-pro`
- `google/gemini-pro-vision` → `google/gemini-2.5-pro`
- `google/gemini-2.0-flash-exp` → `google/gemini-2.5-flash`

## How to Update Models

1. Check available models:
```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | \
  jq '.data[].id' | grep -i "model-name"
```

2. Update `/src/config/models.ts` with the new model names

3. Rebuild the server:
```bash
npm run build
```

## Handling Model Errors

If you see errors like "404 No endpoints found for [model]", it means the model name has changed. Follow the update process above to fix it.
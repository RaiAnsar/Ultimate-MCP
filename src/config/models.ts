// Centralized model configuration - Updated with latest models (2025)
// Models verified for OpenRouter availability

export const MODELS = {
  // OpenAI models
  GPT_4O: "openai/gpt-4o",
  GPT_4O_MINI: "openai/gpt-4o-mini",
  GPT_4_TURBO: "openai/gpt-4-turbo",
  GPT_4: "openai/gpt-4",
  GPT_3_5_TURBO: "openai/gpt-3.5-turbo",
  
  // Anthropic models
  CLAUDE_3_OPUS: "anthropic/claude-3-opus",
  CLAUDE_3_SONNET: "anthropic/claude-3-sonnet",
  CLAUDE_3_HAIKU: "anthropic/claude-3-haiku",
  CLAUDE_3_5_SONNET: "anthropic/claude-3.5-sonnet",
  CLAUDE_3_5_SONNET_LATEST: "anthropic/claude-3.5-sonnet-20241022",
  
  // Google models
  GEMINI_2_PRO: "google/gemini-2.5-pro",
  GEMINI_2_FLASH: "google/gemini-2.5-flash",
  GEMINI_PRO: "google/gemini-pro",
  GEMINI_PRO_VISION: "google/gemini-pro-vision",
  GEMINI_2_FLASH_THINKING: "google/gemini-2.0-flash-thinking-exp",
  
  // xAI models
  GROK_2: "x-ai/grok-2",
  GROK_2_VISION: "x-ai/grok-2-vision",
  GROK_3_BETA: "x-ai/grok-3-beta",
  GROK_4: "x-ai/grok-4-beta", // Latest Grok model
  
  // Meta models
  LLAMA_3_3_70B: "meta-llama/llama-3.3-70b-instruct",
  LLAMA_3_1_405B: "meta-llama/llama-3.1-405b-instruct",
  LLAMA_3_1_70B: "meta-llama/llama-3.1-70b-instruct",
  LLAMA_3_1_8B: "meta-llama/llama-3.1-8b-instruct",
  LLAMA_3_2_90B_VISION: "meta-llama/llama-3.2-90b-vision-instruct",
  LLAMA_3_2_11B_VISION: "meta-llama/llama-3.2-11b-vision-instruct",
  LLAMA_3_2_3B: "meta-llama/llama-3.2-3b-instruct",
  LLAMA_3_2_1B: "meta-llama/llama-3.2-1b-instruct",
  
  // Mistral models
  MISTRAL_LARGE: "mistralai/mistral-large-2411",
  MISTRAL_MEDIUM: "mistralai/mistral-medium",
  MISTRAL_SMALL: "mistralai/mistral-small",
  MIXTRAL_8X7B: "mistralai/mixtral-8x7b-instruct",
  MIXTRAL_8X22B: "mistralai/mixtral-8x22b-instruct",
  CODESTRAL: "mistralai/codestral-2501", // Latest code model
  PIXTRAL_LARGE: "mistralai/pixtral-large-2411",
  
  // DeepSeek models
  DEEPSEEK_V3: "deepseek/deepseek-v3",
  DEEPSEEK_CHAT: "deepseek/deepseek-chat",
  DEEPSEEK_CODER_V2: "deepseek/deepseek-coder-v2-instruct",
  DEEPSEEK_R1: "deepseek/deepseek-r1",
  DEEPSEEK_R1_LITE: "deepseek/deepseek-r1-lite-preview",
  
  // Qwen models
  QWEN_2_5_CODER_32B: "qwen/qwen-2.5-coder-32b-instruct",
  QWEN_2_5_72B: "qwen/qwen-2.5-72b-instruct",
  QWEN_2_5_14B: "qwen/qwen-2.5-14b-instruct",
  QWEN_2_5_7B: "qwen/qwen-2.5-7b-instruct",
  QWQ_32B_PREVIEW: "qwen/qwq-32b-preview",
  
  // Moonshot models
  KIMI_K2: "moonshotai/kimi-k2-1t",
  KIMI_K1: "moonshotai/kimi-k1",
  
  // Alibaba models
  QWEN_VL_MAX: "qwen/qwen-vl-max",
  MARCO_O1: "alibaba/marco-o1",
  
  // Cohere models
  COMMAND_R_PLUS: "cohere/command-r-plus",
  COMMAND_R: "cohere/command-r",
  
  // AI21 models
  JAMBA_1_5_LARGE: "ai21/jamba-1-5-large",
  JAMBA_1_5_MINI: "ai21/jamba-1-5-mini",
  
  // Databricks models
  DBRX_INSTRUCT: "databricks/dbrx-instruct",
  
  // Nvidia models
  LLAMA_3_1_NEMOTRON_70B: "nvidia/llama-3.1-nemotron-70b-instruct",
  
  // Perplexity models
  PERPLEXITY_ONLINE: "perplexity/llama-3.1-sonar-large-128k-online",
  PERPLEXITY_CHAT: "perplexity/llama-3.1-sonar-large-128k-chat",
  
  // 01 models
  O1_PREVIEW: "openai/o1-preview",
  O1_MINI: "openai/o1-mini",
  
  // Specialized models
  ANALYSIS_MODEL: "google/gemini-2.5-pro",
  SYNTHESIS_MODEL: "google/gemini-2.5-pro",
  CODE_MODEL: "qwen/qwen-2.5-coder-32b-instruct",
  DEBATE_MODEL: "x-ai/grok-3-beta",
  REASONING_MODEL: "deepseek/deepseek-r1",
  VISION_MODEL: "x-ai/grok-2-vision",
};

// Model capabilities and context limits
export const MODEL_CONTEXT_LIMITS = {
  // Google models
  "google/gemini-2.5-pro": 2097152, // 2M tokens
  "google/gemini-2.5-flash": 1048576, // 1M tokens
  "google/gemini-pro": 32768,
  "google/gemini-2.0-flash-thinking-exp": 32768,
  
  // OpenAI models
  "openai/gpt-4o": 128000,
  "openai/gpt-4o-mini": 128000,
  "openai/gpt-4-turbo": 128000,
  "openai/gpt-4": 8192,
  "openai/o1-preview": 128000,
  "openai/o1-mini": 128000,
  
  // Anthropic models
  "anthropic/claude-3-opus": 200000,
  "anthropic/claude-3-sonnet": 200000,
  "anthropic/claude-3-haiku": 200000,
  "anthropic/claude-3.5-sonnet": 200000,
  "anthropic/claude-3.5-sonnet-20241022": 200000,
  
  // xAI models
  "x-ai/grok-2": 131072,
  "x-ai/grok-2-vision": 131072,
  "x-ai/grok-3-beta": 131072,
  "x-ai/grok-4-beta": 131072,
  
  // Meta models
  "meta-llama/llama-3.3-70b-instruct": 128000,
  "meta-llama/llama-3.1-405b-instruct": 128000,
  "meta-llama/llama-3.1-70b-instruct": 128000,
  "meta-llama/llama-3.2-90b-vision-instruct": 128000,
  
  // Moonshot models
  "moonshotai/kimi-k2-1t": 1000000, // 1M context window
  "moonshotai/kimi-k1": 128000,
  
  // DeepSeek models
  "deepseek/deepseek-v3": 128000,
  "deepseek/deepseek-r1": 128000,
  "deepseek/deepseek-coder-v2-instruct": 128000,
  
  // Qwen models
  "qwen/qwen-2.5-coder-32b-instruct": 128000,
  "qwen/qwen-2.5-72b-instruct": 128000,
  "qwen/qwq-32b-preview": 32768,
  
  // Mistral models
  "mistralai/mistral-large-2411": 128000,
  "mistralai/codestral-2501": 256000,
  "mistralai/mixtral-8x22b-instruct": 65536,
};

// Model specializations
export const MODEL_SPECIALIZATIONS = {
  coding: [
    "qwen/qwen-2.5-coder-32b-instruct",
    "mistralai/codestral-2501",
    "deepseek/deepseek-coder-v2-instruct",
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
  ],
  reasoning: [
    "deepseek/deepseek-r1",
    "openai/o1-preview",
    "qwen/qwq-32b-preview",
    "alibaba/marco-o1",
    "x-ai/grok-4-beta",
  ],
  vision: [
    "x-ai/grok-2-vision",
    "google/gemini-pro-vision",
    "meta-llama/llama-3.2-90b-vision-instruct",
    "qwen/qwen-vl-max",
    "mistralai/pixtral-large-2411",
  ],
  longContext: [
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "moonshotai/kimi-k2-1t",
    "mistralai/codestral-2501",
    "anthropic/claude-3-opus",
  ],
  efficiency: [
    "meta-llama/llama-3.2-1b-instruct",
    "meta-llama/llama-3.2-3b-instruct",
    "deepseek/deepseek-v3",
    "google/gemini-2.5-flash",
  ],
  online: [
    "perplexity/llama-3.1-sonar-large-128k-online",
    "perplexity/llama-3.1-sonar-large-128k-chat",
  ],
};

// Fallback models when primary ones fail
export const FALLBACK_MODELS = {
  // Google fallbacks
  "google/gemini-pro": "google/gemini-2.5-pro",
  "google/gemini-pro-vision": "google/gemini-2.5-pro",
  "google/gemini-2.0-flash-exp": "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-exp": "google/gemini-2.5-flash",
  
  // xAI fallbacks
  "x-ai/grok-4-beta": "x-ai/grok-3-beta",
  "x-ai/grok-3-beta": "x-ai/grok-2",
  
  // DeepSeek fallbacks
  "deepseek/deepseek-r1": "deepseek/deepseek-v3",
  "deepseek/deepseek-r1-lite-preview": "deepseek/deepseek-chat",
  
  // Anthropic fallbacks
  "anthropic/claude-3.5-sonnet-20241022": "anthropic/claude-3.5-sonnet",
  
  // Moonshot fallbacks
  "moonshotai/kimi-k2-1t": "moonshotai/kimi-k1",
};

// Model pricing tiers (for cost optimization)
export const MODEL_PRICING_TIERS = {
  premium: [
    "openai/o1-preview",
    "anthropic/claude-3-opus",
    "moonshotai/kimi-k2-1t",
  ],
  standard: [
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "x-ai/grok-3-beta",
    "google/gemini-2.5-pro",
  ],
  economy: [
    "openai/gpt-4o-mini",
    "google/gemini-2.5-flash",
    "meta-llama/llama-3.2-3b-instruct",
    "deepseek/deepseek-v3",
  ],
};
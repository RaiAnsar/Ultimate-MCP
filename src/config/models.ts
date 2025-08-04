// Centralized model configuration to prevent 404 errors
// Update these when models change on OpenRouter

export const MODELS = {
  // OpenAI models
  GPT_4O: "openai/gpt-4o",
  GPT_4O_MINI: "openai/gpt-4o-mini",
  
  // Google models - Use stable versions
  GEMINI_PRO: "google/gemini-2.5-pro",
  GEMINI_PRO_VISION: "google/gemini-2.5-pro",
  GEMINI_FLASH: "google/gemini-2.5-flash",
  
  // Meta models
  LLAMA_3_70B: "meta-llama/llama-3.3-70b-instruct",
  LLAMA_3_8B: "meta-llama/llama-3.1-8b-instruct",
  
  // Mistral models
  MISTRAL_LARGE: "mistralai/mistral-large-2411",
  MIXTRAL: "mistralai/mixtral-8x7b-instruct",
  
  // Other models
  QWEN_CODER: "qwen/qwen-2.5-coder-32b-instruct",
  DEEPSEEK: "deepseek/deepseek-v3",
  PERPLEXITY: "perplexity/llama-3.1-sonar-large-128k-online",
  KIMI_K2: "moonshotai/kimi-k2",
  
  // Models for specific tasks
  ANALYSIS_MODEL: "google/gemini-2.5-pro",
  SYNTHESIS_MODEL: "google/gemini-2.5-pro",
  CODE_MODEL: "openai/gpt-4o",
  DEBATE_MODEL: "openai/gpt-4o",
};

// Model capabilities
export const MODEL_CONTEXT_LIMITS = {
  "google/gemini-2.5-pro": 2097152, // 2M tokens
  "google/gemini-2.5-flash": 1048576, // 1M tokens
  "openai/gpt-4o": 128000,
  "openai/gpt-4o-mini": 128000,
  "meta-llama/llama-3.3-70b-instruct": 128000,
  "moonshotai/kimi-k2": 128000, // 128K context window
};

// Fallback models when primary ones fail
export const FALLBACK_MODELS = {
  "google/gemini-pro": "google/gemini-2.5-pro",
  "google/gemini-pro-vision": "google/gemini-2.5-pro",
  "google/gemini-2.0-flash-exp": "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-exp": "google/gemini-2.5-flash",
};
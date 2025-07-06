import { Logger } from "../utils/logger.js";
import { 
  OrchestrationStrategy, 
  OrchestrationRequest, 
  AIProvider,
  Message 
} from "../types/index.js";
import { OpenRouterProvider } from "./openrouter.js";
// import { AnthropicProvider } from "./anthropic.js"; // Disabled - using Claude directly
// import { OpenAIProvider } from "./openai.js";
// import { GoogleProvider } from "./google.js";
import PQueue from "p-queue";

interface ProviderResponse {
  model: string;
  response: string;
  duration: number;
  tokens?: number;
}

interface OrchestrationResult {
  strategy: OrchestrationStrategy;
  responses: ProviderResponse[];
  synthesis?: string;
  consensus?: string;
  conclusion?: string;
  rounds?: any[];
  metadata: {
    totalDuration: number;
    modelsUsed: string[];
  };
}

export class AIOrchestrator {
  private providers: Map<string, AIProvider> = new Map();
  private logger: Logger;
  private queue: PQueue;

  constructor() {
    this.logger = new Logger("AIOrchestrator");
    this.queue = new PQueue({ concurrency: 5 });
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers based on environment variables
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set("openrouter", new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }
    // Anthropic/Claude disabled - you already have Claude!
    // if (process.env.ANTHROPIC_API_KEY) {
    //   this.providers.set("anthropic", new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    // }
    // Only use OpenRouter - it provides access to all models
    // if (process.env.OPENAI_API_KEY) {
    //   this.providers.set("openai", new OpenAIProvider(process.env.OPENAI_API_KEY));
    // }
    // if (process.env.GOOGLE_API_KEY) {
    //   this.providers.set("google", new GoogleProvider(process.env.GOOGLE_API_KEY));
    // }

    this.logger.info(`Initialized ${this.providers.size} AI providers`);
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const models = request.models || this.getDefaultModels(request.strategy);

    this.logger.info(`Starting orchestration with strategy: ${request.strategy}`);

    let result: OrchestrationResult;

    switch (request.strategy) {
      case OrchestrationStrategy.Sequential:
        result = await this.sequentialProcessing(request, models);
        break;
      case OrchestrationStrategy.Parallel:
        result = await this.parallelProcessing(request, models);
        break;
      case OrchestrationStrategy.Debate:
        result = await this.debateMode(request, models);
        break;
      case OrchestrationStrategy.Consensus:
        result = await this.consensusMode(request, models);
        break;
      case OrchestrationStrategy.Specialist:
        result = await this.specialistMode(request, models);
        break;
      case OrchestrationStrategy.Hierarchical:
        result = await this.hierarchicalMode(request, models);
        break;
      case OrchestrationStrategy.Mixture:
        result = await this.mixtureOfExperts(request, models);
        break;
      default:
        throw new Error(`Unknown orchestration strategy: ${request.strategy}`);
    }

    result.metadata.totalDuration = Date.now() - startTime;
    return result;
  }

  private async sequentialProcessing(
    request: OrchestrationRequest, 
    models: string[]
  ): Promise<OrchestrationResult> {
    const responses: ProviderResponse[] = [];
    let currentPrompt = request.prompt;
    let previousResponse = "";

    for (const model of models) {
      const enhancedPrompt = previousResponse 
        ? `Previous analysis:\n${previousResponse}\n\nPlease refine or expand on this:\n${currentPrompt}`
        : currentPrompt;

      const response = await this.callModel(model, enhancedPrompt, request.options);
      responses.push(response);
      previousResponse = response.response;
    }

    return {
      strategy: OrchestrationStrategy.Sequential,
      responses,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }

  private async parallelProcessing(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    // Execute all models in parallel
    const promises = models.map(model => 
      this.queue.add(() => this.callModel(model, request.prompt, request.options))
    );

    const responses = (await Promise.all(promises)).filter((r): r is ProviderResponse => r !== undefined);

    // Synthesize responses if requested
    let synthesis: string | undefined;
    if (request.options?.includeReasoning) {
      synthesis = await this.synthesizeResponses(responses.filter((r): r is ProviderResponse => r !== undefined), request.prompt);
    }

    return {
      strategy: OrchestrationStrategy.Parallel,
      responses,
      synthesis,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }

  private async debateMode(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    const rounds: any[] = [];
    const maxRounds = request.options?.maxRounds || 3;
    let currentTopic = request.prompt;

    for (let round = 0; round < maxRounds; round++) {
      const roundResponses: ProviderResponse[] = [];

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        let prompt = currentTopic;

        // Add context from previous responses in this round
        if (roundResponses.length > 0) {
          const previousPoints = roundResponses.map(r => 
            `${r.model}: ${r.response.substring(0, 200)}...`
          ).join("\n\n");
          
          prompt = `Topic: ${currentTopic}\n\nPrevious arguments:\n${previousPoints}\n\nProvide your perspective in 3-4 sentences, addressing the key points raised:`;
        }

        const response = await this.callModel(model, prompt, request.options);
        roundResponses.push(response);
      }

      rounds.push({ round: round + 1, responses: roundResponses });

      // Prepare topic for next round
      if (round < maxRounds - 1) {
        currentTopic = `Based on the following perspectives, identify key disagreements and areas for further discussion:\n\n${
          roundResponses.map(r => `${r.model}: ${r.response}`).join("\n\n")
        }`;
      }
    }

    // Generate conclusion
    const conclusion = await this.generateDebateConclusion(rounds, request.prompt);

    return {
      strategy: OrchestrationStrategy.Debate,
      responses: rounds.flatMap(r => r.responses),
      rounds,
      conclusion,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }

  private async consensusMode(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    // First, get initial responses
    const initialResponses = (await Promise.all(
      models.map(model => 
        this.queue.add(() => this.callModel(model, request.prompt, request.options))
      )
    )).filter((r): r is ProviderResponse => r !== undefined);

    // Identify areas of agreement and disagreement
    const analysisPrompt = `Analyze these responses and identify:
1. Points of agreement
2. Points of disagreement
3. Unique insights from each model

Responses:
${initialResponses.map(r => `${r?.model}:\n${r?.response}`).join("\n\n---\n\n")}`;

    const analysisModel = models[0]; // Use first model for analysis
    const analysis = await this.callModel(analysisModel, analysisPrompt, request.options);

    // Generate consensus
    const consensusPrompt = `Based on this analysis, provide a consensus view that incorporates the strongest points from all perspectives:\n\n${analysis.response}`;
    const consensus = await this.callModel(analysisModel, consensusPrompt, request.options);

    return {
      strategy: OrchestrationStrategy.Consensus,
      responses: initialResponses,
      consensus: consensus.response,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }

  private async specialistMode(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    // Analyze the task to determine the best model
    const taskType = await this.analyzeTaskType(request.prompt);
    const bestModel = this.selectBestModel(taskType, models);

    this.logger.info(`Selected specialist model: ${bestModel} for task type: ${taskType}`);

    const response = await this.callModel(bestModel, request.prompt, request.options);

    return {
      strategy: OrchestrationStrategy.Specialist,
      responses: [response],
      metadata: {
        totalDuration: 0,
        modelsUsed: [bestModel],
      },
    };
  }

  private async hierarchicalMode(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    // Break down the problem into sub-problems
    const decompositionPrompt = `Break down this problem into 3-5 sub-problems that can be solved independently:\n\n${request.prompt}`;
    const decomposition = await this.callModel(models[0], decompositionPrompt, request.options);

    // Parse sub-problems (simplified for now)
    const subProblems = decomposition.response.split("\n").filter(line => line.trim().match(/^\d+\./));

    // Solve each sub-problem
    const subSolutions = (await Promise.all(
      subProblems.map((subProblem, index) => 
        this.callModel(models[index % models.length], subProblem, request.options)
      )
    )).filter((r): r is ProviderResponse => r !== undefined);

    // Combine solutions
    const combinationPrompt = `Combine these sub-solutions into a comprehensive answer:\n\n${
      subSolutions.map((sol, i) => `Sub-problem ${i + 1}: ${subProblems[i]}\nSolution: ${sol.response}`).join("\n\n")
    }`;
    
    const finalSolution = await this.callModel(models[0], combinationPrompt, request.options);

    return {
      strategy: OrchestrationStrategy.Hierarchical,
      responses: [...subSolutions, finalSolution],
      synthesis: finalSolution.response,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }

  private async mixtureOfExperts(
    request: OrchestrationRequest,
    models: string[]
  ): Promise<OrchestrationResult> {
    // Get responses from all experts
    const expertResponses = (await Promise.all(
      models.map(model => 
        this.queue.add(() => this.callModel(model, request.prompt, request.options))
      )
    )).filter((r): r is ProviderResponse => r !== undefined);

    // Score each response
    const scoredResponses = await Promise.all(
      expertResponses.filter((r): r is ProviderResponse => r !== undefined).map(async (response) => {
        const score = await this.scoreResponse(response.response, request.prompt);
        return { ...response, score };
      })
    );

    // Weight responses by score
    const topResponses = scoredResponses
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(models.length / 2));

    // Combine top responses
    const mixturePrompt = `Combine these high-quality responses into a single comprehensive answer:\n\n${
      topResponses.map(r => `[Score: ${r.score}] ${r.model}:\n${r.response}`).join("\n\n---\n\n")
    }`;

    const mixture = await this.callModel(models[0], mixturePrompt, request.options);

    return {
      strategy: OrchestrationStrategy.Mixture,
      responses: expertResponses,
      synthesis: mixture.response,
      metadata: {
        totalDuration: 0,
        modelsUsed: models,
      },
    };
  }


  private parseModelId(model: string): [string, string] {
    // Since we only have OpenRouter configured, route ALL models through it
    // OpenRouter handles the actual provider routing
    return ["openrouter", model];
  }

  private getDefaultModels(strategy: OrchestrationStrategy): string[] {
    // Return appropriate default models based on strategy
    
    switch (strategy) {
      case OrchestrationStrategy.Debate:
      case OrchestrationStrategy.Consensus:
        return ["openai/gpt-4o", "google/gemini-2.5-pro", "meta-llama/llama-3.3-70b-instruct"];
      case OrchestrationStrategy.Specialist:
        return ["openai/gpt-4o"];
      default:
        // Return some default models that are generally available
        return ["openai/gpt-4o-mini", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b-instruct"];
    }
  }

  private async synthesizeResponses(responses: ProviderResponse[], originalPrompt: string): Promise<string> {
    const synthesisPrompt = `Original question: ${originalPrompt}\n\nSynthesize these responses into a comprehensive answer:\n\n${
      responses.map(r => `${r.model}:\n${r.response}`).join("\n\n---\n\n")
    }`;

    const synthesis = await this.callModel("google/gemini-2.5-pro", synthesisPrompt, { temperature: 0.3 });
    return synthesis.response;
  }

  private async generateDebateConclusion(rounds: any[], originalPrompt: string): Promise<string> {
    const conclusionPrompt = `Original topic: ${originalPrompt}\n\nBased on this debate with ${rounds.length} rounds, provide a concise 3-4 sentence conclusion that acknowledges different perspectives and identifies the key insight.`;
    
    const conclusion = await this.callModel("google/gemini-2.5-pro", conclusionPrompt, { temperature: 0.5 });
    return conclusion.response;
  }

  private async analyzeTaskType(prompt: string): Promise<string> {
    // Simple task classification
    const lower = prompt.toLowerCase();
    
    if (lower.includes("code") || lower.includes("debug") || lower.includes("function")) {
      return "coding";
    } else if (lower.includes("analyze") || lower.includes("research")) {
      return "analysis";
    } else if (lower.includes("creative") || lower.includes("story") || lower.includes("write")) {
      return "creative";
    } else if (lower.includes("math") || lower.includes("calculate") || lower.includes("solve")) {
      return "mathematical";
    }
    
    return "general";
  }

  private selectBestModel(taskType: string, availableModels: string[]): string {
    // Model selection logic based on task type
    const preferences: Record<string, string[]> = {
      coding: ["qwen/qwen-2.5-coder-32b-instruct", "openai/gpt-4o", "deepseek/deepseek-v3"],
      analysis: ["google/gemini-2.5-pro", "openai/o1", "mistralai/mistral-large-2411"],
      creative: ["openai/gpt-4o", "google/gemini-2.5-pro", "meta-llama/llama-3.3-70b-instruct"],
      mathematical: ["openai/o1", "google/gemini-2.5-pro", "qwen/qwq-32b-preview"],
      general: ["google/gemini-2.5-pro", "openai/gpt-4o", "meta-llama/llama-3.3-70b-instruct"],
    };

    const preferred = preferences[taskType] || preferences.general;
    
    for (const model of preferred) {
      if (availableModels.includes(model)) {
        return model;
      }
    }

    return availableModels[0];
  }

  private async scoreResponse(response: string, prompt: string): Promise<number> {
    // Simple scoring based on response quality indicators
    let score = 50; // Base score

    // Length bonus (but not too long)
    const wordCount = response.split(/\s+/).length;
    if (wordCount > 100 && wordCount < 1000) {
      score += 10;
    }

    // Structure bonus (has sections/paragraphs)
    if (response.includes("\n\n")) {
      score += 10;
    }

    // Relevance bonus (mentions key terms from prompt)
    const promptTerms = prompt.toLowerCase().split(/\s+/);
    const responseTerms = response.toLowerCase();
    const relevanceCount = promptTerms.filter(term => 
      term.length > 3 && responseTerms.includes(term)
    ).length;
    score += Math.min(relevanceCount * 5, 20);

    // Completeness bonus (has conclusion or summary)
    if (responseTerms.includes("in conclusion") || responseTerms.includes("summary") || responseTerms.includes("therefore")) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  public async callModel(
    model: string,
    prompt: string,
    options?: {
      temperature?: number;
      useThinking?: boolean;
      thinkingTokens?: string[];
      context?: Message[];
    }
  ): Promise<ProviderResponse> {
    const [providerName] = this.parseModelId(model);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not available`);
    }

    const startTime = Date.now();

    try {
      // Handle thinking mode
      let actualModel = model;
      let actualPrompt = prompt;

      if (options?.useThinking) {
        // Add thinking tokens to prompt for deep reasoning
        // Note: |thinking model variants don't exist yet, so we use prompt engineering
        const thinkingPrefix = options.thinkingTokens?.join(" ") || 
          "Let me think through this step by step:\n\n";
        actualPrompt = thinkingPrefix + prompt;
        
        // Optional: Log that we're using thinking mode
        this.logger.debug(`Using thinking mode for model: ${model}`);
      }

      const response = options?.context
        ? await provider.completeWithContext(options.context.concat([{ role: "user", content: actualPrompt }]), {
            model: actualModel,
            temperature: options?.temperature,
          })
        : await provider.complete(actualPrompt, {
            model: actualModel,
            temperature: options?.temperature,
          });

      return {
        model: actualModel,
        response,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Error calling model ${model}:`, error);
      throw error;
    }
  }

  // Note: Thinking model variants (e.g., model|thinking) are not yet available
  // We use prompt engineering to achieve deep reasoning instead
}
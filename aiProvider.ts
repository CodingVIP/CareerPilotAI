import { GoogleGenAI } from '@google/genai';

export interface GenerateContentRequest {
  model: string;
  contents: string;
  config?: {
    responseMimeType?: string;
    responseSchema?: unknown;
    tools?: unknown[];
  };
}

export interface AIProviderCapabilities {
  structuredOutput: boolean;
  webGrounding: boolean;
  toolCalling: boolean;
  streaming: boolean;
  localOnly: boolean;
}

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45_000);

export interface GenerateContentResponse {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
    };
  }>;
}

export interface AIProvider {
  readonly capabilities: AIProviderCapabilities;
  generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
}

class GeminiProvider implements AIProvider {
  readonly capabilities: AIProviderCapabilities = {
    structuredOutput: true,
    webGrounding: true,
    toolCalling: true,
    streaming: true,
    localOnly: false,
  };
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'careerpilot-ai' } },
    });
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    return Promise.race([
      this.client.models.generateContent({
        model: request.model,
        contents: request.contents,
        config: request.config as never,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI provider request timed out.')), AI_TIMEOUT_MS)
      ),
    ]);
  }
}

class OpenAICompatibleProvider implements AIProvider {
  readonly capabilities: AIProviderCapabilities = {
    structuredOutput: true,
    webGrounding: false,
    toolCalling: false,
    streaming: false,
    localOnly: false,
  };
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
    localOnly = false
  ) {
    this.capabilities.localOnly = localOnly;
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    if (request.config?.tools?.length) {
      throw new Error('The configured OpenAI-compatible provider does not support web grounding tools.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'user', content: request.contents }],
        ...(request.config?.responseMimeType === 'application/json'
          ? {
              response_format: request.config.responseSchema
                ? { type: 'json_schema', json_schema: { name: 'careerpilot_response', schema: toJsonSchema(request.config.responseSchema) } }
                : { type: 'json_object' },
            }
          : {}),
      }),
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}`);
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { text: data.choices?.[0]?.message?.content || '' };
  }
}

class UnavailableProvider implements AIProvider {
  readonly capabilities: AIProviderCapabilities = {
    structuredOutput: false,
    webGrounding: false,
    toolCalling: false,
    streaming: false,
    localOnly: false,
  };
  constructor(private readonly message: string) {}

  async generateContent(): Promise<GenerateContentResponse> {
    throw new Error(this.message);
  }
}

class FallbackProvider implements AIProvider {
  readonly capabilities: AIProviderCapabilities = {
    structuredOutput: true,
    webGrounding: false,
    toolCalling: false,
    streaming: false,
    localOnly: false,
  };
  constructor(private readonly providers: AIProvider[]) {}

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    let lastError: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.generateContent(request);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No configured AI provider is available.');
  }
}

function toJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toJsonSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'type' && typeof child === 'string' ? child.toLowerCase() : toJsonSchema(child),
    ])
  );
}

function createSingleProvider(provider: string): AIProvider {
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new UnavailableProvider('GEMINI_API_KEY is required when AI_PROVIDER=gemini.');
    }
    return new GeminiProvider(apiKey);
  }
  if (provider === 'openai-compatible' || provider === 'local') {
    const baseUrl = process.env.AI_BASE_URL;
    if (!baseUrl) {
      return new UnavailableProvider('AI_BASE_URL is required for the selected AI provider.');
    }
    return new OpenAICompatibleProvider(baseUrl, process.env.AI_API_KEY, provider === 'local');
  }
  return new UnavailableProvider(`Unsupported AI provider: ${provider}`);
}

export function createAIProvider(): AIProvider {
  const configuredProviders = (process.env.AI_PROVIDERS || process.env.AI_PROVIDER || 'gemini')
    .split(',')
    .map((provider) => provider.trim())
    .filter(Boolean);
  const providers = configuredProviders.map(createSingleProvider);
  if (providers.length <= 1 || process.env.AI_ALLOW_FALLBACK !== 'true') {
    return providers[0];
  }
  console.warn('AI provider fallback is enabled; sensitive prompts may be sent to multiple providers.');
  return new FallbackProvider(providers);
}

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

export interface GenerateContentResponse {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
    };
  }>;
}

export interface AIProvider {
  generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
}

class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'careerpilot-ai' } },
    });
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    return this.client.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: request.config as never,
    });
  }
}

class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string
  ) {}

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: 'user', content: request.contents }],
        ...(request.config?.responseMimeType === 'application/json'
          ? { response_format: { type: 'json_object' } }
          : {}),
      }),
    });
    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}`);
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { text: data.choices?.[0]?.message?.content || '' };
  }
}

class UnavailableProvider implements AIProvider {
  constructor(private readonly message: string) {}

  async generateContent(): Promise<GenerateContentResponse> {
    throw new Error(this.message);
  }
}

class FallbackProvider implements AIProvider {
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
    return new OpenAICompatibleProvider(baseUrl, process.env.AI_API_KEY);
  }
  return new UnavailableProvider(`Unsupported AI provider: ${provider}`);
}

export function createAIProvider(): AIProvider {
  const configuredProviders = (process.env.AI_PROVIDERS || process.env.AI_PROVIDER || 'gemini')
    .split(',')
    .map((provider) => provider.trim())
    .filter(Boolean);
  const providers = configuredProviders.map(createSingleProvider);
  return providers.length === 1 ? providers[0] : new FallbackProvider(providers);
}

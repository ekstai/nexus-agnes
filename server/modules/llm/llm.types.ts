export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  apiFormat: 'openai' | 'anthropic' | 'ollama';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  timeoutMs?: number;
}

export interface LlmResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmServiceInterface {
  chat(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmResult>;
  chatRaw(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<string>;
}
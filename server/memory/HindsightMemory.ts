import { HindsightClient, HindsightError } from '@vectorize-io/hindsight-client';
import type { MemoryProvider } from './types';
import type { MemoryHit } from '../types';

export class MemoryServiceError extends Error {
  constructor(message: string, public statusCode = 503) {
    super(message);
    this.name = 'MemoryServiceError';
  }
}

export class HindsightMemory implements MemoryProvider {
  mode = 'hindsight' as const;
  bankId: string;
  private client: HindsightClient;
  private connected = false;
  private connectionError?: string;

  constructor(bankId: string, baseUrl: string, apiKey: string) {
    this.bankId = bankId;
    this.client = new HindsightClient({ baseUrl, apiKey });
  }

  async init() {
    try {
      // In SDK 0.9.0 createBank is a create-or-update operation, so startup is idempotent.
      await this.client.createBank(this.bankId, { name: 'SENTINEL Operational Memory' });
      this.connected = true;
      this.connectionError = undefined;
    } catch (error) {
      const normalized = this.normalizeError(error, 'initialize');
      this.connectionError = normalized.message;
      console.error(`[memory] ${normalized.message}`);
    }
  }

  health() {
    return {
      mode: this.mode,
      connected: this.connected,
      status: this.connected ? 'connected' as const : 'error' as const,
      ...(this.connectionError ? { error: this.connectionError } : {})
    };
  }

  async retain(content: string) {
    try {
      await this.client.retain(this.bankId, content);
    } catch (error) {
      throw this.normalizeError(error, 'retain');
    }
  }

  async recall(query: string): Promise<MemoryHit[]> {
    try {
      const response = await this.client.recall(this.bankId, query, { budget: 'mid', maxTokens: 4096 });
      return response.results.slice(0, 6).map((result) => ({
        text: result.text,
        type: result.type ?? undefined,
        score: result.scores?.final
      }));
    } catch (error) {
      throw this.normalizeError(error, 'recall');
    }
  }

  async reflect(query: string) {
    try {
      const response = await this.client.reflect(this.bankId, query);
      return response.text;
    } catch (error) {
      throw this.normalizeError(error, 'reflect');
    }
  }

  private normalizeError(error: unknown, operation: string) {
    if (!(error instanceof HindsightError)) {
      return new MemoryServiceError(`Hindsight ${operation} failed`, 503);
    }

    const status = error.statusCode;
    const message = status === 401
      ? 'Hindsight authentication failed; check HINDSIGHT_API_KEY'
      : status === 402
        ? 'Hindsight account requires billing or additional credits'
        : status === 404
          ? `Hindsight memory bank "${this.bankId}" was not found`
          : status && status >= 500
            ? 'Hindsight service is temporarily unavailable'
            : `Hindsight ${operation} failed${status ? ` (${status})` : ''}`;

    return new MemoryServiceError(message, status && status >= 400 && status < 500 ? status : 503);
  }
}

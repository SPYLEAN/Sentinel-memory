import { HindsightClient, HindsightError } from '@vectorize-io/hindsight-client';
import type { MemoryProvider, MemoryQueryOptions, RetainOptions } from './types.js';
import type { MemoryHit } from '../types.js';

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
      await this.client.createBank(this.bankId, {
        reflectMission: 'SENTINEL is a physical-operations memory system. Ground answers in retained incidents, actions, outcomes, failures, and reusable lessons so operators can make safer physical-space decisions.',
        retainMission: 'Extract operational experience from physical-space incidents. Preserve incident context, selected actions, measured outcomes, failures, successes, and reusable lessons. Do not treat the content as chat history.',
        retainExtractionMode: 'concise',
        enableObservations: true,
        observationsMission: 'Consolidate recurring physical-operations patterns only when supported by incident outcomes. Preserve differences between successful, partial, and failed interventions.',
        enableTemporalRetrieval: true,
        enableGraphRetrieval: true,
        enableReranking: true
      });
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

  async retain(content: string, options?: RetainOptions) {
    try {
      console.info('[memory trace] RETAIN START');
      await this.client.retain(this.bankId, content, {
        timestamp: options?.timestamp,
        context: options?.context,
        metadata: options?.metadata,
        documentId: options?.documentId,
        tags: options?.tags ?? ['sentinel-operational-experience'],
        updateMode: options?.updateMode
      });
      console.info('[memory trace] RETAIN COMPLETE');
    } catch (error) {
      throw this.normalizeError(error, 'retain');
    }
  }

  async recall(query: string, options?: MemoryQueryOptions): Promise<MemoryHit[]> {
    try {
      console.info('[memory trace] RECALL START');
      const response = await this.client.recall(this.bankId, query, {
        budget: 'mid',
        maxTokens: 4096,
        types: ['world', 'experience', 'observation'],
        preferObservations: true,
        includeSourceFacts: true,
        tags: options?.tags ?? ['sentinel-operational-experience'],
        tagsMatch: options?.tagsMatch ?? 'any_strict'
      });
      const memories = response.results.slice(0, 6).map((result) => ({
        text: result.text,
        type: result.type ?? undefined,
        score: result.scores?.final,
        evidence: {
          id: result.id,
          context: result.context ?? undefined,
          documentId: result.document_id ?? undefined,
          tags: result.tags ?? undefined,
          sourceFactIds: result.source_fact_ids ?? undefined
        }
      }));
      console.info(`[memory trace] RECALL COMPLETE - ${memories.length} MEMORIES FOUND`);
      return memories;
    } catch (error) {
      throw this.normalizeError(error, 'recall');
    }
  }

  async reflect(query: string, context?: string, options?: MemoryQueryOptions) {
    try {
      const response = await this.client.reflect(this.bankId, query, {
        context,
        budget: 'mid',
        factTypes: ['world', 'experience', 'observation'],
        includeFacts: true,
        tags: options?.tags ?? ['sentinel-operational-experience'],
        tagsMatch: options?.tagsMatch ?? 'any_strict'
      });
      return { text: response.text, evidence: response.based_on };
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

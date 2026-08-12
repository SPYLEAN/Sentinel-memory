import type { MemoryHit } from '../types.js';

export interface MemoryHealth {
  mode: 'hindsight' | 'fallback';
  connected: boolean;
  status: 'connected' | 'demo' | 'error';
  error?: string;
}

export interface RetainOptions {
  timestamp?: string;
  context?: string;
  metadata?: Record<string, string>;
  documentId?: string;
  tags?: string[];
  updateMode?: 'replace' | 'append';
}

export interface ReflectResult {
  text: string;
  evidence?: unknown;
}

export interface MemoryQueryOptions {
  tags?: string[];
  tagsMatch?: 'any' | 'all' | 'any_strict' | 'all_strict' | 'exact';
}

export interface MemoryProvider {
  mode: 'hindsight' | 'fallback';
  bankId: string;
  init(): Promise<void>;
  health(): MemoryHealth;
  retain(content: string, options?: RetainOptions): Promise<void>;
  recall(query: string, options?: MemoryQueryOptions): Promise<MemoryHit[]>;
  reflect(query: string, context?: string, options?: MemoryQueryOptions): Promise<ReflectResult>;
}

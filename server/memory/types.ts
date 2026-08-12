import type { MemoryHit } from '../types';

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

export interface MemoryProvider {
  mode: 'hindsight' | 'fallback';
  bankId: string;
  init(): Promise<void>;
  health(): MemoryHealth;
  retain(content: string, options?: RetainOptions): Promise<void>;
  recall(query: string): Promise<MemoryHit[]>;
  reflect(query: string, context?: string): Promise<ReflectResult>;
}

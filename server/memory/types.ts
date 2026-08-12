import type { MemoryHit } from '../types';

export interface MemoryHealth {
  mode: 'hindsight' | 'fallback';
  connected: boolean;
  status: 'connected' | 'demo' | 'error';
  error?: string;
}

export interface MemoryProvider {
  mode: 'hindsight' | 'fallback';
  bankId: string;
  init(): Promise<void>;
  health(): MemoryHealth;
  retain(content: string): Promise<void>;
  recall(query: string): Promise<MemoryHit[]>;
  reflect(query: string): Promise<string>;
}

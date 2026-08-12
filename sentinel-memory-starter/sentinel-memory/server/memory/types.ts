import type { MemoryHit } from '../types';
export interface MemoryProvider {
  mode: 'hindsight' | 'fallback';
  bankId: string;
  init(): Promise<void>;
  retain(content: string): Promise<void>;
  recall(query: string): Promise<MemoryHit[]>;
  reflect(query: string): Promise<string>;
}

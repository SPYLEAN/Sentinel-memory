import type { MemoryProvider } from './types.js';
import type { MemoryHit } from '../types.js';

export class FallbackMemory implements MemoryProvider {
  mode = 'fallback' as const;
  bankId: string;
  private memories: string[] = [];
  constructor(bankId: string) { this.bankId = bankId; }
  async init() {}
  health() { return { mode: this.mode, connected: true, status: 'demo' as const }; }
  async retain(content: string) { this.memories.push(content); }
  async recall(query: string): Promise<MemoryHit[]> {
    const terms = new Set(query.toLowerCase().split(/\W+/).filter(x => x.length > 3));
    return this.memories
      .map(text => ({ text, score: [...terms].filter(t => text.toLowerCase().includes(t)).length }))
      .filter(x => x.score > 0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,5)
      .map(x => ({ text:x.text, type:'experience', score:x.score }));
  }
  async reflect(query: string) {
    const hits = await this.recall(query);
    if (!hits.length) return { text: 'I do not have enough operational memory yet. Resolve more incidents so I can learn from outcomes.' };
    return { text: `I found ${hits.length} related operational memories. The strongest evidence says: ${hits[0].text}`, evidence: hits };
  }
}

import { HindsightClient } from '@vectorize-io/hindsight-client';
import type { MemoryProvider } from './types';
import type { MemoryHit } from '../types';

export class HindsightMemory implements MemoryProvider {
  mode = 'hindsight' as const;
  bankId: string;
  private client: HindsightClient;

  constructor(bankId: string, baseUrl: string, apiKey: string) {
    this.bankId = bankId;
    this.client = new HindsightClient({ baseUrl, apiKey });
  }

  async init() {
    try {
      await this.client.createBank(this.bankId, { name: 'SENTINEL Operational Memory' });
    } catch (error) {
      // Bank creation is idempotent-ish for our bootstrap purposes; if it already exists, retain/recall still work.
      console.log('[memory] bank ready or already exists');
    }
  }

  async retain(content: string) {
    await this.client.retain(this.bankId, content);
  }

  async recall(query: string): Promise<MemoryHit[]> {
    const response = await this.client.recall(this.bankId, query, { limit: 6 });
    return (response.results ?? []).map((r: any) => ({ text: r.text, type: r.type, score: r.score }));
  }

  async reflect(query: string) {
    const response = await this.client.reflect(this.bankId, query);
    return response.text;
  }
}

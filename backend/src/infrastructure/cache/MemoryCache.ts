import { ICache } from '../../core/cache/ICache';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCache<T> implements ICache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxSize) this.store.clear();
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

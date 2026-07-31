import { Redis } from "@upstash/redis";

interface KvLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

function createRedisClient(): KvLike | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value).then(() => undefined),
  };
}

// Fallback em memória para desenvolvimento local sem Redis configurado.
// Só funciona dentro do mesmo processo (ok para `next dev`); em produção
// na Vercel, configure a integração de Redis para persistir entre requests.
function createMemoryClient(): KvLike {
  const globalStore = globalThis as unknown as { __clinicaMemoryStore?: Map<string, unknown> };
  if (!globalStore.__clinicaMemoryStore) {
    globalStore.__clinicaMemoryStore = new Map();
  }
  const store = globalStore.__clinicaMemoryStore;

  return {
    get: async (key) => (store.has(key) ? (store.get(key) as never) : null),
    set: async (key, value) => {
      store.set(key, value);
    },
  };
}

let client: KvLike | null = null;
let usingMemoryFallback = false;

export function kv(): KvLike {
  if (!client) {
    client = createRedisClient();
    if (!client) {
      usingMemoryFallback = true;
      client = createMemoryClient();
    }
  }
  return client;
}

export function isUsingMemoryFallback(): boolean {
  kv();
  return usingMemoryFallback;
}

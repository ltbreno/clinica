import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

interface KvLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

// Upstash (e outras integrações que expõem uma API REST HTTPS).
function createUpstashClient(): KvLike | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const redis = new UpstashRedis({ url, token });
  return {
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value).then(() => undefined),
  };
}

// Redis Cloud / qualquer provedor que exponha uma connection string
// padrão (redis:// ou rediss://) em vez de uma API REST.
function createTcpRedisClient(): KvLike | null {
  const connectionString =
    process.env.REDIS_URL ?? process.env.REDISCLOUD_URL ?? process.env.KV_URL;

  if (!connectionString) return null;

  const redis = new IORedis(connectionString, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 2,
  });
  return {
    get: async (key) => {
      const raw = await redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as never);
    },
    set: async (key, value) => {
      await redis.set(key, JSON.stringify(value));
    },
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

export type StorageKind = "upstash-rest" | "redis-tcp" | "memory-fallback";

let client: KvLike | null = null;
let storageKind: StorageKind = "memory-fallback";

export function kv(): KvLike {
  if (!client) {
    client = createUpstashClient();
    if (client) {
      storageKind = "upstash-rest";
    } else {
      client = createTcpRedisClient();
      if (client) {
        storageKind = "redis-tcp";
      } else {
        storageKind = "memory-fallback";
        client = createMemoryClient();
      }
    }
  }
  return client;
}

export function isUsingMemoryFallback(): boolean {
  kv();
  return storageKind === "memory-fallback";
}

export function getStorageKind(): StorageKind {
  kv();
  return storageKind;
}

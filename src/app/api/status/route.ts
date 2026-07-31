import { NextResponse } from "next/server";
import { isUsingMemoryFallback } from "@/lib/kv";

export async function GET() {
  return NextResponse.json({
    storage: isUsingMemoryFallback() ? "memory-fallback" : "redis",
    envVarsPresentes: {
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    },
  });
}

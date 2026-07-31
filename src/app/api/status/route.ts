import { NextResponse } from "next/server";
import { getStorageKind } from "@/lib/kv";

export async function GET() {
  return NextResponse.json({
    storage: getStorageKind(),
    envVarsPresentes: {
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
      REDIS_URL: Boolean(process.env.REDIS_URL),
      REDISCLOUD_URL: Boolean(process.env.REDISCLOUD_URL),
      KV_URL: Boolean(process.env.KV_URL),
    },
  });
}

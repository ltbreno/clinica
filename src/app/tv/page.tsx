import { connection } from "next/server";
import TvScreen from "./TvScreen";

export default async function TvPage() {
  // Força renderização por requisição: sem isso, o Next.js pré-renderiza
  // esta página como HTML estático em build time, que fica cacheado (CDN e
  // navegador da TV) e nunca se atualiza entre deploys.
  await connection();
  return <TvScreen />;
}

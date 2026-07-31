import { kv } from "./kv";
import type { Chamada, Consultorio, StatusConsultorio } from "./types";

const CONSULTORIOS_KEY = "clinica:consultorios";
const CHAMADAS_KEY = "clinica:chamadas";
const MAX_CHAMADAS = 20;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getConsultorios(): Promise<Consultorio[]> {
  const list = await kv().get<Consultorio[]>(CONSULTORIOS_KEY);
  return list ?? [];
}

export async function addConsultorio(nome: string): Promise<Consultorio> {
  const consultorios = await getConsultorios();
  const novo: Consultorio = { id: generateId(), nome, status: "livre" };
  await kv().set(CONSULTORIOS_KEY, [...consultorios, novo]);
  return novo;
}

export async function updateConsultorioStatus(
  id: string,
  status: StatusConsultorio
): Promise<Consultorio[]> {
  const consultorios = await getConsultorios();
  const atualizados = consultorios.map((c) => (c.id === id ? { ...c, status } : c));
  await kv().set(CONSULTORIOS_KEY, atualizados);
  return atualizados;
}

export async function renameConsultorio(id: string, nome: string): Promise<Consultorio[]> {
  const consultorios = await getConsultorios();
  const atualizados = consultorios.map((c) => (c.id === id ? { ...c, nome } : c));
  await kv().set(CONSULTORIOS_KEY, atualizados);
  return atualizados;
}

export async function deleteConsultorio(id: string): Promise<Consultorio[]> {
  const consultorios = await getConsultorios();
  const restantes = consultorios.filter((c) => c.id !== id);
  await kv().set(CONSULTORIOS_KEY, restantes);
  return restantes;
}

export async function getChamadas(): Promise<Chamada[]> {
  const list = await kv().get<Chamada[]>(CHAMADAS_KEY);
  return list ?? [];
}

export async function criarChamada(paciente: string, consultorioId: string): Promise<Chamada> {
  const consultorios = await getConsultorios();
  const consultorio = consultorios.find((c) => c.id === consultorioId);
  if (!consultorio) {
    throw new Error("Consultório não encontrado");
  }

  const chamada: Chamada = {
    id: generateId(),
    paciente,
    consultorioId,
    consultorioNome: consultorio.nome,
    criadaEm: Date.now(),
  };

  const chamadas = await getChamadas();
  const atualizadas = [chamada, ...chamadas].slice(0, MAX_CHAMADAS);

  await Promise.all([
    kv().set(CHAMADAS_KEY, atualizadas),
    kv().set(
      CONSULTORIOS_KEY,
      consultorios.map((c) => (c.id === consultorioId ? { ...c, status: "ocupado" } : c))
    ),
  ]);

  return chamada;
}

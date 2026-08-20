export type StatusConsultorio = "livre" | "ocupado";

export interface Consultorio {
  id: string;
  nome: string;
  status: StatusConsultorio;
}

export interface Chamada {
  id: string;
  paciente: string;
  consultorioId: string;
  consultorioNome: string;
  criadaEm: number;
  prioridade: boolean;
}

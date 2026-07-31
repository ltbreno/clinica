"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Chamada, Consultorio } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export default function PainelPage() {
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [novoConsultorio, setNovoConsultorio] = useState("");
  const [pacienteNome, setPacienteNome] = useState("");
  const [consultorioSelecionado, setConsultorioSelecionado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregarDados = useCallback(async () => {
    const [consultoriosRes, chamadasRes] = await Promise.all([
      fetch("/api/consultorios"),
      fetch("/api/chamadas"),
    ]);
    if (consultoriosRes.ok) {
      const data = await consultoriosRes.json();
      setConsultorios(data.consultorios);
    }
    if (chamadasRes.ok) {
      const data = await chamadasRes.json();
      setChamadas(data.chamadas);
    }
  }, []);

  usePolling(carregarDados, POLL_INTERVAL_MS);

  const consultoriosLivres = useMemo(
    () => consultorios.filter((c) => c.status === "livre"),
    [consultorios]
  );

  async function adicionarConsultorio(e: React.FormEvent) {
    e.preventDefault();
    if (!novoConsultorio.trim()) return;
    setErro(null);
    const res = await fetch("/api/consultorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoConsultorio.trim() }),
    });
    if (res.ok) {
      setNovoConsultorio("");
      await carregarDados();
    } else {
      const data = await res.json().catch(() => null);
      setErro(data?.error ?? "Erro ao adicionar consultório");
    }
  }

  async function alternarStatus(consultorio: Consultorio) {
    const novoStatus = consultorio.status === "livre" ? "ocupado" : "livre";
    await fetch(`/api/consultorios/${consultorio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    await carregarDados();
  }

  async function removerConsultorio(id: string) {
    if (!confirm("Remover este consultório?")) return;
    await fetch(`/api/consultorios/${id}`, { method: "DELETE" });
    await carregarDados();
  }

  async function chamarPaciente(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteNome.trim() || !consultorioSelecionado) return;
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/chamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente: pacienteNome.trim(),
          consultorioId: consultorioSelecionado,
        }),
      });
      if (res.ok) {
        setPacienteNome("");
        setConsultorioSelecionado("");
        await carregarDados();
      } else {
        const data = await res.json().catch(() => null);
        setErro(data?.error ?? "Erro ao chamar paciente");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Painel de Gerenciamento
          </h1>
          <div className="flex gap-3">
            <Link
              href="/tv"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Abrir tela de TV
            </Link>
            <Link
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Início
            </Link>
          </div>
        </header>

        {erro && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {erro}
          </div>
        )}

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Chamar Paciente
          </h2>
          <form onSubmit={chamarPaciente} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nome do paciente
              </label>
              <input
                type="text"
                value={pacienteNome}
                onChange={(e) => setPacienteNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Consultório
              </label>
              <select
                value={consultorioSelecionado}
                onChange={(e) => setConsultorioSelecionado(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Selecione...</option>
                {consultorios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.status === "ocupado" ? "(ocupado)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={enviando || !pacienteNome.trim() || !consultorioSelecionado}
              className="h-10 rounded-md bg-zinc-900 px-6 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {enviando ? "Chamando..." : "Chamar"}
            </button>
          </form>
          {consultoriosLivres.length === 0 && consultorios.length > 0 && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              Todos os consultórios estão ocupados.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Consultórios
          </h2>
          <form onSubmit={adicionarConsultorio} className="mb-4 flex gap-2">
            <input
              type="text"
              value={novoConsultorio}
              onChange={(e) => setNovoConsultorio(e.target.value)}
              placeholder="Nome do novo consultório (ex: Consultório 3)"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={!novoConsultorio.trim()}
              className="rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Adicionar
            </button>
          </form>

          {consultorios.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum consultório cadastrado ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {consultorios.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.nome}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "livre"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      }`}
                    >
                      {c.status === "livre" ? "Livre" : "Ocupado"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alternarStatus(c)}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Marcar {c.status === "livre" ? "ocupado" : "livre"}
                    </button>
                    <button
                      onClick={() => removerConsultorio(c.id)}
                      className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Últimas chamadas
          </h2>
          {chamadas.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma chamada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chamadas.map((chamada) => (
                <li
                  key={chamada.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="text-zinc-900 dark:text-zinc-50">
                    <strong>{chamada.paciente}</strong> → {chamada.consultorioNome}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {new Date(chamada.criadaEm).toLocaleTimeString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

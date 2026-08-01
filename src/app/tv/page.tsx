"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Chamada, Consultorio } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

function falar(texto: string) {
  if (!("speechSynthesis" in window)) return;
  // Cancela qualquer fala pendente/travada antes de anunciar a próxima —
  // evita que a fila trave silenciosamente depois da primeira chamada.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  utterance.rate = 0.95;
  // Não força uma voz específica: em várias TVs/navegadores, forçar uma
  // voz pt-BR obtida via getVoices() falha silenciosamente (sem erro, sem
  // som), enquanto a voz padrão do dispositivo funciona normalmente.
  window.speechSynthesis.speak(utterance);
}

function anunciarChamada(chamada: Chamada) {
  falar(`${chamada.paciente}. ${chamada.consultorioNome}.`);
}

function formatarHora(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TvPage() {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [somAtivado, setSomAtivado] = useState(false);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

  const ultimaChamadaIdRef = useRef<string | null>(null);
  const primeiraCargaRef = useRef(true);
  const destaqueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarDados = useCallback(async () => {
    const [chamadasRes, consultoriosRes] = await Promise.all([
      fetch("/api/chamadas"),
      fetch("/api/consultorios"),
    ]);

    if (consultoriosRes.ok) {
      const data = await consultoriosRes.json();
      setConsultorios(data.consultorios ?? []);
    }

    if (!chamadasRes.ok) return;
    const data = await chamadasRes.json();
    const lista: Chamada[] = data.chamadas ?? [];

    const maisRecente = lista[0];
    const isPrimeiraCarga = primeiraCargaRef.current;
    primeiraCargaRef.current = false;

    if (maisRecente && maisRecente.id !== ultimaChamadaIdRef.current) {
      ultimaChamadaIdRef.current = maisRecente.id;
      if (!isPrimeiraCarga) {
        setDestaqueId(maisRecente.id);
        if (destaqueTimeoutRef.current) clearTimeout(destaqueTimeoutRef.current);
        destaqueTimeoutRef.current = setTimeout(() => setDestaqueId(null), 4000);

        anunciarChamada(maisRecente);
      }
    }

    setChamadas(lista);
  }, []);

  usePolling(carregarDados, POLL_INTERVAL_MS);

  function ativarSom() {
    // Usa o gesto do toque para desbloquear a síntese de voz (autoplay policy).
    falar("Som ativado.");
    setSomAtivado(true);
  }

  const chamadaAtual = chamadas[0];

  const consultoriosOcupados = useMemo(() => {
    return consultorios
      .filter((c) => c.status === "ocupado")
      .map((c) => ({
        consultorio: c,
        ultimaChamada: chamadas.find((ch) => ch.consultorioId === c.id) ?? null,
      }));
  }, [consultorios, chamadas]);

  const historico = useMemo(() => chamadas.slice(1, 9), [chamadas]);

  if (!somAtivado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-8 text-center">
        <h1 className="text-3xl font-bold text-white">Painel de Chamadas</h1>
        <p className="max-w-md text-zinc-400">
          Toque no botão abaixo para ativar a locução de voz nesta TV.
        </p>
        <button
          onClick={ativarSom}
          className="rounded-lg bg-white px-8 py-4 text-xl font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Ativar som
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-10 bg-zinc-950 p-8 py-12">
      {chamadaAtual ? (
        <div
          key={chamadaAtual.id}
          className={`flex w-full max-w-4xl flex-col items-center gap-4 rounded-3xl border-4 p-16 text-center transition-colors ${
            destaqueId === chamadaAtual.id
              ? "border-emerald-400 bg-emerald-950/40 animate-pulse"
              : "border-zinc-800 bg-zinc-900"
          }`}
        >
          <span className="text-2xl font-medium uppercase tracking-widest text-zinc-400">
            Paciente
          </span>
          <span className="text-6xl font-bold text-white">{chamadaAtual.paciente}</span>
          <span className="text-2xl font-medium uppercase tracking-widest text-zinc-400">
            Dirija-se ao
          </span>
          <span className="text-5xl font-bold text-emerald-400">
            {chamadaAtual.consultorioNome}
          </span>
          <span className="text-lg font-medium text-zinc-500">
            Chamado às {formatarHora(chamadaAtual.criadaEm)}
          </span>
        </div>
      ) : (
        <div className="text-center text-zinc-500">
          <p className="text-2xl">Aguardando chamadas...</p>
        </div>
      )}

      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        {consultoriosOcupados.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-500">
              Consultórios ocupados
            </h2>
            <ul className="flex flex-col gap-2">
              {consultoriosOcupados.map(({ consultorio, ultimaChamada }) => (
                <li
                  key={consultorio.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-900 px-5 py-3 text-zinc-300"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-100">{consultorio.nome}</span>
                    <span className="text-sm text-zinc-400">
                      {ultimaChamada ? ultimaChamada.paciente : "Ocupado"}
                    </span>
                  </div>
                  {ultimaChamada && (
                    <span className="text-sm text-zinc-500">
                      {formatarHora(ultimaChamada.criadaEm)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {historico.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-500">
              Histórico de chamadas
            </h2>
            <ul className="flex flex-col gap-2">
              {historico.map((chamada) => (
                <li
                  key={chamada.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-5 py-2.5 text-zinc-400"
                >
                  <span>
                    {chamada.paciente} <span className="text-zinc-600">·</span>{" "}
                    {chamada.consultorioNome}
                  </span>
                  <span className="text-sm text-zinc-600">{formatarHora(chamada.criadaEm)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

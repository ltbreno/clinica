"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Chamada, Consultorio } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

function playBeep(audioContext: AudioContext) {
  const now = audioContext.currentTime;

  [0, 0.3].forEach((offset) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.6, now + offset + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + offset + 0.25);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.25);
  });
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

  const audioContextRef = useRef<AudioContext | null>(null);
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

        if (audioContextRef.current) {
          playBeep(audioContextRef.current);
        }
      }
    }

    setChamadas(lista);
  }, []);

  usePolling(carregarDados, POLL_INTERVAL_MS);

  function ativarSom() {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;
    playBeep(ctx);
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

  if (!somAtivado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-8 text-center">
        <h1 className="text-3xl font-bold text-white">Painel de Chamadas</h1>
        <p className="max-w-md text-zinc-400">
          Toque no botão abaixo para ativar o som de chamada nesta TV.
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-zinc-950 p-8">
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

      {consultoriosOcupados.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Consultórios ocupados
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
    </div>
  );
}

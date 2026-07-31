"use client";

import { useCallback, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Chamada } from "@/lib/types";

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

export default function TvPage() {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [somAtivado, setSomAtivado] = useState(false);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ultimaChamadaIdRef = useRef<string | null>(null);
  const primeiraCargaRef = useRef(true);
  const destaqueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarChamadas = useCallback(async () => {
    const res = await fetch("/api/chamadas");
    if (!res.ok) return;
    const data = await res.json();
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

  usePolling(carregarChamadas, POLL_INTERVAL_MS);

  function ativarSom() {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;
    playBeep(ctx);
    setSomAtivado(true);
  }

  const chamadaAtual = chamadas[0];
  const historico = chamadas.slice(1, 6);

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
        </div>
      ) : (
        <div className="text-center text-zinc-500">
          <p className="text-2xl">Aguardando chamadas...</p>
        </div>
      )}

      {historico.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Chamadas anteriores
          </h2>
          <ul className="flex flex-col gap-2">
            {historico.map((chamada) => (
              <li
                key={chamada.id}
                className="flex items-center justify-between rounded-lg bg-zinc-900 px-5 py-3 text-zinc-300"
              >
                <span>{chamada.paciente}</span>
                <span className="text-zinc-500">{chamada.consultorioNome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

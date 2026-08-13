"use client";

// TVs antigas podem não ter window.fetch nativo (API de ~2015-2017). Este
// polyfill só entra em ação quando fetch não existe — não afeta navegadores
// modernos nem o build/SSR (Node já tem fetch nativo).
import "whatwg-fetch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import type { Chamada, Consultorio } from "@/lib/types";

const POLL_INTERVAL_MS = 2500;

// WAV silencioso de 1 amostra, usado só para desbloquear a reprodução de
// elementos <audio> caso o navegador exija algum gesto do usuário.
const AUDIO_SILENCIOSO =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

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

// Toca a locução já sintetizada no servidor (Google Cloud TTS) como um
// arquivo de áudio comum — não depende de motor de voz local na TV.
function tocarLocucao(chamada: Chamada): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`/api/chamadas/${chamada.id}/audio`);
    audio.addEventListener("error", () => reject(new Error("falha ao carregar áudio")));
    audio.play().then(resolve).catch(reject);
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
  const [destaqueId, setDestaqueId] = useState<string | null>(null);
  const [statusAudio, setStatusAudio] = useState("aguardando primeira chamada");
  const [estadoAudioContext, setEstadoAudioContext] = useState("não iniciado");
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ultimaChamadaIdRef = useRef<string | null>(null);
  const primeiraCargaRef = useRef(true);
  const destaqueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A TV pode não ter mouse/controle capaz de clicar num botão na tela, então
  // não há um gesto explícito de "ativar som" para o usuário disparar. Em vez
  // disso: cria o AudioContext direto ao carregar (funciona sem gesto em
  // navegadores que não aplicam a autoplay policy — comum em TVs antigas) e,
  // como plano B, tenta desbloquear em qualquer interação que eventualmente
  // aconteça (clique, tecla do controle, toque).
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;
    Promise.resolve().then(() => setEstadoAudioContext(ctx.state));

    const desbloquear = () => {
      ctx.resume().then(() => setEstadoAudioContext(ctx.state));
      new Audio(AUDIO_SILENCIOSO).play().catch(() => {});
    };
    document.addEventListener("click", desbloquear);
    document.addEventListener("keydown", desbloquear);
    document.addEventListener("touchstart", desbloquear);

    return () => {
      document.removeEventListener("click", desbloquear);
      document.removeEventListener("keydown", desbloquear);
      document.removeEventListener("touchstart", desbloquear);
    };
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const [chamadasRes, consultoriosRes] = await Promise.all([
        fetch("/api/chamadas"),
        fetch("/api/consultorios"),
      ]);

      if (consultoriosRes.ok) {
        const data = await consultoriosRes.json();
        setConsultorios(data.consultorios ?? []);
      }

      if (!chamadasRes.ok) {
        setErroCarregamento(`/api/chamadas retornou ${chamadasRes.status}`);
        return;
      }
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

          const ctx = audioContextRef.current;
          if (ctx) {
            ctx.resume().finally(() => playBeep(ctx));
          }

          tocarLocucao(maisRecente).then(
            () => setStatusAudio("locução tocada com sucesso"),
            (erro) => setStatusAudio(`erro na locução: ${erro instanceof Error ? erro.message : erro}`)
          );
        }
      }

      setChamadas(lista);
      setErroCarregamento(null);
    } catch (erro) {
      setErroCarregamento(erro instanceof Error ? erro.message : String(erro));
    }
  }, []);

  usePolling(carregarDados, POLL_INTERVAL_MS);

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

      <p className="mt-auto text-xs text-zinc-700">
        Contexto de áudio: {estadoAudioContext} · Áudio: {statusAudio}
        {erroCarregamento && <> · Erro ao buscar dados: {erroCarregamento}</>}
      </p>
    </div>
  );
}

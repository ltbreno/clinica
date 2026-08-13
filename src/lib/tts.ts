const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
// Voz padrão pública da ElevenLabs ("Rachel"), compatível com o modelo
// multilíngue — pode ser trocada via ELEVENLABS_VOICE_ID sem mudar código.
const ELEVENLABS_VOICE_ID_PADRAO = "21m00Tcm4TlvDq8ikWAM";

async function sintetizarVozElevenLabs(texto: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY não configurada");
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || ELEVENLABS_VOICE_ID_PADRAO;

  const res = await fetch(`${ELEVENLABS_TTS_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: texto,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Erro na síntese de voz (${res.status}): ${detalhe}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function sintetizarVozGoogle(texto: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_API_KEY não configurada");
  }

  const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: texto },
      voice: { languageCode: "pt-BR", name: "pt-BR-Neural2-B" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Erro na síntese de voz (${res.status}): ${detalhe}`);
  }

  const data: { audioContent: string } = await res.json();
  return Buffer.from(data.audioContent, "base64");
}

export async function sintetizarVoz(texto: string): Promise<Buffer> {
  if (process.env.ELEVENLABS_API_KEY) return sintetizarVozElevenLabs(texto);
  if (process.env.GOOGLE_TTS_API_KEY) return sintetizarVozGoogle(texto);
  throw new Error("Nenhuma API de TTS configurada (ELEVENLABS_API_KEY ou GOOGLE_TTS_API_KEY)");
}

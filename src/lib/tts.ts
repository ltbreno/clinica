const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

export async function sintetizarVoz(texto: string): Promise<Buffer> {
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

import { NextRequest, NextResponse } from "next/server";
import { getChamadas } from "@/lib/store";
import { sintetizarVoz } from "@/lib/tts";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chamadas = await getChamadas();
  const chamada = chamadas.find((c) => c.id === id);

  if (!chamada) {
    return NextResponse.json({ error: "Chamada não encontrada" }, { status: 404 });
  }

  try {
    const audio = await sintetizarVoz(`${chamada.paciente}. ${chamada.consultorioNome}.`);
    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar áudio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

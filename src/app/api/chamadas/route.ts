import { NextRequest, NextResponse } from "next/server";
import { criarChamada, getChamadas } from "@/lib/store";

export async function GET() {
  const chamadas = await getChamadas();
  return NextResponse.json(
    { chamadas },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const paciente = typeof body?.paciente === "string" ? body.paciente.trim() : "";
  const consultorioId = typeof body?.consultorioId === "string" ? body.consultorioId : "";
  const prioridade = body?.prioridade === true;

  if (!paciente || !consultorioId) {
    return NextResponse.json(
      { error: "Paciente e consultório são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const chamada = await criarChamada(paciente, consultorioId, prioridade);
    return NextResponse.json({ chamada }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar chamada";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

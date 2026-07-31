import { NextRequest, NextResponse } from "next/server";
import { addConsultorio, getConsultorios } from "@/lib/store";

export async function GET() {
  const consultorios = await getConsultorios();
  return NextResponse.json({ consultorios });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";

  if (!nome) {
    return NextResponse.json({ error: "Nome do consultório é obrigatório" }, { status: 400 });
  }

  const consultorio = await addConsultorio(nome);
  return NextResponse.json({ consultorio }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { deleteConsultorio, renameConsultorio, updateConsultorioStatus } from "@/lib/store";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.status === "string") {
    if (body.status !== "livre" && body.status !== "ocupado") {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    const consultorios = await updateConsultorioStatus(id, body.status);
    return NextResponse.json({ consultorios });
  }

  if (typeof body?.nome === "string" && body.nome.trim()) {
    const consultorios = await renameConsultorio(id, body.nome.trim());
    return NextResponse.json({ consultorios });
  }

  return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const consultorios = await deleteConsultorio(id);
  return NextResponse.json({ consultorios });
}

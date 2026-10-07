import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, type, icon, color } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Nome e tipo são obrigatórios" }, { status: 400 });
    }

    const cat = await prisma.category.create({
      data: {
        workspaceId: session.workspaceId,
        name: name.trim(),
        type,
        icon: icon || "Tag",
        color: color || "#64748b",
      },
    });

    return NextResponse.json(cat);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao criar categoria" }, { status: 500 });
  }
}

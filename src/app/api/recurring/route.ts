import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replicateRecurringItem } from "@/lib/engine";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const items = await prisma.recurringItem.findMany({
      where: { workspaceId: session.workspaceId },
      include: { category: true },
      orderBy: { dueDay: "asc" },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao listar itens recorrentes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { title, type, dueDay, amount, categoryId, startYear, startMonth, monthsDuration } = await req.json();

    if (!title || !dueDay || amount === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const itemType = type === "ENTRADA" ? "ENTRADA" : "SAIDA_FIXA";
    const duration = monthsDuration ? parseInt(monthsDuration, 10) : 36;

    const item = await prisma.recurringItem.create({
      data: {
        workspaceId: session.workspaceId,
        title: title.trim(),
        type: itemType,
        dueDay: parseInt(dueDay, 10),
        amount: Math.abs(parseFloat(amount)),
        categoryId: categoryId || null,
        monthsDuration: duration,
        isActive: true,
      },
      include: { category: true },
    });

    // Replicar automaticamente para os meses posteriores configurados (padrão 36 meses)
    const now = new Date();
    const y = startYear ? parseInt(startYear, 10) : now.getFullYear();
    const m = startMonth ? parseInt(startMonth, 10) : now.getMonth() + 1;

    await replicateRecurringItem(session.workspaceId, item.id, y, m, duration);

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("Create recurring error:", error);
    return NextResponse.json({ error: "Erro ao criar item recorrente" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    // 1. Remover transações futuras pendentes deste item
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    await prisma.transaction.deleteMany({
      where: {
        workspaceId: session.workspaceId,
        recurringItemId: id,
        isPaid: false,
        date: { gte: startOfCurrentMonth },
      },
    });

    // 2. Remover o item recorrente
    await prisma.recurringItem.deleteMany({
      where: { id, workspaceId: session.workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao remover item" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replicateRecurringItem } from "@/lib/engine";

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { description, amount, type, date, categoryId, isPaid, isRecurring, monthsDuration } = body;

    if (!description || !amount || !type || !date) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // Parse date (garantir hora segura para timezone)
    const dateObj = new Date(date + "T12:00:00Z");
    const numAmount = Math.abs(parseFloat(amount));
    const duration = monthsDuration ? parseInt(monthsDuration, 10) : 36;

    let recurringItemId: string | null = null;
    let recItemIdToReplicate: string | null = null;

    if (isRecurring && (type === "ENTRADA" || type === "SAIDA_FIXA")) {
      const recItem = await prisma.recurringItem.create({
        data: {
          workspaceId: session.workspaceId,
          title: description.trim(),
          type: type === "ENTRADA" ? "ENTRADA" : "SAIDA_FIXA",
          dueDay: dateObj.getUTCDate(),
          amount: numAmount,
          categoryId: categoryId || null,
          monthsDuration: duration,
          isActive: true,
        },
      });
      recurringItemId = recItem.id;
      recItemIdToReplicate = recItem.id;
    }

    const tx = await prisma.transaction.create({
      data: {
        workspaceId: session.workspaceId,
        recurringItemId,
        description: description.trim(),
        amount: numAmount,
        type, // "ENTRADA" | "SAIDA_FIXA" | "GASTO_DIARIO"
        date: dateObj,
        categoryId: categoryId || null,
        isPaid: isPaid ?? (type === "GASTO_DIARIO" ? true : false),
      },
      include: { category: true },
    });

    if (recItemIdToReplicate) {
      // Replicar imediatamente para todos os meses posteriores configurados (padrão 36 meses)
      await replicateRecurringItem(
        session.workspaceId,
        recItemIdToReplicate,
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth() + 1,
        duration
      );
    }

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    return NextResponse.json({ error: "Erro ao salvar transação" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, description, amount, type, date, categoryId, isPaid } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const tx = await prisma.transaction.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    const dateObj = date ? new Date(date + "T12:00:00Z") : tx.date;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        description: description?.trim() ?? tx.description,
        amount: amount !== undefined ? Math.abs(parseFloat(amount)) : tx.amount,
        type: type ?? tx.type,
        date: dateObj,
        categoryId: categoryId !== undefined ? categoryId : tx.categoryId,
        isPaid: isPaid !== undefined ? isPaid : tx.isPaid,
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    console.error("Update transaction error:", error);
    return NextResponse.json({ error: "Erro ao atualizar transação" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const tx = await prisma.transaction.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return NextResponse.json({ error: "Erro ao excluir transação" }, { status: 500 });
  }
}

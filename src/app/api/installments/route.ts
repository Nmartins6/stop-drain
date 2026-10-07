import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { replicateInstallmentPlan, handlePaymentStatusChange } from "@/lib/engine";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const plans = await prisma.installmentPlan.findMany({
      where: { workspaceId: session.workspaceId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao listar parcelamentos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const {
      description,
      totalInstallments,
      currentInstallment,
      monthlyAmount,
      dueDay,
      categoryId,
      startYear,
      startMonth,
      firstInstallmentPaid,
    } = await req.json();

    if (!description || !totalInstallments || !monthlyAmount || !dueDay) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const total = parseInt(totalInstallments, 10);
    const current = currentInstallment ? parseInt(currentInstallment, 10) : 1;
    const monthly = Math.abs(parseFloat(monthlyAmount));
    const remainingInstallments = Math.max(0, total - current + 1);
    const remainingBalance = Number((remainingInstallments * monthly).toFixed(2));
    const now = new Date();
    const y = startYear ? parseInt(startYear, 10) : now.getFullYear();
    const m = startMonth ? parseInt(startMonth, 10) : now.getMonth() + 1;

    const plan = await prisma.installmentPlan.create({
      data: {
        workspaceId: session.workspaceId,
        description: description.trim(),
        totalInstallments: total,
        currentInstallment: current,
        monthlyAmount: monthly,
        remainingBalance,
        dueDay: parseInt(dueDay, 10),
        startYear: y,
        startMonth: m,
        categoryId: categoryId || null,
        isActive: remainingBalance > 0,
      },
      include: { category: true },
    });

    // Replicar as parcelas nos meses consecutivos correspondentes
    await replicateInstallmentPlan(session.workspaceId, plan.id, y, m);

    // Se a primeira parcela já tiver sido paga no momento da compra
    if (firstInstallmentPaid) {
      const firstTx = await prisma.transaction.findFirst({
        where: {
          workspaceId: session.workspaceId,
          installmentPlanId: plan.id,
        },
        orderBy: { date: "asc" },
      });
      if (firstTx) {
        await handlePaymentStatusChange(firstTx.id, true);
      }
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("Create installment error:", error);
    return NextResponse.json({ error: "Erro ao criar parcelamento" }, { status: 500 });
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

    // Remover transações pendentes não pagas
    await prisma.transaction.deleteMany({
      where: {
        workspaceId: session.workspaceId,
        installmentPlanId: id,
        isPaid: false,
      },
    });

    await prisma.installmentPlan.deleteMany({
      where: { id, workspaceId: session.workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao remover parcelamento" }, { status: 500 });
  }
}

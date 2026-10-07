import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { handlePaymentStatusChange } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;
    const { isPaid } = await req.json();

    const tx = await prisma.transaction.findFirst({
      where: { id, workspaceId: session.workspaceId },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    await handlePaymentStatusChange(id, Boolean(isPaid));

    const updated = await prisma.transaction.findUnique({
      where: { id },
      include: { installmentPlan: true, category: true },
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    console.error("Toggle paid error:", error);
    return NextResponse.json({ error: "Erro ao alterar status de pagamento" }, { status: 500 });
  }
}

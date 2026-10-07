import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getMonthlyCashFlow } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    const cashFlow = await getMonthlyCashFlow(session.workspaceId, year, month);

    return NextResponse.json(cashFlow);
  } catch (error: any) {
    console.error("CashFlow error:", error);
    return NextResponse.json({ error: "Erro ao carregar fluxo de caixa" }, { status: 500 });
  }
}

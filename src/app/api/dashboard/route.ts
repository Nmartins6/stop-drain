import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const data = await getDashboardData(session.workspaceId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erro ao carregar dados do dashboard" }, { status: 500 });
  }
}

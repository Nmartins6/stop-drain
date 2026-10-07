import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getWorkspaceYears,
  addWorkspaceYear,
  getYearSummary,
  deleteWorkspaceYear,
} from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const summaryYear = searchParams.get("summaryYear");

    if (summaryYear) {
      const year = parseInt(summaryYear, 10);
      if (isNaN(year)) {
        return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
      }
      const summary = await getYearSummary(session.workspaceId, year);
      return NextResponse.json({ summary });
    }

    const years = await getWorkspaceYears(session.workspaceId);
    return NextResponse.json({ years });
  } catch (error: any) {
    console.error("GET /api/years error:", error);
    return NextResponse.json({ error: "Erro ao consultar anos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const year = parseInt(body.year, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano inválido (deve ser entre 2000 e 2100)" }, { status: 400 });
    }

    const confirmIntermediate = Boolean(body.confirmIntermediate);
    const result = await addWorkspaceYear(session.workspaceId, year, confirmIntermediate);

    if (result.requiresConfirmation) {
      return NextResponse.json({
        requiresConfirmation: true,
        missingYears: result.missingYears,
        year,
      });
    }

    return NextResponse.json({
      success: true,
      year,
      years: result.years,
      createdYears: result.createdYears,
    });
  } catch (error: any) {
    console.error("POST /api/years error:", error);
    return NextResponse.json({ error: "Erro ao adicionar ano" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let yearParam = searchParams.get("year");

    if (!yearParam) {
      try {
        const body = await req.json();
        yearParam = body.year;
      } catch {
        // no body
      }
    }

    const year = parseInt(yearParam || "", 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano inválido para exclusão" }, { status: 400 });
    }

    const result = await deleteWorkspaceYear(session.workspaceId, year);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE /api/years error:", error);
    return NextResponse.json({ error: "Erro ao excluir ano e dados" }, { status: 500 });
  }
}

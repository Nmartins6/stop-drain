import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyCashFlow } from "@/lib/engine";

export async function GET(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const records = [];
    let totalYearSaved = 0;
    let totalYearEntradas = 0;

    for (let m = 1; m <= 12; m++) {
      const yearMonth = `${year}-${String(m).padStart(2, "0")}`;
      const savedRec = await prisma.savingsRecord.findUnique({
        where: {
          workspaceId_yearMonth: {
            workspaceId: session.workspaceId,
            yearMonth,
          },
        },
      });

      const flow = await getMonthlyCashFlow(session.workspaceId, year, m);
      const entradas = flow.summary.totalEntradas;
      const amountSaved = savedRec?.amountSaved || 0;
      const rate = entradas > 0 ? Number(((amountSaved / entradas) * 100).toFixed(1)) : 0;

      totalYearSaved += amountSaved;
      totalYearEntradas += entradas;

      records.push({
        month: m,
        monthName: monthNames[m - 1],
        yearMonth,
        entradas,
        amountSaved,
        savingsRate: rate,
        notes: savedRec?.notes || "",
      });
    }

    const overallRate = totalYearEntradas > 0
      ? Number(((totalYearSaved / totalYearEntradas) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      year,
      totalYearSaved,
      totalYearEntradas,
      overallRate,
      records,
    });
  } catch (error: any) {
    console.error("Savings error:", error);
    return NextResponse.json({ error: "Erro ao buscar economia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { yearMonth, amountSaved, notes } = await req.json();

    if (!yearMonth || amountSaved === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const record = await prisma.savingsRecord.upsert({
      where: {
        workspaceId_yearMonth: {
          workspaceId: session.workspaceId,
          yearMonth,
        },
      },
      update: {
        amountSaved: Math.abs(parseFloat(amountSaved)),
        notes: notes || null,
      },
      create: {
        workspaceId: session.workspaceId,
        yearMonth,
        amountSaved: Math.abs(parseFloat(amountSaved)),
        notes: notes || null,
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao salvar aporte" }, { status: 500 });
  }
}

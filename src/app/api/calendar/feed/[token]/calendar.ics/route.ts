import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateICalFeed } from "@/lib/ical";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const workspace = await prisma.workspace.findUnique({
      where: { calendarToken: token },
    });

    if (!workspace) {
      return new NextResponse("Calendário não encontrado ou token inválido", {
        status: 404,
      });
    }

    // Buscar contas pendentes a partir de 30 dias atrás até 90 dias no futuro
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 30);
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 90);

    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        workspaceId: workspace.id,
        isPaid: false,
        date: { gte: pastDate, lte: futureDate },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    });

    const icsContent = generateICalFeed(workspace.name, pendingTransactions);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="financial-vencimentos.ics"',
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("iCal feed error:", error);
    return new NextResponse("Erro ao gerar feed iCal", { status: 500 });
  }
}

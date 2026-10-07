import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
    select: { id: true, name: true, calendarToken: true },
  });

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
    },
    workspace,
  });
}

import { prisma } from "../src/lib/prisma";

async function inspect() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log("Users:", users);

  const workspaces = await prisma.workspace.findMany();
  console.log("Workspaces:", workspaces.map(w => ({ id: w.id, name: w.name })));

  const recurring = await prisma.recurringItem.findMany();
  console.log("Recurring Items count:", recurring.length);
  for (const r of recurring) {
    console.log(`- [${r.workspaceId}] [${r.type}] ${r.title}: R$ ${r.amount} (dia ${r.dueDay})`);
  }

  const installments = await prisma.installmentPlan.findMany();
  console.log("Installment Plans count:", installments.length);
  for (const inst of installments) {
    console.log(`- [${inst.workspaceId}] ${inst.description}: ${inst.totalInstallments}x R$ ${inst.monthlyAmount} (restam ${inst.totalInstallments - inst.currentInstallment + 1}, bal R$ ${inst.remainingBalance})`);
  }

  const txs = await prisma.transaction.findMany({
    orderBy: { date: "asc" },
  });
  console.log("Transactions total count:", txs.length);

  // Agrupar transações por ano e mês
  const byMonth: Record<string, number> = {};
  for (const t of txs) {
    const d = new Date(t.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  console.log("Transactions by month:", byMonth);
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

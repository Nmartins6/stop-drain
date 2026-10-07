import { prisma } from "../src/lib/prisma";
import { replicateInstallmentPlan, getMonthlyCashFlow } from "../src/lib/engine";

async function testInstallments() {
  const ws = await prisma.workspace.findFirst();
  if (!ws) throw new Error("Workspace not found");

  console.log("=== TESTANDO CRIAÇÃO DE PARCELAMENTO 12x ===");

  const plan = await prisma.installmentPlan.create({
    data: {
      workspaceId: ws.id,
      description: "Notebook Dell 12x Teste",
      totalInstallments: 12,
      currentInstallment: 1,
      monthlyAmount: 250.0,
      remainingBalance: 3000.0,
      dueDay: 15,
      isActive: true,
    },
  });

  // Replicar a partir de Outubro/2026 (mes 10)
  await replicateInstallmentPlan(ws.id, plan.id, 2026, 10);

  const txs = await prisma.transaction.findMany({
    where: { installmentPlanId: plan.id },
    orderBy: { date: "asc" },
  });

  console.log(`Transações geradas: ${txs.length} parcelas`);
  for (const t of txs) {
    const d = new Date(t.date);
    console.log(
      `  - ${t.description} | R$ ${t.amount} | data: ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
    );
  }

  // Verificar se reflete no mês atual (outubro) e nos meses seguintes
  const flowOut = await getMonthlyCashFlow(ws.id, 2026, 10);
  const flowNov = await getMonthlyCashFlow(ws.id, 2026, 11);
  const flowSet27 = await getMonthlyCashFlow(ws.id, 2027, 9);
  const flowOut27 = await getMonthlyCashFlow(ws.id, 2027, 10);

  console.log(`\nFluxo Out/2026 (Parcela 1): Saídas Fixas = R$ ${flowOut.summary.totalSaidasFixas}`);
  console.log(`Fluxo Nov/2026 (Parcela 2): Saídas Fixas = R$ ${flowNov.summary.totalSaidasFixas}`);
  console.log(`Fluxo Set/2027 (Parcela 12): Saídas Fixas = R$ ${flowSet27.summary.totalSaidasFixas}`);
  console.log(`Fluxo Out/2027 (Após Quitação): Saídas Fixas = R$ ${flowOut27.summary.totalSaidasFixas}`);

  // Cleanup
  await prisma.transaction.deleteMany({ where: { installmentPlanId: plan.id } });
  await prisma.installmentPlan.delete({ where: { id: plan.id } });
  console.log("\n>>> Teste concluído com sucesso! <<<");
}

testInstallments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

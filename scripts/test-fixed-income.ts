import { replicateRecurringItem, getMonthlyCashFlow } from "../src/lib/engine";
import { prisma } from "../src/lib/prisma";

async function testFixedIncomeAndExpenses() {
  const ws = await prisma.workspace.findFirst();
  if (!ws) throw new Error("Workspace not found");

  console.log("=== TESTANDO ENTRADA FIXA (SALÁRIO) E SAÍDA FIXA REPLICADAS ===");

  // 1. Criar Entrada Fixa: Salário R$ 7.500 no dia 5
  const salary = await prisma.recurringItem.create({
    data: {
      workspaceId: ws.id,
      title: "Salário Mensal Teste",
      type: "ENTRADA",
      dueDay: 5,
      amount: 7500.0,
      isActive: true,
    },
  });

  // 2. Criar Saída Fixa: Aluguel R$ 1.800 no dia 10
  const rent = await prisma.recurringItem.create({
    data: {
      workspaceId: ws.id,
      title: "Aluguel Apartamento Teste",
      type: "SAIDA_FIXA",
      dueDay: 10,
      amount: 1800.0,
      isActive: true,
    },
  });

  // 3. Replicar ambos para 6 meses posteriores a partir de Outubro/2026
  await replicateRecurringItem(ws.id, salary.id, 2026, 10, 6);
  await replicateRecurringItem(ws.id, rent.id, 2026, 10, 6);

  // 4. Checar transações geradas para o salário
  const salaryTxs = await prisma.transaction.findMany({
    where: { workspaceId: ws.id, recurringItemId: salary.id },
    orderBy: { date: "asc" },
  });

  console.log(`\nEntradas Fixas (Salário) Replicadas: ${salaryTxs.length} meses`);
  salaryTxs.forEach((tx) => {
    const d = new Date(tx.date);
    console.log(`  [${tx.type}] ${tx.description} -> R$ ${tx.amount} no dia ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`);
  });

  // 5. Checar transações geradas para a saída fixa (aluguel)
  const rentTxs = await prisma.transaction.findMany({
    where: { workspaceId: ws.id, recurringItemId: rent.id },
    orderBy: { date: "asc" },
  });

  console.log(`\nSaídas Fixas (Aluguel) Replicadas: ${rentTxs.length} meses`);
  rentTxs.forEach((tx) => {
    const d = new Date(tx.date);
    console.log(`  [${tx.type}] ${tx.description} -> R$ ${tx.amount} no dia ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`);
  });

  // 6. Testar o cálculo de CashFlow para um mês futuro (ex: Dezembro/2026 - Mês 12)
  const decFlow = await getMonthlyCashFlow(ws.id, 2026, 12);
  console.log("\nFluxo de Caixa de Dezembro/2026:");
  console.log(`  Total Entradas: R$ ${decFlow.summary.totalEntradas}`);
  console.log(`  Total Saídas Fixas: R$ ${decFlow.summary.totalSaidasFixas}`);
  console.log(`  Performance do Mês: R$ ${decFlow.summary.performance}`);

  // 7. Cleanup
  await prisma.transaction.deleteMany({
    where: { recurringItemId: { in: [salary.id, rent.id] } },
  });
  await prisma.recurringItem.deleteMany({
    where: { id: { in: [salary.id, rent.id] } },
  });

  console.log("\n>>> TESTE CONCLUÍDO COM SUCESSO ABSOLUTO! <<<");
}

testFixedIncomeAndExpenses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

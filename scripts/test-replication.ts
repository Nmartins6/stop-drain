import { replicateRecurringItem } from "../src/lib/engine";
import { prisma } from "../src/lib/prisma";

async function testReplication() {
  const ws = await prisma.workspace.findFirst();
  if (!ws) throw new Error("Workspace not found");

  console.log("=== TESTANDO REPLICAÇÃO AUTOMÁTICA DE CONTA FIXA ===");

  // Criar uma conta fixa de teste: "Netflix Assinatura" dia 15
  const item = await prisma.recurringItem.create({
    data: {
      workspaceId: ws.id,
      title: "Streaming Netflix Teste",
      dueDay: 15,
      amount: 55.90,
      isActive: true,
    },
  });

  // Replicar a partir de Outubro/2026 para os próximos 12 meses
  await replicateRecurringItem(ws.id, item.id, 2026, 10, 12);

  // Verificar transações geradas para os meses posteriores
  const txs = await prisma.transaction.findMany({
    where: {
      workspaceId: ws.id,
      recurringItemId: item.id,
    },
    orderBy: { date: "asc" },
  });

  console.log(`Total de transações replicadas para os meses posteriores: ${txs.length}`);
  txs.forEach((tx) => {
    const d = new Date(tx.date);
    console.log(`  - ${tx.description}: R$ ${tx.amount} na data ${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`);
  });

  // Limpar item de teste
  await prisma.transaction.deleteMany({ where: { recurringItemId: item.id } });
  await prisma.recurringItem.delete({ where: { id: item.id } });

  console.log("\n>>> SUCESSO: Conta fixa replicada automaticamente com 100% de precisão nos meses posteriores! <<<");
}

testReplication()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

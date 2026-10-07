import { prisma } from "../src/lib/prisma";
import {
  getWorkspaceYears,
  addWorkspaceYear,
  deleteWorkspaceYear,
  replicateRecurringItem,
} from "../src/lib/engine";

async function main() {
  console.log("=== INICIANDO TESTE COMPLETO DE CONFIGURAÇÕES, ANOS E RECORRÊNCIAS ===");

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) throw new Error("Workspace não encontrado!");
  const wsId = workspace.id;
  console.log(`✓ Workspace: ${workspace.name} (${wsId})`);

  // 1. Teste de criação sequencial de ano
  console.log("\n1. Testando tentativa de criar ano não-sequencial (ex: 2035)...");
  const checkRes = await addWorkspaceYear(wsId, 2035, false);
  console.log("Resultado sem confirmação intermediária:", checkRes);

  if (!checkRes.requiresConfirmation || !checkRes.missingYears || checkRes.missingYears.length === 0) {
    throw new Error("Deveria requerer confirmação de anos intermediários!");
  }
  console.log(`✓ Detectou corretamente anos intermediários faltantes:`, checkRes.missingYears);

  // 2. Confirmando a criação sequencial
  console.log("\n2. Confirmando criação com confirmIntermediate = true...");
  const confirmRes = await addWorkspaceYear(wsId, 2035, true);
  console.log(`✓ Anos criados sequencialmente:`, confirmRes.createdYears);
  if (!confirmRes.years.includes(2035)) {
    throw new Error("2035 deveria estar nos anos ativos!");
  }

  // 3. Teste de recorrência com meses configuráveis (ex: 12 meses)
  console.log("\n3. Criando conta fixa teste com 12 meses de duração...");
  const recItem = await prisma.recurringItem.create({
    data: {
      workspaceId: wsId,
      title: "Conta Teste 12 Meses",
      type: "SAIDA_FIXA",
      dueDay: 10,
      amount: 120,
      monthsDuration: 12,
      isActive: true,
    },
  });

  await replicateRecurringItem(wsId, recItem.id, 2026, 1, 12);

  const txCount = await prisma.transaction.count({
    where: { workspaceId: wsId, recurringItemId: recItem.id },
  });
  console.log(`Transações geradas para o item recorrente: ${txCount}`);
  if (txCount !== 12) {
    throw new Error(`Esperado 12 transações replicadas, obtido ${txCount}`);
  }
  console.log("✓ Replicação respeitou perfeitamente a duração de 12 meses!");

  // Limpar transações e item teste
  await prisma.transaction.deleteMany({ where: { recurringItemId: recItem.id } });
  await prisma.recurringItem.delete({ where: { id: recItem.id } });

  // 4. Teste de exclusão do ano 2035
  console.log("\n4. Testando exclusão centralizada do ano 2035...");
  const delRes = await deleteWorkspaceYear(wsId, 2035);
  console.log(`✓ Ano 2035 excluído com sucesso! Anos restantes:`, delRes.years);
  if (delRes.years.includes(2035)) {
    throw new Error("2035 ainda está presente após exclusão!");
  }

  // Limpar os anos intermediários que foram gerados para o teste (acima de 2030)
  for (const yr of checkRes.missingYears) {
    await deleteWorkspaceYear(wsId, yr);
  }

  console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO!");
}

main()
  .catch((err) => {
    console.error("Erro no teste:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

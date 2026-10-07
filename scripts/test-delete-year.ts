import { prisma } from "../src/lib/prisma";
import {
  getWorkspaceYears,
  addWorkspaceYear,
  getYearSummary,
  deleteWorkspaceYear,
} from "../src/lib/engine";

async function main() {
  console.log("=== INICIANDO TESTE DE EXCLUSÃO DE ANOS INTEIROS ===");

  // 1. Obter primeiro workspace
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    throw new Error("Nenhum workspace encontrado!");
  }
  const workspaceId = workspace.id;
  console.log(`✓ Workspace encontrado: ${workspace.name} (${workspaceId})`);

  const testYear = 2030;

  // 2. Adicionar ano de teste
  console.log(`\n1. Adicionando ano ${testYear}...`);
  let addRes = await addWorkspaceYear(workspaceId, testYear, true);
  console.log("Anos ativos:", addRes.years);
  if (!addRes.years.includes(testYear)) {
    throw new Error(`Falha: ${testYear} deveria estar na lista de anos!`);
  }

  // 3. Inserir dados de teste para o ano 2030
  console.log(`\n2. Inserindo dados de teste para o ano ${testYear}...`);
  const tx1 = await prisma.transaction.create({
    data: {
      workspaceId,
      date: new Date(Date.UTC(testYear, 0, 15, 12, 0, 0)),
      amount: 5000,
      type: "ENTRADA",
      description: `Salário Teste ${testYear}`,
      isPaid: true,
    },
  });

  const tx2 = await prisma.transaction.create({
    data: {
      workspaceId,
      date: new Date(Date.UTC(testYear, 4, 10, 12, 0, 0)),
      amount: 1500,
      type: "SAIDA_FIXA",
      description: `Aluguel Teste ${testYear}`,
      isPaid: false,
    },
  });

  const savings1 = await prisma.savingsRecord.create({
    data: {
      workspaceId,
      yearMonth: `${testYear}-01`,
      amountSaved: 1000,
      notes: "Aporte Teste Janeiro",
    },
  });

  console.log(`✓ Criadas 2 transações e 1 registro de economia em ${testYear}`);

  // 4. Consultar resumo estatístico do ano
  console.log(`\n3. Consultando resumo estatístico do ano ${testYear}...`);
  const summary = await getYearSummary(workspaceId, testYear);
  console.log("Resumo do ano:", summary);
  if (summary.transactionsCount !== 2) {
    throw new Error(`Esperado 2 transações, obtido ${summary.transactionsCount}`);
  }
  if (summary.savingsCount !== 1) {
    throw new Error(`Esperado 1 aporte, obtido ${summary.savingsCount}`);
  }
  if (summary.totalEntradas !== 5000 || summary.totalSaidas !== 1500) {
    throw new Error("Totais de entrada/saída incorretos!");
  }

  // 5. Excluir o ano inteiro e todos os dados
  console.log(`\n4. Executando deleteWorkspaceYear(${testYear})...`);
  const deleteResult = await deleteWorkspaceYear(workspaceId, testYear);
  console.log("Resultado da exclusão:", deleteResult);

  if (deleteResult.deletedTransactions !== 2) {
    throw new Error(`Esperado 2 transações excluídas, obtido ${deleteResult.deletedTransactions}`);
  }
  if (deleteResult.deletedSavings !== 1) {
    throw new Error(`Esperado 1 aporte excluído, obtido ${deleteResult.deletedSavings}`);
  }

  // 6. Verificar se os dados realmente sumiram do banco
  console.log(`\n5. Verificando integridade no banco de dados...`);
  const remainingTx = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: {
        gte: new Date(Date.UTC(testYear, 0, 1)),
        lte: new Date(Date.UTC(testYear, 11, 31, 23, 59, 59)),
      },
    },
  });
  console.log(`Transações restantes em ${testYear}: ${remainingTx.length}`);
  if (remainingTx.length !== 0) {
    throw new Error(`Erro: ainda existem ${remainingTx.length} transações no ano ${testYear}!`);
  }

  const remainingSavings = await prisma.savingsRecord.findMany({
    where: {
      workspaceId,
      yearMonth: { startsWith: `${testYear}-` },
    },
  });
  console.log(`Aportes restantes em ${testYear}: ${remainingSavings.length}`);
  if (remainingSavings.length !== 0) {
    throw new Error(`Erro: ainda existem ${remainingSavings.length} aportes no ano ${testYear}!`);
  }

  // 7. Verificar se o ano não aparece mais na lista
  const updatedYears = await getWorkspaceYears(workspaceId);
  console.log(`Lista de anos após exclusão:`, updatedYears);
  if (updatedYears.includes(testYear)) {
    throw new Error(`Erro: ano ${testYear} ainda está presente na lista de anos ativos!`);
  }

  console.log("\n🎉 TESTE CONCLUÍDO COM 100% DE SUCESSO!");
}

main()
  .catch((e) => {
    console.error("Erro no teste:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

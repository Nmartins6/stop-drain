import { getMonthlyCashFlow } from "../src/lib/engine";
import { prisma } from "../src/lib/prisma";

async function run() {
  const ws = await prisma.workspace.findFirst();
  if (!ws) throw new Error("Workspace not found");

  console.log("=== TESTANDO ENGINE ROLL-FORWARD ===");

  const sep = await getMonthlyCashFlow(ws.id, 2026, 9);
  console.log("Setembro 2026:");
  console.log("  Opening Balance:", sep.summary.openingBalance);
  console.log("  Total Entradas:", sep.summary.totalEntradas);
  console.log("  Total Saídas:", sep.summary.totalSaidas);
  console.log("  Performance:", sep.summary.performance);
  console.log("  Closing Balance (Final do mês):", sep.summary.closingBalance);

  const oct = await getMonthlyCashFlow(ws.id, 2026, 10);
  console.log("\nOutubro 2026:");
  console.log("  Opening Balance (Herdado de Setembro):", oct.summary.openingBalance);
  console.log("  Total Entradas:", oct.summary.totalEntradas);
  console.log("  Total Saídas:", oct.summary.totalSaidas);
  console.log("  Performance:", oct.summary.performance);
  console.log("  Closing Balance (Final do mês):", oct.summary.closingBalance);
  console.log("  Taxa de Economia:", oct.summary.savingsRate + "%");

  // Verificar se o saldo do dia 1 herda exatamente o saldo de abertura
  const octDay1 = oct.rows[0];
  console.log("\nDia 1 de Outubro:");
  console.log("  Saldo Acumulado no fim do dia 1:", octDay1.saldoAcumulado);
  console.log("  (Esperado: Opening " + oct.summary.openingBalance + " - Gasto " + octDay1.gastosDiarios + " = " + (oct.summary.openingBalance - octDay1.gastosDiarios) + ")");

  if (Math.abs(sep.summary.closingBalance - oct.summary.openingBalance) < 0.001) {
    console.log("\n>>> SUCESSO: Roll-Forward Contínuo validado com precisão de 100%! <<<");
  } else {
    console.error("ERRO: Saldo herdado divergente!");
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

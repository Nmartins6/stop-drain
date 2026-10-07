import { prisma } from "./prisma";
import { DailyCashFlowRow, MonthSummary, DashboardKPIs, TransactionItem } from "./types";
import {
  getDaysInMonth,
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Replica imediatamente um item recorrente para todos os meses posteriores (ex: próximos 24 a 36 meses).
 */
export async function replicateRecurringItem(
  workspaceId: string,
  recurringItemId: string,
  startYear?: number,
  startMonth?: number,
  monthsAhead?: number
) {
  const item = await prisma.recurringItem.findFirst({
    where: { id: recurringItemId, workspaceId },
  });
  if (!item || !item.isActive) return;

  const duration = monthsAhead ?? item.monthsDuration ?? 36;
  const now = new Date();
  const y = startYear ?? now.getFullYear();
  const m = startMonth ?? now.getMonth() + 1;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { customYears: true, deletedYears: true },
  });
  const customYears: number[] = workspace?.customYears ? JSON.parse(workspace.customYears) : [];
  const deletedYears: number[] = workspace?.deletedYears ? JSON.parse(workspace.deletedYears) : [];

  const touchedYears = new Set<number>();

  for (let i = 0; i < duration; i++) {
    const targetDate = addMonths(new Date(y, m - 1, 1), i);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    // Se o ano foi explicitamente excluído pelo usuário, NUNCA gerar transação nele!
    if (deletedYears.includes(targetYear)) {
      continue;
    }

    touchedYears.add(targetYear);

    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);
    const daysInMonth = getDaysInMonth(targetDate);
    const day = Math.min(item.dueDay, daysInMonth);
    const txDate = new Date(Date.UTC(targetYear, targetMonth - 1, day, 12, 0, 0));

    const existingTx = await prisma.transaction.findFirst({
      where: {
        workspaceId,
        recurringItemId: item.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          workspaceId,
          recurringItemId: item.id,
          categoryId: item.categoryId,
          description: item.title,
          amount: item.amount,
          type: item.type || "SAIDA_FIXA",
          isPaid: false,
          date: txDate,
        },
      });
    }
  }

  // Garantir que todos os anos sequenciais alcançados e não-excluídos sejam ativados no Workspace
  const touchedArr = Array.from(touchedYears).filter((yr) => !deletedYears.includes(yr));
  if (touchedArr.length > 0) {
    const minYr = Math.min(...touchedArr);
    const maxYr = Math.max(...touchedArr);
    const allYearsToEnsure: number[] = [];
    for (let yr = minYr; yr <= maxYr; yr++) {
      if (!deletedYears.includes(yr)) {
        allYearsToEnsure.push(yr);
      }
    }

    const newCustomYears = Array.from(new Set([...customYears, ...allYearsToEnsure])).sort((a, b) => a - b);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        customYears: JSON.stringify(newCustomYears),
      },
    });
  }
}

/**
 * Replica imediatamente as parcelas de um financiamento nos meses consecutivos correspondentes.
 */
export async function replicateInstallmentPlan(
  workspaceId: string,
  planId: string,
  startYear?: number,
  startMonth?: number
) {
  const plan = await prisma.installmentPlan.findFirst({
    where: { id: planId, workspaceId },
  });
  if (!plan || !plan.isActive) return;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { deletedYears: true },
  });
  const deletedYears: number[] = workspace?.deletedYears ? JSON.parse(workspace.deletedYears) : [];

  const now = new Date();
  const y = startYear ?? plan.startYear ?? now.getFullYear();
  const m = startMonth ?? plan.startMonth ?? now.getMonth() + 1;

  const remainingInstallmentsCount = Math.max(0, plan.totalInstallments - plan.currentInstallment + 1);

  for (let i = 0; i < remainingInstallmentsCount; i++) {
    const installmentNum = plan.currentInstallment + i;
    const targetDate = addMonths(new Date(y, m - 1, 1), i);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;

    // Se o ano foi explicitamente excluído, não gerar parcela nele!
    if (deletedYears.includes(targetYear)) {
      continue;
    }

    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);
    const daysInMonth = getDaysInMonth(targetDate);
    const day = Math.min(plan.dueDay, daysInMonth);
    const txDate = new Date(Date.UTC(targetYear, targetMonth - 1, day, 12, 0, 0));

    const existingTx = await prisma.transaction.findFirst({
      where: {
        workspaceId,
        installmentPlanId: plan.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          workspaceId,
          installmentPlanId: plan.id,
          categoryId: plan.categoryId,
          description: `${plan.description} (${installmentNum}/${plan.totalInstallments})`,
          amount: plan.monthlyAmount,
          type: "SAIDA_FIXA",
          isPaid: false,
          date: txDate,
        },
      });
    }
  }
}

/**
 * @deprecated Hidratação sob demanda desativada para manter a pureza de leitura das APIs
 * e garantir que transações e anos excluídos pelo usuário nunca ressuscitem ao serem abertos.
 * Todas as replicações ocorrem exclusivamente de forma explícita na criação do item.
 */
export async function hydrateMonthlyRecurring(
  _workspaceId: string,
  _year: number,
  _month: number
) {
  // No-op intencional: evita ressuscitar transações ou anos excluídos
  return;
}

/**
 * Calcula o saldo inicial contínuo herdado de todo o histórico anterior ao mês indicado.
 */
export async function getOpeningBalance(workspaceId: string, year: number, month: number): Promise<number> {
  const startDate = startOfMonth(new Date(year, month - 1, 1));

  const previousTransactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { lt: startDate },
    },
    select: { amount: true, type: true },
  });

  let balance = 0;
  for (const tx of previousTransactions) {
    if (tx.type === "ENTRADA") {
      balance += tx.amount;
    } else {
      balance -= tx.amount;
    }
  }

  return Number(balance.toFixed(2));
}

/**
 * Monta a matriz diária (dias 1 a 28/30/31) com cálculo contínuo roll-forward
 */
export async function getMonthlyCashFlow(workspaceId: string, year: number, month: number) {
  const startDate = startOfMonth(new Date(year, month - 1, 1));
  const endDate = endOfMonth(new Date(year, month - 1, 1));
  const daysCount = getDaysInMonth(startDate);

  // Buscar transações do mês com categorias
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: startDate, lte: endDate },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  // Saldo inicial herdado do mês anterior
  const openingBalance = await getOpeningBalance(workspaceId, year, month);

  // Registro de economia do mês
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const savingsRecord = await prisma.savingsRecord.findUnique({
    where: { workspaceId_yearMonth: { workspaceId, yearMonth } },
  });

  // Agrupar transações por dia do mês
  const txByDay: Record<number, TransactionItem[]> = {};
  for (let d = 1; d <= daysCount; d++) {
    txByDay[d] = [];
  }

  for (const t of transactions) {
    const day = new Date(t.date).getUTCDate();
    if (txByDay[day]) {
      txByDay[day].push({
        id: t.id,
        workspaceId: t.workspaceId,
        categoryId: t.categoryId,
        category: t.category
          ? {
              id: t.category.id,
              name: t.category.name,
              icon: t.category.icon,
              color: t.category.color,
              type: t.category.type as any,
            }
          : null,
        installmentPlanId: t.installmentPlanId,
        recurringItemId: t.recurringItemId,
        date: format(new Date(t.date), "yyyy-MM-dd"),
        amount: t.amount,
        type: t.type as any,
        description: t.description,
        isPaid: t.isPaid,
      });
    }
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  let runningBalance = openingBalance;

  let totalEntradas = 0;
  let totalSaidasFixas = 0;
  let totalGastosDiarios = 0;

  const rows: DailyCashFlowRow[] = [];

  const dayWeekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  for (let day = 1; day <= daysCount; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = dayWeekNames[dayDate.getDay()];
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    const isToday = dateStr === todayStr;

    const dayTxs = txByDay[day] || [];
    let dayEntradas = 0;
    let daySaidasFixas = 0;
    let dayGastosDiarios = 0;

    for (const tx of dayTxs) {
      if (tx.type === "ENTRADA") {
        dayEntradas += tx.amount;
      } else if (tx.type === "SAIDA_FIXA") {
        daySaidasFixas += tx.amount;
      } else if (tx.type === "GASTO_DIARIO") {
        dayGastosDiarios += tx.amount;
      }
    }

    const dayTotalSaidas = daySaidasFixas + dayGastosDiarios;
    const saldoDia = dayEntradas - dayTotalSaidas;

    // Fórmula Roll-Forward Diária:
    // Saldo(d) = Saldo(d-1) + Entrada(d) - Saída(d) - Diário(d)
    runningBalance = Number((runningBalance + saldoDia).toFixed(2));

    totalEntradas += dayEntradas;
    totalSaidasFixas += daySaidasFixas;
    totalGastosDiarios += dayGastosDiarios;

    rows.push({
      day,
      dateStr,
      dayOfWeek,
      isWeekend,
      isToday,
      entradas: Number(dayEntradas.toFixed(2)),
      saidasFixas: Number(daySaidasFixas.toFixed(2)),
      gastosDiarios: Number(dayGastosDiarios.toFixed(2)),
      totalSaidas: Number(dayTotalSaidas.toFixed(2)),
      saldoDia: Number(saldoDia.toFixed(2)),
      saldoAcumulado: runningBalance,
      transactions: dayTxs,
    });
  }

  const totalSaidas = totalSaidasFixas + totalGastosDiarios;
  const performance = totalEntradas - totalSaidas;
  const amountSaved = savingsRecord?.amountSaved || 0;
  const savingsRate =
    totalEntradas > 0 ? Number(((amountSaved / totalEntradas) * 100).toFixed(1)) : 0;

  const monthName = format(new Date(year, month - 1, 1), "MMMM", { locale: ptBR });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const summary: MonthSummary = {
    year,
    month,
    monthName: capitalizedMonthName,
    openingBalance,
    totalEntradas: Number(totalEntradas.toFixed(2)),
    totalSaidasFixas: Number(totalSaidasFixas.toFixed(2)),
    totalGastosDiarios: Number(totalGastosDiarios.toFixed(2)),
    totalSaidas: Number(totalSaidas.toFixed(2)),
    performance: Number(performance.toFixed(2)),
    closingBalance: runningBalance,
    amountSaved,
    savingsRate,
  };

  return { rows, summary };
}

/**
 * Trata amortização ao marcar/desmarcar pagamento de uma parcela
 */
export async function handlePaymentStatusChange(
  transactionId: string,
  newIsPaid: boolean
) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { installmentPlan: true },
  });

  if (!tx) return;

  // Atualizar transação
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { isPaid: newIsPaid },
  });

  // Se for associada a um plano parcelado, atualizar amortização
  if (tx.installmentPlanId && tx.installmentPlan) {
    const plan = tx.installmentPlan;
    if (newIsPaid && !tx.isPaid) {
      // Baixa efetuada: deduz do saldo devedor
      const nextRemaining = Math.max(0, plan.remainingBalance - tx.amount);
      const nextInstallment = plan.currentInstallment + 1;
      const willBeActive = nextRemaining > 0 && nextInstallment <= plan.totalInstallments;

      await prisma.installmentPlan.update({
        where: { id: plan.id },
        data: {
          remainingBalance: Number(nextRemaining.toFixed(2)),
          currentInstallment: nextInstallment,
          isActive: willBeActive,
        },
      });
    } else if (!newIsPaid && tx.isPaid) {
      // Desfazendo baixa
      const nextRemaining = plan.remainingBalance + tx.amount;
      const nextInstallment = Math.max(1, plan.currentInstallment - 1);

      await prisma.installmentPlan.update({
        where: { id: plan.id },
        data: {
          remainingBalance: Number(nextRemaining.toFixed(2)),
          currentInstallment: nextInstallment,
          isActive: true,
        },
      });
    }
  }
}

/**
 * Carrega os KPIs e dados para o Dashboard
 */
export async function getDashboardData(workspaceId: string): Promise<DashboardKPIs> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { rows, summary } = await getMonthlyCashFlow(workspaceId, currentYear, currentMonth);

  // Saldo atual acumulado até hoje
  const todayStr = format(now, "yyyy-MM-dd");
  const todayRow = rows.find((r) => r.dateStr === todayStr);
  const currentBalance = todayRow ? todayRow.saldoAcumulado : summary.closingBalance;

  // Próximos vencimentos nos próximos 7 dias (contas não pagas)
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const upcomingTx = await prisma.transaction.findMany({
    where: {
      workspaceId,
      isPaid: false,
      type: "SAIDA_FIXA",
      date: {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        lte: in7Days,
      },
    },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const upcomingBills = upcomingTx.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    dueDay: new Date(t.date).getUTCDate(),
    date: format(new Date(t.date), "yyyy-MM-dd"),
    isPaid: t.isPaid,
    type: t.type as any,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
          type: t.category.type as any,
        }
      : null,
  }));

  // Saídas previstas vs pagas no mês
  const totalSaidasExpected = summary.totalSaidas;
  let totalSaidasPaid = 0;

  for (const row of rows) {
    for (const tx of row.transactions) {
      if (tx.type !== "ENTRADA" && tx.isPaid) {
        totalSaidasPaid += tx.amount;
      }
    }
  }

  // Gráfico comparativo dos últimos 6 meses
  const monthlyChart: DashboardKPIs["monthlyChart"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const { summary: monthData } = await getMonthlyCashFlow(workspaceId, y, m);
    const label = format(d, "MMM/yy", { locale: ptBR });

    monthlyChart.push({
      monthStr: label.toUpperCase(),
      entradas: monthData.totalEntradas,
      saidas: monthData.totalSaidas,
      performance: monthData.performance,
    });
  }

  return {
    currentBalance,
    monthPerformance: summary.performance,
    totalSaidasExpected: Number(totalSaidasExpected.toFixed(2)),
    totalSaidasPaid: Number(totalSaidasPaid.toFixed(2)),
    savingsRate: summary.savingsRate,
    upcomingBills,
    monthlyChart,
  };
}

/**
 * Retorna a lista de anos ativos e disponíveis para o workspace.
 * O ano atual vigente (ex: 2026) é a base de partida inicial.
 */
export async function getWorkspaceYears(workspaceId: string): Promise<number[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { customYears: true, deletedYears: true },
  });

  const customYears: number[] = workspace?.customYears ? JSON.parse(workspace.customYears) : [];
  const deletedYears: number[] = workspace?.deletedYears ? JSON.parse(workspace.deletedYears) : [];

  // O ano atual (vigente) é a base de partida inicial para o usuário
  const currentYear = new Date().getFullYear();
  const baseYears = [currentYear];

  // Anos distintos com transações existentes
  const transactions = await prisma.transaction.findMany({
    where: { workspaceId },
    select: { date: true },
  });
  const txYears = transactions.map((t) => t.date.getFullYear());

  // Anos distintos com registros de economia existentes
  const savings = await prisma.savingsRecord.findMany({
    where: { workspaceId },
    select: { yearMonth: true },
  });
  const savingsYears = savings
    .map((s) => parseInt(s.yearMonth.slice(0, 4), 10))
    .filter((y) => !isNaN(y));

  const allSet = new Set<number>([...baseYears, ...customYears, ...txYears, ...savingsYears]);
  for (const dy of deletedYears) {
    allSet.delete(dy);
  }

  const result = Array.from(allSet).sort((a, b) => a - b);
  if (result.length === 0) {
    result.push(currentYear);
  }
  return result;
}

export interface AddYearResult {
  years: number[];
  createdYears: number[];
  requiresConfirmation?: boolean;
  missingYears?: number[];
}

/**
 * Adiciona um ano novo ao workspace de forma sequencial.
 * Se o usuário tentar criar 2029 quando o ano máximo for 2026,
 * o sistema requer confirmação para criar os anos intermediários 2027 e 2028.
 */
export async function addWorkspaceYear(
  workspaceId: string,
  targetYear: number,
  confirmIntermediate: boolean = false
): Promise<AddYearResult> {
  const currentYears = await getWorkspaceYears(workspaceId);
  const maxYear = Math.max(...currentYears);
  const minYear = Math.min(...currentYears);

  // Verificar se há anos intermediários faltantes ao expandir para frente
  if (targetYear > maxYear + 1) {
    const missingYears: number[] = [];
    for (let y = maxYear + 1; y < targetYear; y++) {
      missingYears.push(y);
    }

    if (!confirmIntermediate) {
      return {
        years: currentYears,
        createdYears: [],
        requiresConfirmation: true,
        missingYears,
      };
    }
  }

  // Verificar se há anos intermediários faltantes ao expandir para trás
  if (targetYear < minYear - 1) {
    const missingYears: number[] = [];
    for (let y = minYear - 1; y > targetYear; y--) {
      missingYears.unshift(y);
    }

    if (!confirmIntermediate) {
      return {
        years: currentYears,
        createdYears: [],
        requiresConfirmation: true,
        missingYears,
      };
    }
  }

  // Anos que serão criados sequencialmente
  const yearsToAdd: number[] = [];
  if (targetYear > maxYear) {
    for (let y = maxYear + 1; y <= targetYear; y++) {
      yearsToAdd.push(y);
    }
  } else if (targetYear < minYear) {
    for (let y = minYear - 1; y >= targetYear; y--) {
      yearsToAdd.push(y);
    }
  } else {
    yearsToAdd.push(targetYear);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { customYears: true, deletedYears: true },
  });

  const customYears: number[] = workspace?.customYears ? JSON.parse(workspace.customYears) : [];
  const deletedYears: number[] = workspace?.deletedYears ? JSON.parse(workspace.deletedYears) : [];

  const newCustomYears = Array.from(new Set([...customYears, ...yearsToAdd])).sort((a, b) => a - b);
  const newDeletedYears = deletedYears.filter((y) => !yearsToAdd.includes(y));

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      customYears: JSON.stringify(newCustomYears),
      deletedYears: JSON.stringify(newDeletedYears),
    },
  });

  const updatedYears = await getWorkspaceYears(workspaceId);
  return {
    years: updatedYears,
    createdYears: yearsToAdd,
  };
}

export interface YearSummary {
  year: number;
  transactionsCount: number;
  entradasCount: number;
  saidasCount: number;
  totalEntradas: number;
  totalSaidas: number;
  savingsCount: number;
  totalSavings: number;
  installmentPlansAffected: number;
}

/**
 * Retorna estatísticas detalhadas de um ano para exibir na caixa de confirmação de exclusão.
 */
export async function getYearSummary(workspaceId: string, year: number): Promise<YearSummary> {
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: { gte: startDate, lte: endDate },
    },
    select: { id: true, amount: true, type: true, installmentPlanId: true },
  });

  let totalEntradas = 0;
  let totalSaidas = 0;
  let entradasCount = 0;
  let saidasCount = 0;
  const planIds = new Set<string>();

  for (const t of transactions) {
    if (t.type === "ENTRADA") {
      entradasCount++;
      totalEntradas += t.amount;
    } else {
      saidasCount++;
      totalSaidas += t.amount;
    }
    if (t.installmentPlanId) {
      planIds.add(t.installmentPlanId);
    }
  }

  const savingsRecords = await prisma.savingsRecord.findMany({
    where: {
      workspaceId,
      yearMonth: { startsWith: `${year}-` },
    },
    select: { amountSaved: true },
  });

  const totalSavings = savingsRecords.reduce((acc, curr) => acc + curr.amountSaved, 0);

  return {
    year,
    transactionsCount: transactions.length,
    entradasCount,
    saidasCount,
    totalEntradas: Number(totalEntradas.toFixed(2)),
    totalSaidas: Number(totalSaidas.toFixed(2)),
    savingsCount: savingsRecords.length,
    totalSavings: Number(totalSavings.toFixed(2)),
    installmentPlansAffected: planIds.size,
  };
}

/**
 * Exclui um ano inteiro e todos os dados associados a ele:
 * - Todas as transações do ano
 * - Todos os registros de poupança/aportes do ano
 * - Planos de parcelamento órfãos (que não possuem mais parcelas em outros anos)
 * - Atualiza deletedYears no Workspace
 * - Recalcula saldo devedor restante dos parcelamentos remanescentes
 */
export async function deleteWorkspaceYear(workspaceId: string, year: number) {
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // 1. Excluir todas as transações do ano
  const deleteTxResult = await prisma.transaction.deleteMany({
    where: {
      workspaceId,
      date: { gte: startDate, lte: endDate },
    },
  });

  // 2. Excluir todos os registros de economia do ano
  const deleteSavingsResult = await prisma.savingsRecord.deleteMany({
    where: {
      workspaceId,
      yearMonth: { startsWith: `${year}-` },
    },
  });

  // 3. Excluir parcelamentos que ficaram sem nenhuma transação
  const deletePlansResult = await prisma.installmentPlan.deleteMany({
    where: {
      workspaceId,
      transactions: { none: {} },
    },
  });

  // 4. Excluir itens recorrentes que ficaram sem nenhuma transação
  const deleteRecurringResult = await prisma.recurringItem.deleteMany({
    where: {
      workspaceId,
      transactions: { none: {} },
    },
  });

  // 5. Atualizar Workspace deletedYears e customYears
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { customYears: true, deletedYears: true },
  });

  const customYears: number[] = workspace?.customYears ? JSON.parse(workspace.customYears) : [];
  const deletedYears: number[] = workspace?.deletedYears ? JSON.parse(workspace.deletedYears) : [];

  const newCustomYears = customYears.filter((y) => y !== year);
  const newDeletedYears = Array.from(new Set([...deletedYears, year])).sort((a, b) => a - b);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      customYears: JSON.stringify(newCustomYears),
      deletedYears: JSON.stringify(newDeletedYears),
    },
  });

  // 6. Recalcular o saldo devedor de parcelamentos restantes
  const remainingPlans = await prisma.installmentPlan.findMany({
    where: { workspaceId },
    include: { transactions: true },
  });
  for (const plan of remainingPlans) {
    const unpaidSum = plan.transactions
      .filter((t) => !t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);
    await prisma.installmentPlan.update({
      where: { id: plan.id },
      data: {
        remainingBalance: Number(unpaidSum.toFixed(2)),
        isActive: unpaidSum > 0,
      },
    });
  }

  const updatedYears = await getWorkspaceYears(workspaceId);

  return {
    success: true,
    year,
    deletedTransactions: deleteTxResult.count,
    deletedSavings: deleteSavingsResult.count,
    deletedPlans: deletePlansResult.count,
    deletedRecurring: deleteRecurringResult.count,
    years: updatedYears,
  };
}

export type TransactionType = "ENTRADA" | "SAIDA_FIXA" | "GASTO_DIARIO";

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface TransactionItem {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  category?: CategoryData | null;
  installmentPlanId: string | null;
  recurringItemId: string | null;
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  type: TransactionType;
  description: string;
  isPaid: boolean;
}

export interface DailyCashFlowRow {
  day: number;
  dateStr: string; // "YYYY-MM-DD"
  dayOfWeek: string; // "Seg", "Ter", etc.
  isWeekend: boolean;
  isToday: boolean;
  entradas: number;
  saidasFixas: number;
  gastosDiarios: number;
  totalSaidas: number;
  saldoDia: number; // Saldo líquido do dia: Entradas - Saídas - Diário
  saldoAcumulado: number; // Saldo contínuo roll-forward
  transactions: TransactionItem[];
}

export interface MonthSummary {
  year: number;
  month: number; // 1-12
  monthName: string;
  openingBalance: number; // Saldo herdado do mês anterior
  totalEntradas: number;
  totalSaidasFixas: number;
  totalGastosDiarios: number;
  totalSaidas: number;
  performance: number; // totalEntradas - totalSaidas
  closingBalance: number; // Saldo do último dia do mês
  amountSaved: number;
  savingsRate: number; // % economia: (amountSaved / totalEntradas) * 100
}

export interface DashboardKPIs {
  currentBalance: number;
  monthPerformance: number;
  totalSaidasExpected: number;
  totalSaidasPaid: number;
  savingsRate: number;
  upcomingBills: {
    id: string;
    description: string;
    amount: number;
    dueDay: number;
    date: string;
    isPaid: boolean;
    type: TransactionType;
    category?: CategoryData | null;
  }[];
  monthlyChart: {
    monthStr: string;
    entradas: number;
    saidas: number;
    performance: number;
  }[];
}

"use client";

import React, { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { DashboardKPIs } from "@/lib/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface DashboardViewProps {
  data: DashboardKPIs | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToCashFlow: () => void;
}

export default function DashboardView({
  data,
  loading,
  onRefresh,
  onNavigateToCashFlow,
}: DashboardViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/transactions/${id}/toggle-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !currentPaid }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Carregando indicadores financeiros...
        </p>
      </div>
    );
  }

  const isBalancePositive = data.currentBalance >= 0;
  const isPerformancePositive = data.monthPerformance >= 0;

  return (
    <div className="space-y-6">
      {/* 1. Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Visão Geral & Indicadores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhamento executivo da saúde financeira e fluxo continuado.
          </p>
        </div>
        <button
          onClick={onNavigateToCashFlow}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-all self-start sm:self-auto shadow-sm"
        >
          <span>Abrir Livro Caixa</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Grid de KPI Cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
        {/* Card 1: Saldo em Caixa */}
        <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo em Caixa (Hoje)
            </span>
            <div
              className={`p-2 2xl:p-2.5 rounded-xl ${
                isBalancePositive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              }`}
            >
              <Wallet className="h-5 w-5 2xl:h-6 2xl:w-6" />
            </div>
          </div>
          <div
            className={`text-2xl 2xl:text-3xl font-black tracking-tight ${
              isBalancePositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatBRL(data.currentBalance)}
          </div>
          <p className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Acumulado contínuo (roll-forward)
          </p>
        </div>

        {/* Card 2: Performance do Mês */}
        <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Performance do Mês
            </span>
            <div
              className={`p-2 2xl:p-2.5 rounded-xl ${
                isPerformancePositive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
              }`}
            >
              {isPerformancePositive ? (
                <TrendingUp className="h-5 w-5 2xl:h-6 2xl:w-6" />
              ) : (
                <TrendingDown className="h-5 w-5 2xl:h-6 2xl:w-6" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl 2xl:text-3xl font-black tracking-tight ${
              isPerformancePositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatBRL(data.monthPerformance)}
          </div>
          <p className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 mt-2">
            {isPerformancePositive ? "Superávit do período" : "Déficit no período"}
          </p>
        </div>

        {/* Card 3: Saídas Previstas vs Realizadas */}
        <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saídas Pagas / Previstas
            </span>
            <div className="p-2 2xl:p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Calendar className="h-5 w-5 2xl:h-6 2xl:w-6" />
            </div>
          </div>
          <div className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatBRL(data.totalSaidasPaid)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs 2xl:text-sm text-slate-500 dark:text-slate-400">
            <span>Previsto: {formatBRL(data.totalSaidasExpected)}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {data.totalSaidasExpected > 0
                ? Math.round((data.totalSaidasPaid / data.totalSaidasExpected) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Card 4: Taxa de Economia */}
        <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Taxa de Poupança
            </span>
            <div className="p-2 2xl:p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <PiggyBank className="h-5 w-5 2xl:h-6 2xl:w-6" />
            </div>
          </div>
          <div className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {data.savingsRate}%
          </div>
          <p className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Do rendimento reservado/investido
          </p>
        </div>
      </div>

      {/* 3. Seção Intermediária: Próximos Vencimentos + Gráfico Semestral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-12 gap-6 2xl:gap-8">
        {/* Próximos Vencimentos (7 dias) */}
        <div className="lg:col-span-1 2xl:col-span-4 p-6 2xl:p-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base 2xl:text-lg font-bold text-slate-900 dark:text-white">
                Vencimentos Próximos (7 dias)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {data.upcomingBills.length} pendentes
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] 2xl:max-h-[460px] pr-1">
            {data.upcomingBills.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                🎉 Nenhuma conta pendente nos próximos 7 dias!
              </div>
            ) : (
              data.upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 2xl:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePaid(bill.id, bill.isPaid)}
                      disabled={updatingId === bill.id}
                      className="text-slate-400 hover:text-emerald-500 transition-colors"
                      title="Marcar como pago"
                    >
                      {bill.isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm 2xl:text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {bill.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Vence dia {bill.dueDay} • {bill.category?.name || "Fixa"}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm 2xl:text-base font-bold text-slate-900 dark:text-white">
                    {formatBRL(bill.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gráfico Comparativo dos Últimos 6 Meses */}
        <div className="lg:col-span-2 2xl:col-span-8 p-6 2xl:p-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-base 2xl:text-lg font-bold text-slate-900 dark:text-white">
              Histórico Comparativo (Últimos 6 Meses)
            </h2>
            <p className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400">
              Evolução mensal de Entradas vs. Saídas Totais
            </p>
          </div>

          <div className="h-72 2xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="monthStr" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => formatBRL(Number(val))}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderRadius: "12px",
                    color: "#fff",
                    border: "none",
                  }}
                />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas Totais" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

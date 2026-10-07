"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Wallet,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { DailyCashFlowRow, MonthSummary, TransactionItem, CategoryData } from "@/lib/types";
import ConfirmIntermediateYearsModal from "./ConfirmIntermediateYearsModal";

interface CashFlowViewProps {
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  rows: DailyCashFlowRow[];
  summary: MonthSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenQuickAddForDay: (dateStr: string) => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  categories: CategoryData[];
}

export default function CashFlowView({
  year,
  month,
  setYear,
  setMonth,
  rows,
  summary,
  loading,
  onRefresh,
  onOpenQuickAddForDay,
  onSelectTransaction,
}: CashFlowViewProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);

  // Lista dinâmica de anos gerenciável pelo usuário
  const [yearList, setYearList] = useState<number[]>([2024, 2025, 2026, 2027, 2028]);
  const [showAddYearInput, setShowAddYearInput] = useState(false);
  const [newYearValue, setNewYearValue] = useState("");
  const [intermediateModalData, setIntermediateModalData] = useState<{
    targetYear: number;
    missingYears: number[];
  } | null>(null);
  const [confirmingIntermediate, setConfirmingIntermediate] = useState(false);

  const loadYears = async () => {
    try {
      const res = await fetch("/api/years");
      if (res.ok) {
        const data = await res.json();
        if (data.years && data.years.length > 0) {
          setYearList(data.years);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar anos:", err);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const months = [
    { num: 1, name: "Janeiro", short: "Jan" },
    { num: 2, name: "Fevereiro", short: "Fev" },
    { num: 3, name: "Março", short: "Mar" },
    { num: 4, name: "Abril", short: "Abr" },
    { num: 5, name: "Maio", short: "Mai" },
    { num: 6, name: "Junho", short: "Jun" },
    { num: 7, name: "Julho", short: "Jul" },
    { num: 8, name: "Agosto", short: "Ago" },
    { num: 9, name: "Setembro", short: "Set" },
    { num: 10, name: "Outubro", short: "Out" },
    { num: 11, name: "Novembro", short: "Nov" },
    { num: 12, name: "Dezembro", short: "Dez" },
  ];

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleAddYear = async (confirmIntermediate = false, overrideYear?: number) => {
    const parsed = overrideYear ?? parseInt(newYearValue, 10);
    if (!isNaN(parsed) && parsed > 2000 && parsed < 2100) {
      if (confirmIntermediate) {
        setConfirmingIntermediate(true);
      }
      try {
        const res = await fetch("/api/years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: parsed, confirmIntermediate }),
        });
        const data = await res.json();
        if (data.requiresConfirmation) {
          setIntermediateModalData({
            targetYear: data.year,
            missingYears: data.missingYears,
          });
          return;
        }

        if (res.ok && data.years) {
          setYearList(data.years);
        } else if (!yearList.includes(parsed)) {
          setYearList([...yearList, parsed].sort((a, b) => a - b));
        }
        setYear(parsed);
        setNewYearValue("");
        setShowAddYearInput(false);
        setIntermediateModalData(null);
      } catch {
        if (!yearList.includes(parsed)) {
          setYearList([...yearList, parsed].sort((a, b) => a - b));
        }
        setYear(parsed);
        setNewYearValue("");
        setShowAddYearInput(false);
      } finally {
        setConfirmingIntermediate(false);
      }
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      const prevYear = year - 1;
      if (!yearList.includes(prevYear)) {
        setYearList([...yearList, prevYear].sort((a, b) => a - b));
      }
      setYear(prevYear);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      const nextYear = year + 1;
      if (!yearList.includes(nextYear)) {
        setYearList([...yearList, nextYear].sort((a, b) => a - b));
      }
      setYear(nextYear);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleTogglePaid = async (e: React.MouseEvent, id: string, currentPaid: boolean) => {
    e.stopPropagation();
    setTogglingId(id);
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
      setTogglingId(null);
    }
  };

  // Filtrar linhas se o usuário selecionar apenas dias com atividade
  const displayedRows = onlyActiveDays
    ? rows.filter((r) => r.entradas > 0 || r.saidasFixas > 0 || r.gastosDiarios > 0)
    : rows;

  return (
    <div className="space-y-6">
      {/* 1. Barra Superior de Seleção Temporal: Ano e Mês */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        {/* Seletor de Ano com botão de criar próximo ano */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Ano em Exercício:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {yearList.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    year === y
                      ? "bg-emerald-600 text-white shadow-sm scale-105"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}

              {/* Botão para Adicionar Próximo Ano */}
              {showAddYearInput ? (
                <div className="flex items-center gap-1 pl-1">
                  <input
                    type="number"
                    placeholder="Ano"
                    value={newYearValue}
                    onChange={(e) => setNewYearValue(e.target.value)}
                    className="w-16 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAddYear()}
                  />
                  <button
                    onClick={() => handleAddYear()}
                    className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded font-bold"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setShowAddYearInput(false)}
                    className="text-xs text-slate-400 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAddYearInput(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 transition-colors"
                    title="Criar / Abrir Novo Ano"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Novo Ano</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navegação Rápida Próximo/Anterior e Filtro */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnlyActiveDays(!onlyActiveDays)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                onlyActiveDays
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{onlyActiveDays ? "Apenas com lançamentos" : "Todos os dias (1-31)"}</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[100px] text-center">
                {months[month - 1].name}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chips dos 12 Meses */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 2xl:gap-2">
          {months.map((m) => (
            <button
              key={m.num}
              onClick={() => setMonth(m.num)}
              className={`py-2 px-1 text-center rounded-xl text-xs 2xl:text-sm font-semibold transition-all ${
                month === m.num
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm scale-105"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="2xl:hidden">{m.short}</span>
              <span className="hidden 2xl:inline">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Banner de Saldo Inicial Herdado (Roll-Forward) */}
      {summary && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Saldo Inicial Herdado (Roll-Forward de {month === 1 ? `Dezembro/${year - 1}` : `${months[month - 2].name}/${year}`})
              </p>
              <p className={`text-2xl font-black ${summary.openingBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatBRL(summary.openingBalance)}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>O saldo contínuo do <strong>Dia 1</strong> herda este fechamento sem interrupções.</span>
          </div>
        </div>
      )}

      {/* 3. Tabela Diária (Desktop) e Lista de Cards (Mobile) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Calculando matriz contínua de caixa...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Header da Tabela Desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-2 px-5 2xl:px-8 py-3.5 2xl:py-4 bg-slate-100/75 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs 2xl:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <div className="col-span-1">Dia</div>
            <div className="col-span-1">Semana</div>
            <div className="col-span-2 text-right">Entrada (R$)</div>
            <div className="col-span-2 text-right">Saída Fixa (R$)</div>
            <div className="col-span-2 text-right">Diário (R$)</div>
            <div className="col-span-2 text-right">Saldo Dia</div>
            <div className="col-span-2 text-right">Saldo Acumulado</div>
          </div>

          {/* Linhas Diárias (1 a 31) */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Nenhum lançamento encontrado para os dias com movimentação neste mês.
              </div>
            ) : (
              displayedRows.map((row) => {
                const isExpanded = expandedDay === row.day;
                const isPositiveAccum = row.saldoAcumulado >= 0;

                return (
                  <div
                    key={row.day}
                    className={`transition-colors ${
                      row.isToday
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : row.isWeekend
                        ? "bg-slate-50/50 dark:bg-slate-900/40"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Linha Principal Desktop */}
                    <div
                      onClick={() => setExpandedDay(isExpanded ? null : row.day)}
                      className="hidden lg:grid grid-cols-12 gap-2 px-5 2xl:px-8 py-3 2xl:py-3.5 items-center cursor-pointer select-none text-sm 2xl:text-base font-medium"
                    >
                      {/* Dia */}
                      <div className="col-span-1 flex items-center gap-2">
                        <span
                          className={`h-7 w-7 2xl:h-8 2xl:w-8 rounded-lg flex items-center justify-center font-bold text-xs 2xl:text-sm ${
                            row.isToday
                              ? "bg-amber-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {String(row.day).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Semana */}
                      <div className="col-span-1 text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>{row.dayOfWeek}</span>
                        {row.transactions.length > 0 && (
                          <span
                            className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            title={`${row.transactions.length} lançamentos neste dia`}
                          >
                            {row.transactions.length}
                          </span>
                        )}
                      </div>

                      {/* Entrada */}
                      <div className="col-span-2 text-right">
                        {row.entradas > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{formatBRL(row.entradas)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </div>

                      {/* Saída Fixa */}
                      <div className="col-span-2 text-right">
                        {row.saidasFixas > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            -{formatBRL(row.saidasFixas)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </div>

                      {/* Diário */}
                      <div className="col-span-2 text-right">
                        {row.gastosDiarios > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            -{formatBRL(row.gastosDiarios)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </div>

                      {/* Saldo Líquido do Dia */}
                      <div className="col-span-2 text-right text-xs 2xl:text-sm">
                        {row.saldoDia > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{formatBRL(row.saldoDia)}
                          </span>
                        )}
                        {row.saldoDia < 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            {formatBRL(row.saldoDia)}
                          </span>
                        )}
                        {row.saldoDia === 0 && (
                          <span className="text-slate-400 dark:text-slate-600 font-normal">
                            R$ 0,00
                          </span>
                        )}
                      </div>

                      {/* Saldo Acumulado Roll-Forward */}
                      <div className="col-span-2 text-right flex items-center justify-end gap-2">
                        <span
                          className={`px-2.5 py-1 2xl:px-3.5 2xl:py-1.5 rounded-lg font-black text-xs 2xl:text-sm ${
                            isPositiveAccum
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {formatBRL(row.saldoAcumulado)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQuickAddForDay(row.dateStr);
                          }}
                          className="p-1 2xl:p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Adicionar lançamento neste dia"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visualização Mobile (Cards Empilhados) */}
                    <div
                      onClick={() => setExpandedDay(isExpanded ? null : row.day)}
                      className="lg:hidden p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              row.isToday
                                ? "bg-amber-500 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {row.day}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {row.dayOfWeek}
                          </span>
                          {row.isToday && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                              Hoje
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                              isPositiveAccum
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            Saldo: {formatBRL(row.saldoAcumulado)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenQuickAddForDay(row.dateStr);
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-emerald-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Resumo do dia no mobile */}
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Entradas</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {row.entradas > 0 ? `+${formatBRL(row.entradas)}` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Saída Fixa</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {row.saidasFixas > 0 ? `-${formatBRL(row.saidasFixas)}` : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Diário</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {row.gastosDiarios > 0 ? `-${formatBRL(row.gastosDiarios)}` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lançamentos Expansíveis do Dia */}
                    {isExpanded && (
                      <div className="px-5 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Lançamentos do Dia {row.day} ({row.transactions.length})
                          </span>
                          <button
                            onClick={() => onOpenQuickAddForDay(row.dateStr)}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar Lançamento
                          </button>
                        </div>

                        {row.transactions.length === 0 ? (
                          <p className="text-slate-400 italic py-2">
                            Nenhuma movimentação registrada neste dia.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                            {row.transactions.map((tx) => (
                              <div
                                key={tx.id}
                                onClick={() => onSelectTransaction(tx)}
                                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all shadow-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    onClick={(e) => handleTogglePaid(e, tx.id, tx.isPaid)}
                                    disabled={togglingId === tx.id}
                                    className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                                    title={tx.isPaid ? "Marcado como pago" : "Marcar como pago"}
                                  >
                                    {tx.isPaid ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-4 w-4" />
                                    )}
                                  </button>

                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                      tx.type === "ENTRADA"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : tx.type === "SAIDA_FIXA"
                                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    }`}
                                  >
                                    {tx.type === "ENTRADA"
                                      ? "Entrada"
                                      : tx.type === "SAIDA_FIXA"
                                      ? "Fixa"
                                      : "Diário"}
                                  </span>

                                  <div className="min-w-0">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                      {tx.description}
                                    </span>
                                    {tx.category && (
                                      <span className="text-slate-400 text-[10px] block truncate">
                                        {tx.category.name}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pl-2">
                                  <span
                                    className={`font-bold text-xs 2xl:text-sm ${
                                      tx.type === "ENTRADA"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-slate-900 dark:text-white"
                                    }`}
                                  >
                                    {tx.type === "ENTRADA" ? "+" : "-"}
                                    {formatBRL(tx.amount)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Rodapé Consolidado Mensal Conforme Especificação */}
          {summary && (
            <div className="p-6 2xl:p-8 bg-slate-900 text-white border-t border-slate-800 space-y-4 2xl:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider text-slate-400">
                  Totais e Indicadores Mensais — {summary.monthName} / {summary.year}
                </span>
                <span className="text-xs 2xl:text-sm text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  Taxa de Poupança: <strong className="text-emerald-400">{summary.savingsRate}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 2xl:gap-6 pt-2">
                {/* ENTRADAS */}
                <div className="p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                  <span className="block text-[11px] 2xl:text-xs text-slate-400 uppercase font-semibold">
                    ENTRADAS
                  </span>
                  <span className="text-lg 2xl:text-2xl font-black text-emerald-400 mt-1 block">
                    +{formatBRL(summary.totalEntradas)}
                  </span>
                </div>

                {/* SAÍDAS FIXAS */}
                <div className="p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/30 transition-colors">
                  <span className="block text-[11px] 2xl:text-xs text-slate-400 uppercase font-semibold">
                    SAÍDAS FIXAS
                  </span>
                  <span className="text-lg 2xl:text-2xl font-black text-rose-400 mt-1 block">
                    -{formatBRL(summary.totalSaidasFixas)}
                  </span>
                </div>

                {/* DIÁRIO */}
                <div className="p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-colors">
                  <span className="block text-[11px] 2xl:text-xs text-slate-400 uppercase font-semibold">
                    DIÁRIO
                  </span>
                  <span className="text-lg 2xl:text-2xl font-black text-amber-400 mt-1 block">
                    -{formatBRL(summary.totalGastosDiarios)}
                  </span>
                </div>

                {/* SAÍDA TOTAL */}
                <div className="p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl bg-white/5 border border-white/10 hover:border-slate-500/30 transition-colors">
                  <span className="block text-[11px] 2xl:text-xs text-slate-400 uppercase font-semibold">
                    SAÍDA TOTAL
                  </span>
                  <span className="text-lg 2xl:text-2xl font-black text-white mt-1 block">
                    -{formatBRL(summary.totalSaidas)}
                  </span>
                </div>

                {/* PERFORMANCE (Resultado do Mês) */}
                <div
                  className={`p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl col-span-2 sm:col-span-1 border transition-colors ${
                    summary.performance >= 0
                      ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <span className="block text-[11px] 2xl:text-xs uppercase font-semibold opacity-80">
                    PERFORMANCE (Mês)
                  </span>
                  <span className="text-lg 2xl:text-2xl font-black mt-1 block">
                    {formatBRL(summary.performance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação para Anos Intermediários Faltantes */}
      {intermediateModalData && (
        <ConfirmIntermediateYearsModal
          isOpen={true}
          targetYear={intermediateModalData.targetYear}
          missingYears={intermediateModalData.missingYears}
          loading={confirmingIntermediate}
          onConfirm={() => handleAddYear(true, intermediateModalData.targetYear)}
          onCancel={() => setIntermediateModalData(null)}
        />
      )}
    </div>
  );
}

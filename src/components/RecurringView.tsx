"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Layers } from "lucide-react";
import { addMonths } from "date-fns";
import { CategoryData } from "@/lib/types";

interface RecurringItem {
  id: string;
  title: string;
  type?: string;
  dueDay: number;
  amount: number;
  isActive: boolean;
  category?: CategoryData | null;
}

interface InstallmentPlan {
  id: string;
  description: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: number;
  remainingBalance: number;
  dueDay: number;
  isActive: boolean;
  category?: CategoryData | null;
}

interface RecurringViewProps {
  categories: CategoryData[];
  onDataChanged: () => void;
}

export default function RecurringView({
  categories,
  onDataChanged,
}: RecurringViewProps) {
  const [subTab, setSubTab] = useState<"fixed" | "installments" | "cards">("fixed");
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de Criação
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddInstallment, setShowAddInstallment] = useState(false);

  // Campos de Formulário para Nova Conta Fixa / Entrada Fixa
  const [fixedType, setFixedType] = useState<"SAIDA_FIXA" | "ENTRADA">("SAIDA_FIXA");
  const [fixedFilter, setFixedFilter] = useState<"ALL" | "ENTRADA" | "SAIDA_FIXA">("ALL");
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDueDay, setFixedDueDay] = useState("5");
  const [fixedCatId, setFixedCatId] = useState("");

  const now = new Date();
  const [fixedStartMonth, setFixedStartMonth] = useState(String(now.getMonth() + 1));
  const [fixedStartYear, setFixedStartYear] = useState(String(now.getFullYear()));
  const [fixedMonthsDuration, setFixedMonthsDuration] = useState("36");

  // Campos de Formulário para Novo Parcelamento
  const [instDesc, setInstDesc] = useState("");
  const [instTotal, setInstTotal] = useState("12");
  const [instCurrent, setInstCurrent] = useState("1");
  const [instMonthly, setInstMonthly] = useState("");
  const [instTotalAmount, setInstTotalAmount] = useState("");
  const [instValueMode, setInstValueMode] = useState<"monthly" | "total">("monthly");
  const [instDueDay, setInstDueDay] = useState("10");
  const [instCatId, setInstCatId] = useState("");
  const [instStartMonth, setInstStartMonth] = useState(String(now.getMonth() + 1));
  const [instStartYear, setInstStartYear] = useState(String(now.getFullYear()));

  const handleMonthlyAmountChange = (val: string) => {
    setInstMonthly(val);
    const num = parseFloat(val.replace(",", "."));
    const totalParc = parseInt(instTotal, 10);
    if (!isNaN(num) && num > 0 && !isNaN(totalParc) && totalParc > 0) {
      setInstTotalAmount((num * totalParc).toFixed(2));
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setInstTotalAmount(val);
    const num = parseFloat(val.replace(",", "."));
    const totalParc = parseInt(instTotal, 10);
    if (!isNaN(num) && num > 0 && !isNaN(totalParc) && totalParc > 0) {
      setInstMonthly((num / totalParc).toFixed(2));
    }
  };

  const handleTotalInstallmentsChange = (val: string) => {
    setInstTotal(val);
    const totalParc = parseInt(val, 10);
    if (!isNaN(totalParc) && totalParc > 0) {
      if (instValueMode === "monthly" && instMonthly) {
        const num = parseFloat(instMonthly.replace(",", "."));
        if (!isNaN(num) && num > 0) {
          setInstTotalAmount((num * totalParc).toFixed(2));
        }
      } else if (instValueMode === "total" && instTotalAmount) {
        const num = parseFloat(instTotalAmount.replace(",", "."));
        if (!isNaN(num) && num > 0) {
          setInstMonthly((num / totalParc).toFixed(2));
        }
      }
    }
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRec, resInst] = await Promise.all([
        fetch("/api/recurring"),
        fetch("/api/installments"),
      ]);

      if (resRec.ok) setRecurringItems(await resRec.json());
      if (resInst.ok) setInstallments(await resInst.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fixedTitle.trim(),
          type: fixedType,
          amount: parseFloat(fixedAmount.replace(",", ".")),
          dueDay: parseInt(fixedDueDay, 10),
          categoryId: fixedCatId || null,
          startYear: parseInt(fixedStartYear, 10),
          startMonth: parseInt(fixedStartMonth, 10),
          monthsDuration: parseInt(fixedMonthsDuration, 10) || 36,
        }),
      });
      if (res.ok) {
        setFixedTitle("");
        setFixedAmount("");
        setFixedMonthsDuration("36");
        setShowAddFixed(false);
        loadData();
        onDataChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFixed = async (id: string) => {
    if (!confirm("Remover esta conta recorrente e suas transações futuras pendentes?")) return;
    try {
      await fetch(`/api/recurring?id=${id}`, { method: "DELETE" });
      loadData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numTotal = parseInt(instTotal, 10) || 12;
      let monthly = parseFloat(instMonthly.replace(",", "."));
      if (instValueMode === "total") {
        const totalVal = parseFloat(instTotalAmount.replace(",", "."));
        if (!isNaN(totalVal) && totalVal > 0) {
          monthly = Number((totalVal / numTotal).toFixed(2));
        }
      }

      if (isNaN(monthly) || monthly <= 0) {
        alert("Informe um valor numérico válido para a parcela ou total da compra.");
        return;
      }

      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: instDesc.trim(),
          totalInstallments: numTotal,
          currentInstallment: parseInt(instCurrent, 10) || 1,
          monthlyAmount: monthly,
          dueDay: parseInt(instDueDay, 10),
          categoryId: instCatId || null,
          startYear: parseInt(instStartYear, 10) || now.getFullYear(),
          startMonth: parseInt(instStartMonth, 10) || (now.getMonth() + 1),
        }),
      });
      if (res.ok) {
        setInstDesc("");
        setInstMonthly("");
        setInstTotalAmount("");
        setShowAddInstallment(false);
        loadData();
        onDataChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInstallment = async (id: string) => {
    if (!confirm("Excluir este plano de parcelamento?")) return;
    try {
      await fetch(`/api/installments?id=${id}`, { method: "DELETE" });
      loadData();
      onDataChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // Somatório Total do Saldo Devedor Restante
  const totalDebtRemaining = installments
    .filter((i) => i.isActive)
    .reduce((acc, curr) => acc + curr.remainingBalance, 0);

  // Total das parcelas no mês corrente
  const totalInstallmentMonthly = installments
    .filter((i) => i.isActive)
    .reduce((acc, curr) => acc + curr.monthlyAmount, 0);

  // Total de Saídas Fixas Mensais
  const totalFixedExpenses = recurringItems
    .filter((r) => r.isActive && r.type !== "ENTRADA")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Total de Entradas Fixas Mensais (Salários / Rendas)
  const totalFixedIncomes = recurringItems
    .filter((r) => r.isActive && r.type === "ENTRADA")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Saldo Líquido Fixo Previsto
  const netFixedMonthly = totalFixedIncomes - totalFixedExpenses;

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Recorrentes, Parcelas & Cartões
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Controle de salários, receitas fixas, despesas mensais e amortização de parcelas.
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSubTab("fixed")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === "fixed"
                ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Fixos Recorrentes ({recurringItems.length})
          </button>
          <button
            onClick={() => setSubTab("installments")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === "installments"
                ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Parcelamentos ({installments.length})
          </button>
          <button
            onClick={() => setSubTab("cards")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              subTab === "cards"
                ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Projeção Cartões
          </button>
        </div>
      </div>

      {/* 2. Subtab: Contas Fixas Recorrentes */}
      {subTab === "fixed" && (
        <div className="space-y-5">
          {/* KPI Cards de Fixos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 2xl:gap-6">
            <div className="p-4 2xl:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 transition-all">
              <span className="text-[11px] 2xl:text-xs font-semibold text-emerald-700 dark:text-emerald-300 block uppercase tracking-wider">
                Entradas Fixas (Salários)
              </span>
              <span className="text-xl 2xl:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                +{formatBRL(totalFixedIncomes)}
              </span>
            </div>
            <div className="p-4 2xl:p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 transition-all">
              <span className="text-[11px] 2xl:text-xs font-semibold text-rose-700 dark:text-rose-300 block uppercase tracking-wider">
                Saídas Fixas (Contas)
              </span>
              <span className="text-xl 2xl:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                -{formatBRL(totalFixedExpenses)}
              </span>
            </div>
            <div
              className={`p-4 2xl:p-6 rounded-2xl border transition-all ${
                netFixedMonthly >= 0
                  ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40"
              }`}
            >
              <span className="text-[11px] 2xl:text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Resultado Fixo Mensal
              </span>
              <span
                className={`text-xl 2xl:text-2xl font-black mt-1 block ${
                  netFixedMonthly >= 0
                    ? "text-slate-900 dark:text-white"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {formatBRL(netFixedMonthly)}
              </span>
            </div>
          </div>

          {/* Barra de Ações: Filtro e Botão Nova Recorrência */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setFixedFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  fixedFilter === "ALL"
                    ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Todos ({recurringItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFixedFilter("ENTRADA")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  fixedFilter === "ENTRADA"
                    ? "bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                Entradas ({recurringItems.filter((r) => r.type === "ENTRADA").length})
              </button>
              <button
                type="button"
                onClick={() => setFixedFilter("SAIDA_FIXA")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  fixedFilter === "SAIDA_FIXA"
                    ? "bg-white text-rose-700 dark:bg-slate-900 dark:text-rose-400 shadow-sm"
                    : "text-slate-500 hover:text-rose-600"
                }`}
              >
                Saídas ({recurringItems.filter((r) => r.type !== "ENTRADA").length})
              </button>
            </div>

            <button
              onClick={() => setShowAddFixed(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Nova Recorrência Fixa
            </button>
          </div>

          {/* Form Modal / Inline para Nova Conta Fixa */}
          {showAddFixed && (
            <form
              onSubmit={handleCreateFixed}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/30 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadastrar Recorrência Fixa Mensal
                </h3>
                <span className="text-[11px] text-slate-400">
                  Replicado automaticamente para 36 meses
                </span>
              </div>

              {/* Seletor Tipo: Entrada Fixa vs Saída Fixa */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Tipo de Recorrência *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFixedType("SAIDA_FIXA");
                      setFixedCatId("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                      fixedType === "SAIDA_FIXA"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    Saída Fixa (Despesa / Conta)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFixedType("ENTRADA");
                      setFixedCatId("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                      fixedType === "ENTRADA"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    Entrada Fixa (Salário / Renda)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">Título / Descrição *</label>
                  <input
                    type="text"
                    required
                    placeholder={
                      fixedType === "ENTRADA"
                        ? "Ex: Salário Mensal, Pró-Labore, Aluguel Recebido"
                        : "Ex: Aluguel, Internet, Academia"
                    }
                    value={fixedTitle}
                    onChange={(e) => setFixedTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">Categoria</label>
                  <select
                    value={fixedCatId}
                    onChange={(e) => setFixedCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="">Selecione categoria...</option>
                    {categories
                      .filter((c) => c.type === fixedType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Valor Mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">
                    {fixedType === "ENTRADA" ? "Dia do Recebimento (1-31) *" : "Dia do Vencimento (1-31) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={fixedDueDay}
                    onChange={(e) => setFixedDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Iniciar a Partir de</label>
                  <div className="flex gap-1">
                    <select
                      value={fixedStartMonth}
                      onChange={(e) => setFixedStartMonth(e.target.value)}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          Mês {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={fixedStartYear}
                      onChange={(e) => setFixedStartYear(e.target.value)}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Horizonte de Projeção & Aviso dos 36 meses */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  ✨ <strong>Aviso de Projeção:</strong> Esta {fixedType === "ENTRADA" ? "renda fixa (salário)" : "conta fixa"} será criada por padrão por <strong>36 meses</strong> e ativará automaticamente os anos sequentes necessários no sistema para comportá-la. Você também pode estender por um período menor selecionando abaixo:
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Duração da Projeção:
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: "6 meses", value: "6" },
                      { label: "12 meses (1 ano)", value: "12" },
                      { label: "24 meses (2 anos)", value: "24" },
                      { label: "36 meses (3 anos - Padrão)", value: "36" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFixedMonthsDuration(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          fixedMonthsDuration === opt.value
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ou digite o número exato de meses:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={fixedMonthsDuration}
                      onChange={(e) => setFixedMonthsDuration(e.target.value)}
                      className="w-16 px-2 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-center"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">meses</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFixed(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  Salvar Recorrência
                </button>
              </div>
            </form>
          )}

          {/* Lista de Contas Fixas e Entradas Fixas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 xl:divide-y-0 xl:grid xl:grid-cols-2 xl:gap-3.5 xl:p-4">
            {recurringItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 xl:col-span-2">
                Nenhuma conta fixa ou salário cadastrado.
              </div>
            ) : (
              recurringItems
                .filter((item) => {
                  if (fixedFilter === "ENTRADA") return item.type === "ENTRADA";
                  if (fixedFilter === "SAIDA_FIXA") return item.type !== "ENTRADA";
                  return true;
                })
                .map((item) => {
                  const isIncome = item.type === "ENTRADA";
                  return (
                    <div
                      key={item.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 xl:bg-slate-50/50 dark:xl:bg-slate-800/30 xl:border xl:border-slate-200/80 dark:xl:border-slate-700/60 xl:rounded-xl transition-colors shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
                            isIncome
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="text-[10px] opacity-70 font-normal">DIA</span>
                          <span className="text-sm">{item.dueDay}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isIncome
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {isIncome ? "Entrada Fixa" : "Saída Fixa"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.category?.name || (isIncome ? "Rendimento Recorrente" : "Despesa Recorrente")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-black ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isIncome ? `+ ${formatBRL(item.amount)}` : `- ${formatBRL(item.amount)}`}
                        </span>
                        <button
                          onClick={() => handleDeleteFixed(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Excluir item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* 3. Subtab: Parcelamentos e Financiamentos */}
      {subTab === "installments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="p-4 2xl:p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex-1 flex items-center justify-between transition-all">
              <div>
                <span className="text-xs 2xl:text-sm text-rose-700 dark:text-rose-300 font-semibold block uppercase tracking-wider">
                  Saldo Devedor Total Restante
                </span>
                <span className="text-2xl 2xl:text-3xl font-black text-rose-700 dark:text-rose-300 mt-1 block">
                  {formatBRL(totalDebtRemaining)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 block">
                  Parcelas / Mês
                </span>
                <span className="text-base 2xl:text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {formatBRL(totalInstallmentMonthly)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAddInstallment(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              Novo Parcelamento
            </button>
          </div>

          {/* Form Modal / Inline para Novo Parcelamento */}
          {showAddInstallment && (
            <form
              onSubmit={handleCreateInstallment}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-500/30 shadow-md space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cadastrar Compras Parceladas / Financiamento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gera a primeira parcela no mês de início e as demais consecutivamente nos meses posteriores.
                </p>
              </div>

              {/* Descrição e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Descrição da Compra / Financiamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Celular Samsung 12x, Financiamento Moto, Sofá"
                    value={instDesc}
                    onChange={(e) => setInstDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={instCatId}
                    onChange={(e) => setInstCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="">Selecione categoria...</option>
                    {categories
                      .filter((c) => c.type === "SAIDA_FIXA")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Modo de Valor e Parcelas */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Definição de Parcelas e Valores
                  </span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setInstValueMode("monthly")}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        instValueMode === "monthly"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Informar Valor da Parcela
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstValueMode("total")}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        instValueMode === "total"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Informar Valor Total
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Quantidade de Parcelas *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="240"
                        required
                        value={instTotal}
                        onChange={(e) => handleTotalInstallmentsChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                        placeholder="Ex: 12"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">vezes</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {instValueMode === "monthly" ? "Valor de Cada Parcela (R$) *" : "Valor da Parcela (calculado)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={instValueMode === "monthly"}
                      disabled={instValueMode === "total"}
                      placeholder="0,00"
                      value={instMonthly}
                      onChange={(e) => handleMonthlyAmountChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-indigo-600 dark:text-indigo-400 disabled:opacity-80"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {instValueMode === "total" ? "Valor Total da Compra (R$) *" : "Valor Total (calculado)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required={instValueMode === "total"}
                      disabled={instValueMode === "monthly"}
                      placeholder="0,00"
                      value={instTotalAmount}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold disabled:opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* Vencimento, Início e Parcela Atual */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Dia do Vencimento Mensal (1-31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={instDueDay}
                    onChange={(e) => setInstDueDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Mês e Ano de Início *
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={instStartMonth}
                      onChange={(e) => setInstStartMonth(e.target.value)}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          Mês {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={instStartYear}
                      onChange={(e) => setInstStartYear(e.target.value)}
                      className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Parcela Atual de Partida
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={instTotal || 12}
                    required
                    value={instCurrent}
                    onChange={(e) => setInstCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                    title="Geralmente 1 para compra nova. Se você já pagou parcelas no passado, informe a parcela deste mês."
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {(() => {
                const totalP = parseInt(instTotal, 10) || 0;
                const currentP = parseInt(instCurrent, 10) || 1;
                const monthlyVal = parseFloat(instMonthly.replace(",", ".")) || 0;
                const totalVal = monthlyVal * totalP;
                const startM = parseInt(instStartMonth, 10) || (now.getMonth() + 1);
                const startY = parseInt(instStartYear, 10) || now.getFullYear();
                const remainingCount = Math.max(0, totalP - currentP);
                const endDate = addMonths(new Date(startY, startM - 1, 1), remainingCount);
                const endM = endDate.getMonth() + 1;
                const endY = endDate.getFullYear();

                if (totalP <= 0 || monthlyVal <= 0) return null;

                return (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Cronograma: {totalP} parcelas de {formatBRL(monthlyVal)} (Total financiado: {formatBRL(totalVal)})
                    </div>
                    <p className="text-[11px] opacity-90">
                      • Parcela <strong>{currentP}/{totalP}</strong> lançada no dia {instDueDay} do Mês {startM}/{startY}.
                    </p>
                    <p className="text-[11px] opacity-90">
                      • As próximas <strong>{remainingCount} parcelas</strong> serão distribuídas automaticamente nos meses posteriores consecutivos até o Mês {endM}/{endY}.
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInstallment(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  Salvar Parcelamento
                </button>
              </div>
            </form>
          )}

          {/* Cards de Parcelamentos com Barra de Progresso */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 2xl:gap-5">
            {installments.length === 0 ? (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 2xl:col-span-4 p-8 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Nenhum parcelamento registrado.
              </div>
            ) : (
              installments.map((plan) => {
                const percent = Math.min(
                  100,
                  Math.round(
                    ((plan.currentInstallment - 1) / plan.totalInstallments) * 100
                  )
                );
                return (
                  <div
                    key={plan.id}
                    className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                          {plan.description}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Vencimento: todo dia {plan.dueDay}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteInstallment(plan.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Barra de Progresso */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          Progresso: {plan.currentInstallment}/{plan.totalInstallments} parcelas
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {percent}% pago
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Valores: Parcela Mensal vs Saldo Devedor Restante */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Parcela Mensal</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {formatBRL(plan.monthlyAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[11px]">Saldo Devedor Restante</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatBRL(plan.remainingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Subtab: Projeção de Faturas de Cartão */}
      {subTab === "cards" && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Projeção de Faturas e Compras Parceladas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento das parcelas vincendas e impacto nas próximas faturas.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 xl:divide-y-0 xl:grid xl:grid-cols-2 2xl:grid-cols-3 xl:gap-3.5 pt-2">
            {installments
              .filter((i) => i.isActive)
              .map((i) => (
                <div key={i.id} className="py-3.5 xl:p-4 flex items-center justify-between text-sm xl:rounded-xl xl:border xl:border-slate-100 dark:xl:border-slate-800 xl:bg-slate-50/50 dark:xl:bg-slate-800/30 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block line-clamp-1">
                      {i.description}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      Restam {i.totalInstallments - i.currentInstallment + 1} faturas de {formatBRL(i.monthlyAmount)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0 pl-2">
                    {formatBRL(i.remainingBalance)} a vencer
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

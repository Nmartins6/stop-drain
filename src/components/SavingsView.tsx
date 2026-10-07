"use client";

import React, { useState, useEffect } from "react";
import { PiggyBank, Save, CheckCircle2, Plus, Trash2 } from "lucide-react";
import DeleteYearModal from "./DeleteYearModal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SavingsMonthRecord {
  month: number;
  monthName: string;
  yearMonth: string;
  entradas: number;
  amountSaved: number;
  savingsRate: number;
  notes: string;
}

interface SavingsData {
  year: number;
  totalYearSaved: number;
  totalYearEntradas: number;
  overallRate: number;
  records: SavingsMonthRecord[];
}

export default function SavingsView() {
  const [year, setYear] = useState(2026);
  const [yearList, setYearList] = useState<number[]>([2024, 2025, 2026, 2027, 2028]);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);

  const loadYears = async () => {
    try {
      const res = await fetch("/api/years");
      if (res.ok) {
        const json = await res.json();
        if (json.years && json.years.length > 0) {
          setYearList(json.years);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar anos:", err);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const handleAddNewYear = async () => {
    const parsed = parseInt(newYearInput, 10);
    if (!isNaN(parsed) && parsed > 2000 && parsed < 2100) {
      try {
        const res = await fetch("/api/years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: parsed }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.years) setYearList(json.years);
        } else {
          if (!yearList.includes(parsed)) {
            setYearList([...yearList, parsed].sort((a, b) => a - b));
          }
        }
      } catch {
        if (!yearList.includes(parsed)) {
          setYearList([...yearList, parsed].sort((a, b) => a - b));
        }
      }
      setYear(parsed);
      setNewYearInput("");
      setShowAddYear(false);
    }
  };
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edição rápida de aporte
  const [selectedMonth, setSelectedMonth] = useState(10); // Outubro padrão
  const [inputAmount, setInputAmount] = useState("");
  const [inputNotes, setInputNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const loadData = async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/savings?year=${y}`);
      if (res.ok) {
        const json: SavingsData = await res.json();
        setData(json);

        // Preencher input do mês selecionado
        const rec = json.records.find((r) => r.month === selectedMonth);
        if (rec) {
          setInputAmount(rec.amountSaved > 0 ? String(rec.amountSaved) : "");
          setInputNotes(rec.notes || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(year);
  }, [year]);

  const handleSelectMonth = (m: number) => {
    setSelectedMonth(m);
    if (data) {
      const rec = data.records.find((r) => r.month === m);
      if (rec) {
        setInputAmount(rec.amountSaved > 0 ? String(rec.amountSaved) : "");
        setInputNotes(rec.notes || "");
      }
    }
  };

  const handleSaveAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    const yearMonth = `${year}-${String(selectedMonth).padStart(2, "0")}`;
    const parsed = parseFloat(inputAmount.replace(",", ".")) || 0;

    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth,
          amountSaved: parsed,
          notes: inputNotes.trim(),
        }),
      });

      if (res.ok) {
        setSuccessMsg("Aporte salvo com sucesso!");
        loadData(year);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Preparar dados do gráfico com acúmulo progressivo
  let runningTotal = 0;
  const chartData = (data?.records || []).map((r) => {
    runningTotal += r.amountSaved;
    return {
      name: r.monthName.slice(0, 3),
      aporteMes: r.amountSaved,
      acumulado: runningTotal,
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Seletor de Ano */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Economia & Aportes Mensais
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Digitalização da Aba Economia com cálculo em tempo real da Taxa de Poupança.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {yearList.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                year === y
                  ? "bg-emerald-600 text-white shadow-sm scale-105"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {y}
            </button>
          ))}

          {showAddYear ? (
            <div className="flex items-center gap-1 pl-1">
              <input
                type="number"
                placeholder="Ano"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                className="w-16 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddNewYear()}
              />
              <button
                onClick={handleAddNewYear}
                className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded font-bold"
              >
                OK
              </button>
              <button
                onClick={() => setShowAddYear(false)}
                className="text-xs text-slate-400 px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddYear(true)}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 transition-colors"
                title="Adicionar Ano"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Novo Ano</span>
              </button>

              <button
                onClick={() => setYearToDelete(year)}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition-colors"
                title={`Excluir ano ${year} e todos os seus dados`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir {year}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Cards de Resumo Anual */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 2xl:gap-6">
          <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-400 uppercase tracking-wider block">
              Total Economizado ({year})
            </span>
            <span className="text-2xl 2xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatBRL(data.totalYearSaved)}
            </span>
            <span className="text-xs 2xl:text-sm text-slate-500 mt-1 block">
              Soma de todos os aportes do ano
            </span>
          </div>

          <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-400 uppercase tracking-wider block">
              Total Rendimentos ({year})
            </span>
            <span className="text-2xl 2xl:text-3xl font-black text-slate-900 dark:text-white mt-1 block">
              {formatBRL(data.totalYearEntradas)}
            </span>
            <span className="text-xs 2xl:text-sm text-slate-500 mt-1 block">
              Rendimento bruto anual registrado
            </span>
          </div>

          <div className="p-5 2xl:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
            <span className="text-xs 2xl:text-sm font-semibold text-slate-400 uppercase tracking-wider block">
              Taxa Média de Poupança Anual
            </span>
            <span className="text-2xl 2xl:text-3xl font-black text-amber-500 mt-1 block">
              {data.overallRate}%
            </span>
            <span className="text-xs 2xl:text-sm text-slate-500 mt-1 block">
              Eficiência geral sobre o rendimento
            </span>
          </div>
        </div>
      )}

      {/* 3. Formulário de Registro de Aporte do Mês */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Registrar Aporte / Reserva
            </h3>
          </div>
          {successMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {successMsg}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveAporte} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Mês de Referência
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                {data?.records.map((r) => (
                  <option key={r.month} value={r.month}>
                    {r.monthName} / {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Valor Aportado (R$) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Notas / Destino do Investimento (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Tesouro Selic, CDB 110%, FIIs, Reserva de Emergência"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 4. Tabela Comparativa Anual Mês a Mês */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Tabela Comparativa Mês a Mês ({year})
          </h3>
          <span className="text-xs text-slate-500">
            Fórmula: % Economia = (Economia / Entradas) * 100
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm 2xl:text-base">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs 2xl:text-sm text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <th className="py-3.5 2xl:py-4 px-4 2xl:px-6">Mês</th>
                <th className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">Entradas (R$)</th>
                <th className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">Economia Aportada (R$)</th>
                <th className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-center">% Economia</th>
                <th className="py-3.5 2xl:py-4 px-4 2xl:px-6">Notas / Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.records.map((row) => (
                <tr
                  key={row.month}
                  onClick={() => handleSelectMonth(row.month)}
                  className={`cursor-pointer transition-colors ${
                    selectedMonth === row.month
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 font-bold text-slate-900 dark:text-white">
                    {row.monthName}
                  </td>
                  <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right text-emerald-600 dark:text-emerald-400">
                    {formatBRL(row.entradas)}
                  </td>
                  <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-bold text-slate-900 dark:text-white">
                    {row.amountSaved > 0 ? formatBRL(row.amountSaved) : "-"}
                  </td>
                  <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs 2xl:text-sm font-bold ${
                        row.savingsRate >= 20
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : row.savingsRate > 0
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "text-slate-400"
                      }`}
                    >
                      {row.savingsRate}%
                    </span>
                  </td>
                  <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-xs 2xl:text-sm text-slate-500 dark:text-slate-400">
                    {row.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Gráfico de Evolução Patrimonial Acumulada */}
      <div className="p-6 2xl:p-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base 2xl:text-lg font-bold text-slate-900 dark:text-white">
            Evolução Patrimonial Acumulada ({year})
          </h3>
          <p className="text-xs 2xl:text-sm text-slate-500 dark:text-slate-400">
            Crescimento do total investido/poupado ao longo dos meses
          </p>
        </div>

        <div className="h-64 2xl:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
              <Area
                type="monotone"
                dataKey="acumulado"
                name="Patrimônio Poupado Acumulado"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAcumulado)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Ano Inteiro */}
      <DeleteYearModal
        isOpen={yearToDelete !== null}
        year={yearToDelete || year}
        onClose={() => setYearToDelete(null)}
        onSuccess={(remainingYears, deleted) => {
          setYearList(remainingYears);
          const nearest =
            remainingYears.filter((y) => y < deleted).pop() ||
            remainingYears[0] ||
            new Date().getFullYear();
          setYear(nearest);
          loadData(nearest);
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Layers } from "lucide-react";
import { CategoryData, TransactionType } from "@/lib/types";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryData[];
  defaultDate?: string;
  defaultType?: TransactionType;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  defaultDate,
  defaultType = "GASTO_DIARIO",
}: QuickAddModalProps) {
  const [modalType, setModalType] = useState<"GASTO_DIARIO" | "SAIDA_FIXA" | "PARCELADO" | "ENTRADA">(
    defaultType === "ENTRADA" ? "ENTRADA" : defaultType === "SAIDA_FIXA" ? "SAIDA_FIXA" : "GASTO_DIARIO"
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("12");
  const [installmentValueMode, setInstallmentValueMode] = useState<"monthly" | "total">("monthly");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState("36");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
    if (defaultType) {
      setModalType(
        defaultType === "ENTRADA" ? "ENTRADA" : defaultType === "SAIDA_FIXA" ? "SAIDA_FIXA" : "GASTO_DIARIO"
      );
    }
  }, [defaultDate, defaultType, isOpen]);

  // Filtrar categorias correspondentes ao tipo selecionado
  const filteredCategories = categories.filter((c) => {
    if (modalType === "PARCELADO") return c.type === "SAIDA_FIXA";
    return c.type === modalType;
  });

  useEffect(() => {
    if (filteredCategories.length > 0 && !categoryId) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [modalType, filteredCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe um valor numérico válido maior que zero");
      return;
    }

    if (!description.trim()) {
      setError("Informe a descrição do lançamento");
      return;
    }

    setLoading(true);

    try {
      if (modalType === "PARCELADO") {
        const numTotal = parseInt(installmentsCount, 10) || 12;
        const dateObj = new Date(date + "T12:00:00Z");
        let monthlyAmount = parsedAmount;
        if (installmentValueMode === "total") {
          monthlyAmount = Number((parsedAmount / numTotal).toFixed(2));
        }

        const res = await fetch("/api/installments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description.trim(),
            totalInstallments: numTotal,
            currentInstallment: 1,
            monthlyAmount,
            dueDay: dateObj.getUTCDate(),
            startYear: dateObj.getUTCFullYear(),
            startMonth: dateObj.getUTCMonth() + 1,
            categoryId: categoryId || null,
            firstInstallmentPaid: isPaid,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao salvar parcelamento");
        }
      } else {
        const isRec = (modalType === "ENTRADA" || modalType === "SAIDA_FIXA") ? isRecurring : false;
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description.trim(),
            amount: parsedAmount,
            type: modalType,
            date,
            categoryId: categoryId || null,
            isPaid,
            isRecurring: isRec,
            monthsDuration: isRec ? parseInt(recurringMonths, 10) || 36 : undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao salvar lançamento");
        }
      }

      // Limpar campos e fechar
      setDescription("");
      setAmount("");
      setIsRecurring(false);
      setRecurringMonths("36");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const parsedVal = parseFloat(amount.replace(",", ".")) || 0;
  const numParcelasPreview = parseInt(installmentsCount, 10) || 12;
  const computedMonthly = installmentValueMode === "total"
    ? (parsedVal > 0 ? parsedVal / numParcelasPreview : 0)
    : parsedVal;
  const computedTotal = installmentValueMode === "total"
    ? parsedVal
    : (parsedVal > 0 ? parsedVal * numParcelasPreview : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Novo Lançamento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
              {error}
            </div>
          )}

          {/* Type Selector (4 Tabs) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setModalType("GASTO_DIARIO");
                  setIsPaid(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                  modalType === "GASTO_DIARIO"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ArrowDownCircle className="h-3.5 w-3.5" />
                Gasto Diário
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalType("SAIDA_FIXA");
                  setIsPaid(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                  modalType === "SAIDA_FIXA"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ArrowDownCircle className="h-3.5 w-3.5" />
                Saída Fixa
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalType("PARCELADO");
                  setIsPaid(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                  modalType === "PARCELADO"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Parcelado
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalType("ENTRADA");
                  setIsPaid(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                  modalType === "ENTRADA"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Entrada
              </button>
            </div>
          </div>

          {/* Seletor de Parcelas quando PARCELADO */}
          {modalType === "PARCELADO" && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Configuração do Parcelamento
                </span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInstallmentValueMode("monthly")}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      installmentValueMode === "monthly"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Valor da Parcela
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentValueMode("total")}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      installmentValueMode === "total"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Valor Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Número de Parcelas *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="240"
                    required
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                    placeholder="Ex: 12"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">vezes</span>
                </div>
              </div>
            </div>
          )}

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {modalType === "PARCELADO"
                ? installmentValueMode === "monthly"
                  ? "Valor de Cada Parcela (R$) *"
                  : "Valor Total da Compra (R$) *"
                : "Valor (R$) *"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-medium">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* Live Preview de Parcelas */}
          {modalType === "PARCELADO" && parsedVal > 0 && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Cronograma: {numParcelasPreview}x de {formatBRL(computedMonthly)} (Total: {formatBRL(computedTotal)})
              </div>
              <p className="text-[11px] opacity-90">
                • Parcela <strong>1/{numParcelasPreview}</strong> no mês selecionado ({date}).
              </p>
              <p className="text-[11px] opacity-90">
                • As outras <strong>{numParcelasPreview - 1} parcelas</strong> serão distribuídas automaticamente nos {numParcelasPreview - 1} meses posteriores no Livro Caixa Diário.
              </p>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              required
              placeholder={
                modalType === "PARCELADO"
                  ? "Ex: Celular Samsung 12x, Notebook, Sofá, Seguro Auto"
                  : "Ex: Almoço restaurante, Salário, Compra mercado..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Linha dupla: Data e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {modalType === "PARCELADO" ? "Data da 1ª Parcela *" : "Data do Lançamento *"}
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione uma categoria...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status de Pagamento (Checkbox) */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPaidCheck"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="isPaidCheck"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              {modalType === "PARCELADO"
                ? "1ª Parcela já foi paga no ato da compra"
                : "Lançamento já foi quitado / pago"}
            </label>
          </div>

          {/* Opção de Tornar Recorrente (Replicação Mensal contínua) */}
          {(modalType === "SAIDA_FIXA" || modalType === "ENTRADA") && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 transition-all">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="isRecurringCheck"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="isRecurringCheck"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  <span className="font-semibold block text-slate-900 dark:text-white">
                    {modalType === "ENTRADA"
                      ? "Tornar Entrada Recorrente (Salário / Renda Fixa)"
                      : "Tornar Conta Recorrente (Despesa Fixa Mensal)"}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Replicar nos meses subsequentes e garantir a continuidade do fluxo.
                  </span>
                </label>
              </div>

              {isRecurring && (
                <div className="pl-6 pt-1 space-y-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    ✨ <strong>Aviso de Projeção:</strong> Esta {modalType === "ENTRADA" ? "renda fixa" : "despesa fixa"} será criada por padrão por <strong>36 meses</strong> e ativará automaticamente os anos sequentes necessários para comportá-la. Você também pode estender por um período menor selecionando abaixo:
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
                          onClick={() => setRecurringMonths(opt.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            recurringMonths === opt.value
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
                        value={recurringMonths}
                        onChange={(e) => setRecurringMonths(e.target.value)}
                        className="w-16 px-2 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-center"
                      />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">meses</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Lançamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

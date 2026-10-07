"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Edit3 } from "lucide-react";
import { CategoryData, TransactionItem, TransactionType } from "@/lib/types";

interface EditTransactionModalProps {
  transaction: TransactionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryData[];
}

export default function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSuccess,
  categories,
}: EditTransactionModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("GASTO_DIARIO");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setDate(transaction.date);
      setCategoryId(transaction.categoryId || "");
      setIsPaid(transaction.isPaid);
      setError("");
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Informe um valor válido");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
          description: description.trim(),
          amount: parsedAmount,
          type,
          date,
          categoryId: categoryId || null,
          isPaid,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao atualizar");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?id=${transaction.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir lançamento");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Editar Lançamento
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
            <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType("GASTO_DIARIO")}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                type === "GASTO_DIARIO"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Gasto Diário
            </button>
            <button
              type="button"
              onClick={() => setType("SAIDA_FIXA")}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                type === "SAIDA_FIXA"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Saída Fixa
            </button>
            <button
              type="button"
              onClick={() => setType("ENTRADA")}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                type === "ENTRADA"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Entrada
            </button>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Data e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status de Pagamento */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editPaidCheck"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="editPaidCheck"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Lançamento quitado / pago
            </label>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

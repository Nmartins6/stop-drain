"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { YearSummary } from "@/lib/engine";

interface DeleteYearModalProps {
  isOpen: boolean;
  year: number;
  onClose: () => void;
  onSuccess: (remainingYears: number[], deletedYear: number) => void;
}

export default function DeleteYearModal({
  isOpen,
  year,
  onClose,
  onSuccess,
}: DeleteYearModalProps) {
  const [summary, setSummary] = useState<YearSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  useEffect(() => {
    if (isOpen && year) {
      setConfirmText("");
      setError("");
      setLoadingSummary(true);

      fetch(`/api/years?summaryYear=${year}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.summary) {
            setSummary(data.summary);
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar resumo do ano:", err);
        })
        .finally(() => {
          setLoadingSummary(false);
        });
    }
  }, [isOpen, year]);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim() === String(year);

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/years?year=${year}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao excluir o ano");
      }

      onSuccess(data.years, year);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao excluir");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-950/50 overflow-hidden">
        {/* Header com Alerta de Perigo */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Excluir Ano {year} e Todos os Dados
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Ação destrutiva permanente e irreversível
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Aviso Explicativo */}
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>
              Você está prestes a remover o ano <strong>{year}</strong> completo da sua contabilidade.
              Todos os lançamentos, despesas fixas, salários e registros de aporte correspondentes a este ano serão <strong>apagados definitivamente</strong>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ℹ️ O saldo contínuo (roll-forward) dos anos seguintes ({year + 1} em diante) será recalculado automaticamente a partir do último saldo válido anterior.
            </p>
          </div>

          {/* Resumo dos Dados que serão Excluídos */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Dados cadastrados em {year}:
            </span>

            {loadingSummary ? (
              <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Contabilizando registros do ano {year}...</span>
              </div>
            ) : summary ? (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Lançamentos Diários & Fixos</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {summary.transactionsCount} movimentações
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Aportes de Economia</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {summary.savingsCount} registros ({formatBRL(summary.totalSavings)})
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Total de Entradas</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatBRL(summary.totalEntradas)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Total de Saídas</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    -{formatBRL(summary.totalSaidas)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Nenhum lançamento encontrado em {year}.</p>
            )}
          </div>

          {/* Confirmação de Segurança por Digitação */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Para confirmar a exclusão, digite <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{year}</span> abaixo:
            </label>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Digite ${year} para liberar o botão`}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !isDeleting) {
                  handleDelete();
                }
              }}
            />
          </div>
        </div>

        {/* Footer com Botões */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all ${
              isConfirmed && !isDeleting
                ? "bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-600/30"
                : "bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Excluindo Dados...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Excluir Ano {year} Definitivamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

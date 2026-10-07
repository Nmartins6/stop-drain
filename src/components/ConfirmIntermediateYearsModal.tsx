"use client";

import React from "react";
import { AlertCircle, CalendarPlus, X } from "lucide-react";

interface ConfirmIntermediateYearsModalProps {
  isOpen: boolean;
  targetYear: number;
  missingYears: number[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmIntermediateYearsModal({
  isOpen,
  targetYear,
  missingYears,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmIntermediateYearsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Criação Sequencial de Anos
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Continuidade cronológica do fluxo
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                Anos intermediários necessários
              </p>
              <p>
                Para manter a integridade dos saldos contínuos (roll-forward), não é permitido pular anos.
                Para criar o ano de <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{targetYear}</strong>,
                o sistema criará automaticamente o(s) seguinte(s) ano(s) intermediário(s):
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider">
              Anos que serão ativados:
            </span>
            <div className="flex flex-wrap gap-2">
              {missingYears.map((yr) => (
                <span
                  key={yr}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60"
                >
                  +{yr} (Intermediário)
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                +{targetYear} (Solicitado)
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deseja que o sistema crie automaticamente a sequência completa até {targetYear}?
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              {loading ? "Criando..." : "Confirmar e Criar Sequência"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

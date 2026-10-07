"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Calendar,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Copy,
  CalendarCheck,
  PiggyBank,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import DeleteYearModal from "./DeleteYearModal";
import ConfirmIntermediateYearsModal from "./ConfirmIntermediateYearsModal";

interface SettingsViewProps {
  user: { name: string; email: string } | null;
  workspace: { id: string; name: string; calendarToken: string } | null;
  onNavigateToTab: (tab: string) => void;
  onYearsChanged?: () => void;
}

export default function SettingsView({
  user,
  workspace,
  onNavigateToTab,
  onYearsChanged,
}: SettingsViewProps) {
  const [years, setYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modais
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [intermediateData, setIntermediateData] = useState<{
    targetYear: number;
    missingYears: number[];
  } | null>(null);
  const [confirmingIntermediate, setConfirmingIntermediate] = useState(false);

  // Copiar iCal Link
  const [copiedLink, setCopiedLink] = useState(false);

  const currentYear = new Date().getFullYear();

  const loadYears = async () => {
    setLoadingYears(true);
    try {
      const res = await fetch("/api/years");
      if (res.ok) {
        const data = await res.json();
        if (data.years) {
          setYears(data.years);
        }
      }
    } catch (err) {
      console.error("Erro ao listar anos:", err);
    } finally {
      setLoadingYears(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const handleAddYear = async (confirmIntermediate = false, overrideTarget?: number) => {
    const target = overrideTarget ?? parseInt(newYearInput.trim(), 10);
    if (isNaN(target) || target < 2000 || target > 2100) {
      setMessage({ type: "error", text: "Informe um ano válido entre 2000 e 2100" });
      return;
    }

    if (!confirmIntermediate && years.includes(target)) {
      setMessage({ type: "error", text: `O ano de ${target} já está ativo no sistema.` });
      return;
    }

    setMessage(null);
    if (confirmIntermediate) {
      setConfirmingIntermediate(true);
    } else {
      setIsAddingYear(true);
    }

    try {
      const res = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: target, confirmIntermediate }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao adicionar ano");
      }

      if (data.requiresConfirmation) {
        setIntermediateData({
          targetYear: data.year,
          missingYears: data.missingYears,
        });
        return;
      }

      // Sucesso na criação
      if (data.years) {
        setYears(data.years);
      }
      setNewYearInput("");
      setIntermediateData(null);
      const createdCount = data.createdYears?.length || 1;
      const createdList = (data.createdYears || [target]).join(", ");
      setMessage({
        type: "success",
        text: `Ano(s) [${createdList}] adicionado(s) com sucesso com continuidade de saldo garantida!`,
      });
      onYearsChanged?.();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na operação" });
    } finally {
      setIsAddingYear(false);
      setConfirmingIntermediate(false);
    }
  };

  const calendarUrl =
    typeof window !== "undefined" && workspace?.calendarToken
      ? `${window.location.origin}/api/calendar/feed?token=${workspace.calendarToken}`
      : "";

  const handleCopyCalendarUrl = () => {
    if (!calendarUrl) return;
    navigator.clipboard.writeText(calendarUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Configurações do Sistema
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gerencie exercícios anuais, exclusões centralizadas e preferências do workspace
            </p>
          </div>
        </div>

        <button
          onClick={loadYears}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loadingYears ? "animate-spin" : ""}`} />
          Atualizar Dados
        </button>
      </div>

      {/* Mensagens de feedback */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-start gap-3 animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Card 1: Central de Gerenciamento de Anos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Gerenciamento Central de Anos & Exercícios Fiscais
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Regra sequencial estrita com base no ano vigente ({currentYear})
          </span>
        </div>

        {/* Informações da regra de continuidade */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-500" />
            Como funciona a criação e exclusão de anos:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
            <li>
              <strong>Base cronológica inicial:</strong> Novos workspaces iniciam apenas com o ano corrente ({currentYear}).
            </li>
            <li>
              <strong>Sem pulos cronológicos:</strong> Não é permitido criar um ano futuro (ex: 2029) sem que os anos anteriores (2027, 2028) existam. Caso você tente, o sistema solicitará confirmação para criar automaticamente os anos intermediários.
            </li>
            <li>
              <strong>Exclusão Segura Centralizada:</strong> Excluir um ano apaga todas as transações, economias e saldos cadastrados nele de forma permanente, recalculando em cadeia o saldo continuado dos anos posteriores.
            </li>
          </ul>
        </div>

        {/* Formulário para Adicionar Ano */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Criar Novo Ano
            </label>
            <input
              type="number"
              min="2020"
              max="2050"
              placeholder={`Ex: ${(years.length > 0 ? Math.max(...years) + 1 : currentYear + 1)}`}
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddYear(false)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => handleAddYear(false)}
            disabled={isAddingYear || !newYearInput.trim()}
            className="sm:self-end px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{isAddingYear ? "Processando..." : "Adicionar Ano"}</span>
          </button>
        </div>

        {/* Tabela de Anos Ativos */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Anos Ativos no Workspace ({years.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {years.map((y) => {
              const isCurrent = y === currentYear;
              return (
                <div
                  key={y}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isCurrent
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {y}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          Ano Vigente
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Exercício Fiscal Ativo
                    </span>
                  </div>

                  <button
                    onClick={() => setYearToDelete(y)}
                    className="p-2.5 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 dark:text-rose-400 dark:hover:bg-rose-600/90 transition-all border border-rose-200 dark:border-rose-900/60 shadow-sm"
                    title={`Excluir ano ${y} e todos os seus lançamentos`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card 2: Sincronização & Integrações */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CalendarCheck className="h-5 w-5 text-teal-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Sincronização com Google Calendar / Apple Calendar (iCal)
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Você pode assinar o feed dinâmico de vencimentos financeiros diretamente no seu Google Calendar, Apple Calendar ou Outlook para receber alertas no smartphone.
        </p>

        {calendarUrl ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Link de Assinatura iCal (Privado & Seguro):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={calendarUrl}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono select-all"
              />
              <button
                onClick={handleCopyCalendarUrl}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Token de calendário não configurado para este workspace.</p>
        )}
      </div>

      {/* Card 3: Módulos do Sistema & Acesso a Economia */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <PiggyBank className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Módulos do Sistema & Economia / Aportes
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Módulo de Economia & Aportes Mensais
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Acesso via URL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Este módulo foi ocultado da barra de navegação principal a seu pedido, mas continua 100% ativo e acessível diretamente pela rota <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">?tab=savings</code>.
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab("savings")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all shrink-0"
          >
            <span>Acessar Módulo Economia</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Modal de Exclusão Segura */}
      {yearToDelete && (
        <DeleteYearModal
          isOpen={true}
          year={yearToDelete}
          onClose={() => setYearToDelete(null)}
          onSuccess={(remainingYears, deleted) => {
            setYears(remainingYears);
            setYearToDelete(null);
            setMessage({
              type: "success",
              text: `O ano de ${deleted} e todos os seus lançamentos associados foram excluídos com sucesso.`,
            });
            onYearsChanged?.();
          }}
        />
      )}

      {/* Modal de Confirmação de Anos Intermediários */}
      {intermediateData && (
        <ConfirmIntermediateYearsModal
          isOpen={true}
          targetYear={intermediateData.targetYear}
          missingYears={intermediateData.missingYears}
          loading={confirmingIntermediate}
          onConfirm={() => handleAddYear(true, intermediateData.targetYear)}
          onCancel={() => setIntermediateData(null)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";

interface PendingBill {
  id: string;
  description: string;
  amount: number;
  date: string;
  isPaid: boolean;
  category?: { name: string; color: string } | null;
}

interface CalendarAgendaProps {
  calendarToken: string;
  onRefreshData: () => void;
}

export default function CalendarAgendaView({
  calendarToken,
  onRefreshData,
}: CalendarAgendaProps) {
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const loadBills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setBills(data.upcomingBills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    setTogglingId(id);
    try {
      await fetch(`/api/transactions/${id}/toggle-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !currentPaid }),
      });
      loadBills();
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const icalFeedUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/calendar/feed/${calendarToken}/calendar.ics`
    : `/api/calendar/feed/${calendarToken}/calendar.ics`;

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(icalFeedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Agenda Financeira & Sincronização iCal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Digitalização da aba Lembretes_Agenda com feed para Google Calendar e Apple Calendar.
        </p>
      </div>

      {/* 2. Card de Integração iCal / Google Calendar */}
      <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-800/50 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Assinar Feed de Calendário (Google / Apple / Outlook)
              </h2>
              <p className="text-xs text-indigo-200">
                Sincronize automaticamente os vencimentos de contas pendentes diretamente na sua agenda.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 hidden sm:inline-block">
            Padrão RFC 5545 (.ics)
          </span>
        </div>

        {/* Link para Cópia */}
        <div className="bg-black/30 rounded-xl p-3 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <code className="text-xs text-indigo-200 font-mono break-all select-all">
            {icalFeedUrl}
          </code>
          <button
            onClick={copyFeedUrl}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copiar Link do Feed</span>
              </>
            )}
          </button>
        </div>

        {/* Instruções de sincronização */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-indigo-200/80">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="font-bold text-white block mb-1">Como adicionar no Google Agenda:</span>
            <p>1. Abra o Google Calendar no navegador.</p>
            <p>2. Em &quot;Outras agendas&quot;, clique em &quot;+&quot; e selecione &quot;Do URL&quot;.</p>
            <p>3. Cole a URL copiada e confirme.</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="font-bold text-white block mb-1">Como adicionar no iPhone / Apple:</span>
            <p>1. Vá em Ajustes &gt; Calendário &gt; Contas.</p>
            <p>2. Toque em &quot;Adicionar Conta&quot; &gt; &quot;Outra&quot; &gt; &quot;Assinar Calendário&quot;.</p>
            <p>3. Cole o link para receber os alertas 1 dia antes.</p>
          </div>
        </div>
      </div>

      {/* 3. Lista de Compromissos e Vencimentos Pendentes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Próximos Compromissos Financeiros
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {bills.length} contas a vencer
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Carregando agenda...
            </div>
          ) : bills.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              🎉 Nenhuma conta pendente para os próximos dias!
            </div>
          ) : (
            bills.map((bill) => (
              <div
                key={bill.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTogglePaid(bill.id, bill.isPaid)}
                    disabled={togglingId === bill.id}
                    className="text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    {bill.isPaid ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {bill.description}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Data: {bill.date}</span>
                      {bill.category && <span>• {bill.category.name}</span>}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 block">
                    {formatBRL(bill.amount)}
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    {bill.isPaid ? "Pago" : "Pendente"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

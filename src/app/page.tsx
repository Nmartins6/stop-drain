"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import DashboardView from "@/components/DashboardView";
import CashFlowView from "@/components/CashFlowView";
import RecurringView from "@/components/RecurringView";
import SavingsView from "@/components/SavingsView";
import CalendarAgendaView from "@/components/CalendarAgendaView";
import SettingsView from "@/components/SettingsView";
import QuickAddModal from "@/components/QuickAddModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import AuthView from "@/components/AuthView";
import {
  DailyCashFlowRow,
  MonthSummary,
  DashboardKPIs,
  CategoryData,
  TransactionItem,
} from "@/lib/types";
import { Plus } from "lucide-react";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [workspace, setWorkspace] = useState<{ id: string; name: string; calendarToken: string } | null>(null);

  const [currentTab, setCurrentTab] = useState("dashboard"); // "dashboard" | "cashflow" | "recurring" | "savings" | "calendar"

  // Estado do Livro Caixa
  const [cashFlowYear, setCashFlowYear] = useState(2026);
  const [cashFlowMonth, setCashFlowMonth] = useState(10);
  const [rows, setRows] = useState<DailyCashFlowRow[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);

  // Estado do Dashboard
  const [dashboardData, setDashboardData] = useState<DashboardKPIs | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Categorias
  const [categories, setCategories] = useState<CategoryData[]>([]);

  // Modais
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string | undefined>(undefined);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // 1. Verificar Sessão
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setWorkspace(data.workspace);
      } else {
        setCurrentUser(null);
        setWorkspace(null);
      }
    } catch {
      setCurrentUser(null);
      setWorkspace(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["dashboard", "cashflow", "recurring", "savings", "calendar", "settings"].includes(tabParam)
      ) {
        setCurrentTab(tabParam);
      }
    }
  }, [checkAuth]);

  // 2. Carregar Categorias
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 3. Carregar Livro Caixa
  const loadCashFlow = useCallback(async (y: number, m: number) => {
    setCashFlowLoading(true);
    try {
      const res = await fetch(`/api/cashflow?year=${y}&month=${m}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCashFlowLoading(false);
    }
  }, []);

  // 4. Carregar Dashboard
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Recarregar tudo quando o usuário está autenticado
  const refreshAllData = useCallback(() => {
    loadCategories();
    loadCashFlow(cashFlowYear, cashFlowMonth);
    loadDashboard();
  }, [loadCategories, loadCashFlow, loadDashboard, cashFlowYear, cashFlowMonth]);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [currentUser, refreshAllData]);

  // Recarregar fluxo de caixa ao mudar ano/mês
  useEffect(() => {
    if (currentUser) {
      loadCashFlow(cashFlowYear, cashFlowMonth);
    }
  }, [currentUser, cashFlowYear, cashFlowMonth, loadCashFlow]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setWorkspace(null);
  };

  const handleOpenQuickAddForDay = (dateStr: string) => {
    setQuickAddDate(dateStr);
    setIsQuickAddOpen(true);
  };

  const handleCloseQuickAdd = () => {
    setIsQuickAddOpen(false);
    setQuickAddDate(undefined);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onSuccess={checkAuth} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Barra de Navegação Superior */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        user={currentUser}
        workspaceName={workspace?.name || "Finanças"}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <main className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pt-6">
        {currentTab === "dashboard" && (
          <DashboardView
            data={dashboardData}
            loading={dashboardLoading}
            onRefresh={refreshAllData}
            onNavigateToCashFlow={() => setCurrentTab("cashflow")}
          />
        )}

        {currentTab === "cashflow" && (
          <CashFlowView
            year={cashFlowYear}
            month={cashFlowMonth}
            setYear={setCashFlowYear}
            setMonth={setCashFlowMonth}
            rows={rows}
            summary={summary}
            loading={cashFlowLoading}
            onRefresh={refreshAllData}
            onOpenQuickAddForDay={handleOpenQuickAddForDay}
            onSelectTransaction={(tx) => setSelectedTx(tx)}
            categories={categories}
          />
        )}

        {currentTab === "recurring" && (
          <RecurringView
            categories={categories}
            onDataChanged={refreshAllData}
          />
        )}

        {currentTab === "savings" && <SavingsView />}

        {currentTab === "calendar" && (
          <CalendarAgendaView
            calendarToken={workspace?.calendarToken || ""}
            onRefreshData={refreshAllData}
          />
        )}

        {currentTab === "settings" && (
          <SettingsView
            user={currentUser}
            workspace={workspace}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onYearsChanged={refreshAllData}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) Mobile & Desktop */}
      <button
        onClick={() => setIsQuickAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Novo Lançamento Rápido"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      {/* Modal Quick Add */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={handleCloseQuickAdd}
        onSuccess={refreshAllData}
        categories={categories}
        defaultDate={quickAddDate}
      />

      {/* Modal de Edição de Transação */}
      <EditTransactionModal
        transaction={selectedTx}
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        onSuccess={refreshAllData}
        categories={categories}
      />
    </div>
  );
}

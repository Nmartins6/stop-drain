"use client";

import React, { useState } from "react";
import { Wallet, Lock, Mail, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface AuthViewProps {
  onSuccess: () => void;
}

export default function AuthView({ onSuccess }: AuthViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fillDemo = () => {
    setIsRegister(false);
    setEmail("demo@financas.app");
    setPassword("demo123");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro de autenticação");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Falha na conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Finanças
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Livro Caixa Diário com Saldo Continuado (Roll-Forward)
          </p>
        </div>

        {/* Tabs: Entrar vs Criar Conta */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              !isRegister
                ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Entrar na Conta
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
              setEmail("");
              setPassword("");
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              isRegister
                ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Demo banner para login rápido */}
        {!isRegister && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Acesso Rápido Demo:
              </span>
              <button
                type="button"
                onClick={fillDemo}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
              >
                Preencher Dados
              </button>
            </div>
            <p className="text-[11px] opacity-90">
              Conta com dados de Setembro e Outubro/2026 já cadastrados para teste imediato.
            </p>
          </div>
        )}

        {isRegister && (
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl text-xs text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              Ao criar sua conta, um <strong>Workspace exclusivo</strong> será gerado automaticamente com categorias padrão pré-configuradas.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Seu Nome Completo *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Email *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Senha *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <span>{isRegister ? "Criar Minha Conta" : "Entrar no Sistema"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

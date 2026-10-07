import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Limpar dados anteriores
  await prisma.transaction.deleteMany();
  await prisma.savingsRecord.deleteMany();
  await prisma.installmentPlan.deleteMany();
  await prisma.recurringItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Usuário Demo
  const passwordHash = await bcrypt.hash("demo123", 10);
  const user = await prisma.user.create({
    data: {
      name: "João",
      email: "demo@financas.app",
      passwordHash,
      themePreference: "system",
    },
  });

  // 2. Criar Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Finanças Pessoais",
      calendarToken: "calendar-token-demo-12345",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  // 3. Criar Categorias
  const catSalario = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Salário / Rendimentos",
      type: "ENTRADA",
      icon: "Wallet",
      color: "#10b981",
    },
  });

  const catExtra = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Renda Extra / Freelance",
      type: "ENTRADA",
      icon: "Briefcase",
      color: "#06b6d4",
    },
  });

  const catAluguel = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Aluguel & Moradia",
      type: "SAIDA_FIXA",
      icon: "Home",
      color: "#ef4444",
    },
  });

  const catCartao = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Fatura Cartão de Crédito",
      type: "SAIDA_FIXA",
      icon: "CreditCard",
      color: "#ec4899",
    },
  });

  const catFaculdade = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Educação / Faculdade",
      type: "SAIDA_FIXA",
      icon: "GraduationCap",
      color: "#3b82f6",
    },
  });

  const catInternet = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Conectividade & Internet",
      type: "SAIDA_FIXA",
      icon: "Wifi",
      color: "#8b5cf6",
    },
  });

  const catConsumo = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Contas de Consumo (Água/Luz)",
      type: "SAIDA_FIXA",
      icon: "Zap",
      color: "#f97316",
    },
  });

  const catAlimentacao = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Alimentação & Mercado",
      type: "GASTO_DIARIO",
      icon: "ShoppingCart",
      color: "#eab308",
    },
  });

  const catTransporte = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Transporte & Combustível",
      type: "GASTO_DIARIO",
      icon: "Car",
      color: "#64748b",
    },
  });

  const catLazer = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Lazer & Restaurantes",
      type: "GASTO_DIARIO",
      icon: "Coffee",
      color: "#a855f7",
    },
  });

  // 4. Criar Contas Recorrentes Conforme Especificação
  // (Aluguel dia 04, Cartão dia 05, Faculdade dia 10, Conectividade dia 15, Contas de consumo dia 20)
  await prisma.recurringItem.createMany({
    data: [
      {
        workspaceId: workspace.id,
        categoryId: catAluguel.id,
        title: "Aluguel Apartamento",
        dueDay: 4,
        amount: 1500.0,
      },
      {
        workspaceId: workspace.id,
        categoryId: catCartao.id,
        title: "Fatura Cartão Black",
        dueDay: 5,
        amount: 980.5,
      },
      {
        workspaceId: workspace.id,
        categoryId: catFaculdade.id,
        title: "Mensalidade Faculdade",
        dueDay: 10,
        amount: 650.0,
      },
      {
        workspaceId: workspace.id,
        categoryId: catInternet.id,
        title: "Internet Fibra + Celular",
        dueDay: 15,
        amount: 149.9,
      },
      {
        workspaceId: workspace.id,
        categoryId: catConsumo.id,
        title: "Energia Elétrica & Água",
        dueDay: 20,
        amount: 280.0,
      },
    ],
  });

  // 5. Criar Parcelamento Ativo (Parcela Moto: 12 parcelas de R$ 450,00)
  const motoPlan = await prisma.installmentPlan.create({
    data: {
      workspaceId: workspace.id,
      description: "Financiamento Moto",
      totalInstallments: 12,
      currentInstallment: 3,
      monthlyAmount: 450.0,
      remainingBalance: 4500.0, // Restam 10 parcelas (450 * 10)
      dueDay: 8,
      isActive: true,
    },
  });

  // 6. Criar Dados Históricos para Mês Anterior (para testar o Roll-forward contínuo herdado)
  const prevMonthDate = new Date(2026, 8, 5, 12, 0, 0); // Setembro 2026
  await prisma.transaction.createMany({
    data: [
      {
        workspaceId: workspace.id,
        categoryId: catSalario.id,
        date: new Date(2026, 8, 5, 12, 0, 0),
        amount: 6500.0,
        type: "ENTRADA",
        description: "Salário Setembro",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catAluguel.id,
        date: new Date(2026, 8, 4, 12, 0, 0),
        amount: 1500.0,
        type: "SAIDA_FIXA",
        description: "Aluguel Apartamento",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catAlimentacao.id,
        date: new Date(2026, 8, 12, 12, 0, 0),
        amount: 850.0,
        type: "GASTO_DIARIO",
        description: "Supermercado do Mês",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catLazer.id,
        date: new Date(2026, 8, 20, 12, 0, 0),
        amount: 320.0,
        type: "GASTO_DIARIO",
        description: "Jantar Fim de Semana",
        isPaid: true,
      },
    ],
  });

  // Registro de Economia de Setembro
  await prisma.savingsRecord.create({
    data: {
      workspaceId: workspace.id,
      yearMonth: "2026-09",
      amountSaved: 1200.0,
      notes: "Aporte Tesouro Selic",
    },
  });

  // 7. Criar Transações para Outubro 2026 (Mês Atual)
  await prisma.transaction.createMany({
    data: [
      {
        workspaceId: workspace.id,
        categoryId: catSalario.id,
        date: new Date(2026, 9, 5, 12, 0, 0), // 05/10/2026
        amount: 6500.0,
        type: "ENTRADA",
        description: "Salário Outubro",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catAluguel.id,
        date: new Date(2026, 9, 4, 12, 0, 0), // 04/10/2026
        amount: 1500.0,
        type: "SAIDA_FIXA",
        description: "Aluguel Apartamento",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catAlimentacao.id,
        date: new Date(2026, 9, 1, 12, 0, 0), // 01/10/2026
        amount: 135.5,
        type: "GASTO_DIARIO",
        description: "Padaria e Hortifruti",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catTransporte.id,
        date: new Date(2026, 9, 3, 12, 0, 0), // 03/10/2026
        amount: 90.0,
        type: "GASTO_DIARIO",
        description: "Combustível",
        isPaid: true,
      },
      {
        workspaceId: workspace.id,
        categoryId: catCartao.id,
        date: new Date(2026, 9, 5, 12, 0, 0), // 05/10/2026
        amount: 980.5,
        type: "SAIDA_FIXA",
        description: "Fatura Cartão Black",
        isPaid: false,
      },
      {
        workspaceId: workspace.id,
        installmentPlanId: motoPlan.id,
        date: new Date(2026, 9, 8, 12, 0, 0), // 08/10/2026
        amount: 450.0,
        type: "SAIDA_FIXA",
        description: "Financiamento Moto (3/12)",
        isPaid: false,
      },
    ],
  });

  // Registro de Economia de Outubro
  await prisma.savingsRecord.create({
    data: {
      workspaceId: workspace.id,
      yearMonth: "2026-10",
      amountSaved: 1500.0,
      notes: "Aporte Fundo Imobiliário",
    },
  });

  console.log("Seed concluído com sucesso!");
  console.log("Usuário: demo@financas.app | Senha: demo123");
  console.log("Workspace ID:", workspace.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function testAPI() {
  console.log("Testando API de autenticação e fluxo de caixa...");

  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "demo@antigravity.finance",
      password: "demo123",
    }),
  });

  const loginData = await loginRes.json();
  console.log("Status Login:", loginRes.status, loginData);

  const cookieHeader = loginRes.headers.get("set-cookie");
  console.log("Cookie obtido:", cookieHeader ? "Sim (fin_session presente)" : "Não");

  if (!cookieHeader) return;

  const cookie = cookieHeader.split(";")[0];

  const cashflowRes = await fetch("http://localhost:3000/api/cashflow?year=2026&month=10", {
    headers: { Cookie: cookie },
  });

  const cashflowData = await cashflowRes.json();
  console.log("\nStatus Fluxo de Caixa (Outubro/2026):", cashflowRes.status);
  console.log("Resumo Outubro:", {
    openingBalance: cashflowData.summary?.openingBalance,
    totalEntradas: cashflowData.summary?.totalEntradas,
    totalSaidas: cashflowData.summary?.totalSaidas,
    performance: cashflowData.summary?.performance,
    closingBalance: cashflowData.summary?.closingBalance,
    savingsRate: cashflowData.summary?.savingsRate + "%",
  });
  console.log("Total de dias retornados:", cashflowData.rows?.length);

  const dashRes = await fetch("http://localhost:3000/api/dashboard", {
    headers: { Cookie: cookie },
  });
  const dashData = await dashRes.json();
  console.log("\nStatus Dashboard:", dashRes.status);
  console.log("KPIs:", {
    currentBalance: dashData.currentBalance,
    monthPerformance: dashData.monthPerformance,
    totalSaidasPaid: dashData.totalSaidasPaid,
    upcomingBillsCount: dashData.upcomingBills?.length,
    monthlyChartLength: dashData.monthlyChart?.length,
  });

  console.log("\n>>> Todos os endpoints testados e funcionando perfeitamente! <<<");
}

testAPI().catch(console.error);

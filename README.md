# 💸 Finanças — Livro Caixa Diário com Saldo Continuado (Roll-Forward)

Aplicação web completa para gestão financeira pessoal com fluxo de caixa diário contínuo (*roll-forward continuous balance*), gestão de despesas fixas recorrentes, acompanhamento de compras parceladas com amortização progressiva do saldo devedor, módulo de economia/aportes, feed de sincronização iCal para Google Calendar e Apple Calendar, e central de gerenciamento de exercícios fiscais.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js 20+ LTS**
- **npm** ou **yarn** / **pnpm**

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone git@github.com:Nmartins6/stop-drain.git
cd financas
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 3. Configurar o Banco de Dados (SQLite Local)
Execute as migrações e o seed inicial:
```bash
npx prisma db push
npx prisma db seed
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O servidor estará acessível em: **[http://localhost:3000](http://localhost:3000)**

Para compilar e rodar a versão de produção:
```bash
npm run build
npm start
```

---

## 🔑 Credenciais Demo (Seed Inicial)
- **E-mail:** `demo@financas.app`
- **Senha:** `demo123`

*(Você também pode criar uma conta nova e exclusiva através da tela de cadastro)*

---

## 🧠 Arquitetura e Regras de Negócio

### 1. Livro Caixa Diário com Saldo Continuado (*Roll-Forward Continuous Balance*)
$$\text{Saldo}(d) = \text{Saldo}(d-1) + \text{Entrada}(d) - \text{SaídaFixa}(d) - \text{Diário}(d)$$
- O saldo do **Dia 1** de qualquer mês herda automaticamente o saldo de fechamento do último dia do mês anterior.
- Suporte nativo à navegação dinâmica por anos e meses (Janeiro a Dezembro).
- Formatação condicional: **Verde** para saldo acumulado positivo e **Vermelho** para saldo negativo.
- Rodapé consolidado com: **ENTRADAS**, **SAÍDAS FIXAS**, **DIÁRIO**, **SAÍDA TOTAL** e **PERFORMANCE** ($\text{ENTRADAS} - \text{SAÍDA TOTAL}$).

### 2. Criação Sequencial de Anos & Central de Configurações
- **Base Cronológica:** Novos workspaces iniciam estritamente no ano vigente.
- **Continuidade Estrita:** Prevenção de saltos temporais (ex: tentar criar o ano de 2028 sem antes possuir 2027 solicita confirmação para criar automaticamente os anos intermediários).
- **Exclusão Segura Centralizada:** Painel de controle na aba de Configurações para exclusão definitiva de exercícios fiscais, com modal anti-erros que exige confirmação digitada e recalcula em cadeia o saldo contínuo dos anos subsequentes.

### 3. Gestão de Contas Recorrentes, Salários e Parcelamentos
- **Contas Fixas & Salários Recorrentes:** Projeção padrão para 36 meses com criação automática dos anos subsequentes necessários no sistema, permitindo também personalização para 6, 12 ou 24 meses.
- **Parcelamentos & Financiamentos:**
  - Lançamento inteligente com cálculo bidirecional (Valor da Parcela $\leftrightarrow$ Valor Total da Compra).
  - Acompanhamento do progresso das parcelas (ex: $3/12$) e barra visual de evolução.
  - Atualização progressiva do **Saldo Devedor Restante** com amortização automática ao dar baixa de pagamento (`isPaid = true`).
  - Projeção de faturas vincendas de cartão de crédito.

### 4. Módulo de Economia e Aportes
- Entrada mensal de valores investidos/reservados.
- Cálculo automático da **Taxa de Poupança (%)**:
  $$\text{Taxa de Economia} = \frac{\text{Economia}}{\text{Entradas}} \times 100\%$$
- Tabela anual comparativa mês a mês e gráfico de **Evolução Patrimonial Acumulada** com Recharts.
- Acessível diretamente via URL: `/?tab=savings`.

### 5. Agenda Financeira & Feed iCal / RFC 5545
- Endpoint: `GET /api/calendar/feed/[calendarToken]/calendar.ics`
- Compatível com Google Calendar, Apple Calendar e Outlook com alertas configurados para 1 dia antes do vencimento.

---

## 🛠️ Stack Tecnológica
- **Framework:** Next.js 14+ (App Router, Server Route Handlers)
- **Linguagem:** TypeScript com tipagem estrita
- **Estilização:** Tailwind CSS com suporte nativo a Dark/Light Mode
- **Ícones:** Lucide React
- **Banco de Dados & ORM:** SQLite local via Prisma ORM (pronto para migração para PostgreSQL)
- **Gráficos:** Recharts
- **Autenticação:** Sessão JWT em Cookies HTTP-Only com hash bcryptjs

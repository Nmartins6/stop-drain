import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Chave JWT lida de variável de ambiente (com fallback seguro apenas para desenvolvimento local)
const JWT_SECRET = process.env.JWT_SECRET || "default-dev-secret-financas-2026";
const COOKIE_NAME = "fin_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  workspaceId: string;
}

// Assinatura JWT simples e robusta com crypto nativo do Node
export function signToken(payload: SessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 dias
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getOrCreateDefaultWorkspace(userId: string): Promise<string> {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
  });
  if (existing) return existing.workspaceId;

  // Criar workspace padrão
  const workspace = await prisma.workspace.create({
    data: {
      name: "Finanças Pessoais",
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  // Criar categorias padrão para este workspace
  const defaultCategories = [
    { name: "Salário / Rendimentos", type: "ENTRADA", icon: "wallet", color: "#10b981" },
    { name: "Freelance / Extra", type: "ENTRADA", icon: "briefcase", color: "#06b6d4" },
    { name: "Aluguel / Habitação", type: "SAIDA_FIXA", icon: "home", color: "#ef4444" },
    { name: "Energia / Água / Gás", type: "SAIDA_FIXA", icon: "zap", color: "#f97316" },
    { name: "Internet / Celular", type: "SAIDA_FIXA", icon: "wifi", color: "#8b5cf6" },
    { name: "Cartão de Crédito", type: "SAIDA_FIXA", icon: "credit-card", color: "#ec4899" },
    { name: "Supermercado / Alimentação", type: "GASTO_DIARIO", icon: "shopping-cart", color: "#eab308" },
    { name: "Transporte / Combustível", type: "GASTO_DIARIO", icon: "car", color: "#3b82f6" },
    { name: "Lazer / Restaurantes", type: "GASTO_DIARIO", icon: "coffee", color: "#a855f7" },
    { name: "Saúde / Farmácia", type: "GASTO_DIARIO", icon: "heart-pulse", color: "#14b8a6" },
  ];

  await prisma.category.createMany({
    data: defaultCategories.map((c) => ({
      workspaceId: workspace.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
    })),
  });

  return workspace.id;
}

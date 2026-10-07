import { Transaction, Category } from "@prisma/client";
import { format } from "date-fns";

type TransactionWithCategory = Transaction & {
  category?: Category | null;
};

/**
 * Converte contas a pagar em formato padrão RFC 5545 iCalendar (.ics)
 */
export function generateICalFeed(
  workspaceName: string,
  transactions: TransactionWithCategory[]
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Financas//Financial Calendar 1.0//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Vencimentos - ${workspaceName}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
  ];

  const nowStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const dateFormatted = format(txDate, "yyyyMMdd");
    const formattedAmount = tx.amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const categoryName = tx.category ? ` [${tx.category.name}]` : "";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:tx-${tx.id}@financas.app`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateFormatted}`);
    lines.push(`SUMMARY:💸 Vencimento: ${tx.description} (${formattedAmount})`);
    lines.push(
      `DESCRIPTION:Conta a pagar: ${tx.description}\\nValor: ${formattedAmount}${categoryName}\\nStatus: Pendente`
    );
    lines.push("STATUS:CONFIRMED");
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Lembrete de vencimento: ${tx.description}`);
    lines.push("TRIGGER:-P1D"); // Notificação 1 dia antes
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

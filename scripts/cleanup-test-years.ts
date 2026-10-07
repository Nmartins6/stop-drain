import { prisma } from "../src/lib/prisma";
import { deleteWorkspaceYear, getWorkspaceYears } from "../src/lib/engine";

async function main() {
  const ws = await prisma.workspace.findFirst();
  if (!ws) return;
  for (let y = 2027; y <= 2034; y++) {
    await deleteWorkspaceYear(ws.id, y);
  }
  const years = await getWorkspaceYears(ws.id);
  console.log("Anos finais no banco após limpeza:", years);
}

main().finally(() => prisma.$disconnect());

import { prisma } from "../db/client.js";
import { WpgArticle } from "@thor/shared";

/**
 * WPG-10: Retention check for WPG zaak data
 * Art.8 cases:
 * - After 1 year: mark as "afgeschermd" (shielded) - limited search only
 * - After 5 years from retentionStartDate: mark for destruction
 */
export async function checkRetention(): Promise<{
  afgeschermd: number;
  markedForDestruction: number;
  actions: string[];
}> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const actions: string[] = [];
  let afgeschermdCount = 0;
  let destructionCount = 0;

  // Step 1: Find Art.8 cases older than 1 year that are not yet afgeschermd
  const toAfscherm = await prisma.wpgZaak.findMany({
    where: {
      wpgArtikel: WpgArticle.ARTICLE_8,
      createdAt: { lt: oneYearAgo },
      isAfgeschermd: false,
    },
  });

  for (const zaak of toAfscherm) {
    await prisma.wpgZaak.update({
      where: { id: zaak.id },
      data: {
        isAfgeschermd: true,
        retentionStartDate: now,
      },
    });

    await prisma.wpgAuditLog.create({
      data: {
        userId: "SYSTEM",
        userRole: "SYSTEM",
        action: "RETENTION",
        entity: "WpgZaak",
        entityId: zaak.id,
        wpgArtikel: WpgArticle.ARTICLE_8,
        details: `Zaak afgeschermd na 1 jaar (Art. 8 WPG). Zaak aangemaakt: ${zaak.createdAt.toISOString()}`,
      },
    });

    afgeschermdCount++;
    actions.push(`Zaak ${zaak.zaakNummer} afgeschermd`);
  }

  // Step 2: Find afgeschermde cases with retentionStartDate > 5 years ago
  const toDestroy = await prisma.wpgZaak.findMany({
    where: {
      wpgArtikel: WpgArticle.ARTICLE_8,
      isAfgeschermd: true,
      retentionStartDate: { lt: fiveYearsAgo },
      vernietigDatum: null,
    },
  });

  for (const zaak of toDestroy) {
    await prisma.wpgZaak.update({
      where: { id: zaak.id },
      data: {
        vernietigDatum: now,
      },
    });

    await prisma.wpgAuditLog.create({
      data: {
        userId: "SYSTEM",
        userRole: "SYSTEM",
        action: "RETENTION",
        entity: "WpgZaak",
        entityId: zaak.id,
        wpgArtikel: WpgArticle.ARTICLE_8,
        details: `Zaak gemarkeerd voor vernietiging na 5 jaar retentie (Art. 8 WPG). Retentie start: ${zaak.retentionStartDate.toISOString()}`,
      },
    });

    destructionCount++;
    actions.push(`Zaak ${zaak.zaakNummer} gemarkeerd voor vernietiging`);
  }

  return {
    afgeschermd: afgeschermdCount,
    markedForDestruction: destructionCount,
    actions,
  };
}

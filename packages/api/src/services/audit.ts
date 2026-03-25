import { prisma } from "../db/client.js";
import { LegalRegime, WpgArticle } from "@thor/shared";

/**
 * WPG-5: Comprehensive audit logging for all data access
 * Logs: who, when, what action, which data, under which role
 */
export async function logAccess(params: {
  userId: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  legalRegime: LegalRegime;
  wpgArtikel?: WpgArticle;
  details: string;
  ipAddress?: string;
}) {
  if (params.legalRegime === LegalRegime.WPG) {
    await prisma.wpgAuditLog.create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        wpgArtikel: params.wpgArtikel,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  } else {
    await prisma.avgAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  }
}

/**
 * WPG-4: Log a data provision (verstrekking) to external party
 */
export async function logVerstrekking(params: {
  zaakId: string;
  ontvangerOrganisatie: string;
  ontvangerPersoon?: string;
  grondslag: string;
  omschrijving: string;
  gegevensOmschrijving: string;
}) {
  return prisma.wpgVerstrekking.create({ data: params });
}

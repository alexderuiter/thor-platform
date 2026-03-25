import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { logAccess } from "../services/audit.js";
import { getLegalRegime } from "../middleware/auth.js";
import {
  LegalRegime,
  RegistrationType,
  ZaakStatus,
  HandhavingsThema,
  BetrokkeneRol,
  WpgArticle,
  UserRole,
} from "@thor/shared";

function getIp(req: Request): string | undefined {
  const ip = req.ip;
  return typeof ip === "string" ? ip : undefined;
}

const router = Router();

// --- Validation schemas ---
const createZaakSchema = z.object({
  registratieType: z.nativeEnum(RegistrationType),
  thema: z.nativeEnum(HandhavingsThema),
  omschrijving: z.string().optional(),
  werkopdrachtId: z.string().uuid().optional(),
  locatie: z.object({
    straatnaam: z.string().min(1),
    huisnummer: z.string().optional(),
    postcode: z.string().optional(),
    woonplaats: z.string().default("Amsterdam"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    toelichting: z.string().optional(),
  }),
  betrokkenen: z.array(z.object({
    rol: z.nativeEnum(BetrokkeneRol),
    bsn: z.string().optional(),
    voornaam: z.string().optional(),
    tussenvoegsel: z.string().optional(),
    achternaam: z.string().optional(),
    geboortedatum: z.string().optional(),
    kenteken: z.string().optional(),
    kvkNummer: z.string().optional(),
  })).optional(),
  // WPG-specific fields
  wpgArtikel: z.nativeEnum(WpgArticle).optional(),
  cautieGegeven: z.boolean().optional(),
  rechtBijstand: z.boolean().optional(),
  rechtVertolking: z.boolean().optional(),
});

/**
 * POST /api/zaken - Create a new zaak (case)
 * Automatically routes to AVG or WPG schema based on registration type
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const data = createZaakSchema.parse(req.body);
    const regime = getLegalRegime(data.registratieType);
    const user = req.user!;

    // Create location
    const locatie = await prisma.locatie.create({ data: data.locatie });

    if (regime === LegalRegime.WPG) {
      // WPG zaak - strafrechtelijk
      const wpgArtikel = data.wpgArtikel || WpgArticle.ARTICLE_8;

      const zaak = await prisma.wpgZaak.create({
        data: {
          registratieType: data.registratieType,
          wpgArtikel,
          thema: data.thema,
          omschrijving: data.omschrijving,
          locatieId: locatie.id,
          medewerkerId: user.id,
          werkopdrachtId: data.werkopdrachtId,
          cautieGegeven: data.cautieGegeven ?? false,
          rechtBijstand: data.rechtBijstand ?? false,
          rechtVertolking: data.rechtVertolking ?? false,
          betrokkenen: {
            create: (data.betrokkenen || []).map((b) => ({
              rol: b.rol,
              voornaam: b.voornaam,
              tussenvoegsel: b.tussenvoegsel,
              achternaam: b.achternaam,
              geboortedatum: b.geboortedatum ? new Date(b.geboortedatum) : undefined,
              bsn: b.bsn,
              kenteken: b.kenteken,
            })),
          },
        },
        include: { betrokkenen: true, locatie: true },
      });

      // WPG-5: Audit log
      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "CREATE",
        entity: "WpgZaak",
        entityId: zaak.id,
        legalRegime: LegalRegime.WPG,
        wpgArtikel,
        details: `Nieuwe WPG-zaak aangemaakt: ${data.registratieType}`,
        ipAddress: getIp(req),
      });

      res.status(201).json({ ...zaak, legalRegime: LegalRegime.WPG });
    } else {
      // AVG zaak - bestuursrechtelijk
      const zaak = await prisma.avgZaak.create({
        data: {
          registratieType: data.registratieType,
          thema: data.thema,
          omschrijving: data.omschrijving,
          locatieId: locatie.id,
          medewerkerId: user.id,
          werkopdrachtId: data.werkopdrachtId,
          betrokkenen: {
            create: (data.betrokkenen || []).map((b) => ({
              rol: b.rol,
              voornaam: b.voornaam,
              tussenvoegsel: b.tussenvoegsel,
              achternaam: b.achternaam,
              geboortedatum: b.geboortedatum ? new Date(b.geboortedatum) : undefined,
              bsn: b.bsn,
              kenteken: b.kenteken,
              kvkNummer: b.kvkNummer,
            })),
          },
        },
        include: { betrokkenen: true, locatie: true },
      });

      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "CREATE",
        entity: "AvgZaak",
        entityId: zaak.id,
        legalRegime: LegalRegime.AVG,
        details: `Nieuwe AVG-zaak aangemaakt: ${data.registratieType}`,
        ipAddress: getIp(req),
      });

      res.status(201).json({ ...zaak, legalRegime: LegalRegime.AVG });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validatiefout", details: error.errors });
      return;
    }
    console.error("Error creating zaak:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * GET /api/zaken - List cases based on user's active regime
 * WPG-10: Art.8 cases older than 1 year are "afgeschermd" (limited search only)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const regime = (String(req.query.regime || "") as LegalRegime) || user.activeRegime || LegalRegime.AVG;
    const page = parseInt(String(req.query.page || "1")) || 1;
    const limit = Math.min(parseInt(String(req.query.limit || "25")) || 25, 100);
    const skip = (page - 1) * limit;

    if (regime === LegalRegime.WPG) {
      const [zaken, total] = await Promise.all([
        prisma.wpgZaak.findMany({
          where: { isAfgeschermd: false },
          include: { locatie: true, betrokkenen: true },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.wpgZaak.count({ where: { isAfgeschermd: false } }),
      ]);

      // Log each access (WPG-5)
      for (const zaak of zaken) {
        await logAccess({
          userId: user.id,
          userRole: user.role,
          action: "READ",
          entity: "WpgZaak",
          entityId: zaak.id,
          legalRegime: LegalRegime.WPG,
          wpgArtikel: zaak.wpgArtikel as WpgArticle,
          details: "Zaak geopend vanuit lijst",
          ipAddress: getIp(req),
        });
      }

      res.json({
        results: zaken.map((z) => ({ ...z, legalRegime: LegalRegime.WPG })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } else {
      const [zaken, total] = await Promise.all([
        prisma.avgZaak.findMany({
          include: { locatie: true, betrokkenen: true },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.avgZaak.count(),
      ]);

      res.json({
        results: zaken.map((z) => ({ ...z, legalRegime: LegalRegime.AVG })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }
  } catch (error) {
    console.error("Error listing zaken:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * GET /api/zaken/:id - Get a single case
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = req.user!;

    // Try AVG first, then WPG
    const avgZaak = await prisma.avgZaak.findUnique({
      where: { id },
      include: {
        locatie: true,
        betrokkenen: true,
        documenten: true,
        notities: true,
        statusWijzigingen: { orderBy: { createdAt: "desc" } },
        medewerker: { select: { id: true, naam: true, role: true } },
      },
    });

    if (avgZaak) {
      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "READ",
        entity: "AvgZaak",
        entityId: id,
        legalRegime: LegalRegime.AVG,
        details: "Zaak detail opgevraagd",
        ipAddress: getIp(req),
      });
      res.json({ ...avgZaak, legalRegime: LegalRegime.AVG });
      return;
    }

    const wpgZaak = await prisma.wpgZaak.findUnique({
      where: { id },
      include: {
        locatie: true,
        betrokkenen: true,
        documenten: true,
        verstrekkingen: true,
        medewerker: { select: { id: true, naam: true, role: true } },
      },
    });

    if (wpgZaak) {
      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "READ",
        entity: "WpgZaak",
        entityId: id,
        legalRegime: LegalRegime.WPG,
        wpgArtikel: wpgZaak.wpgArtikel as WpgArticle,
        details: "WPG-zaak detail opgevraagd",
        ipAddress: getIp(req),
      });
      res.json({ ...wpgZaak, legalRegime: LegalRegime.WPG });
      return;
    }

    res.status(404).json({ error: "Zaak niet gevonden" });
  } catch (error) {
    console.error("Error getting zaak:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * PATCH /api/zaken/:id/status - Update case status (workflow transition)
 */
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, reden } = req.body as { status: ZaakStatus; reden?: string };
    const user = req.user!;

    // Try AVG
    const avgZaak = await prisma.avgZaak.findUnique({ where: { id } });
    if (avgZaak) {
      const updated = await prisma.avgZaak.update({
        where: { id },
        data: {
          status,
          statusWijzigingen: {
            create: {
              vanStatus: avgZaak.status,
              naarStatus: status,
              reden,
              userId: user.id,
            },
          },
        },
      });

      // If approved by KWC, create export task
      if (status === ZaakStatus.GOEDGEKEURD) {
        await prisma.workflowTaak.create({
          data: {
            zaakId: id,
            zaakType: "AVG",
            type: "EXPORT",
            titel: `Export ${avgZaak.registratieType} ${avgZaak.zaakNummer}`,
            status: "OPEN",
          },
        });
      }

      res.json(updated);
      return;
    }

    // Try WPG
    const wpgZaak = await prisma.wpgZaak.findUnique({ where: { id } });
    if (wpgZaak) {
      const updated = await prisma.wpgZaak.update({
        where: { id },
        data: { status },
      });

      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "UPDATE",
        entity: "WpgZaak",
        entityId: id,
        legalRegime: LegalRegime.WPG,
        wpgArtikel: wpgZaak.wpgArtikel as WpgArticle,
        details: `Status gewijzigd: ${wpgZaak.status} -> ${status}`,
        ipAddress: getIp(req),
      });

      res.json(updated);
      return;
    }

    res.status(404).json({ error: "Zaak niet gevonden" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

export default router;

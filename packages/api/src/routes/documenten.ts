import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../db/client.js";
import { logAccess } from "../services/audit.js";
import { LegalRegime, WpgArticle } from "@thor/shared";

function getIp(req: Request): string | undefined {
  const ip = req.ip;
  return typeof ip === "string" ? ip : undefined;
}

// Configure multer for local file storage
const uploadsDir = path.resolve(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = Router();

/**
 * POST /api/zaken/:zaakId/documenten - Upload a document for a zaak
 */
router.post("/:zaakId/documenten", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const zaakId = String(req.params.zaakId);
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "Geen bestand geupload" });
      return;
    }

    const titel = String(req.body.titel || file.originalname);
    const documentType = String(req.body.documentType || "OVERIG");

    // Determine if zaak is AVG or WPG
    const avgZaak = await prisma.avgZaak.findUnique({ where: { id: zaakId } });

    if (avgZaak) {
      const doc = await prisma.avgDocument.create({
        data: {
          zaakId,
          titel,
          documentType,
          bestandsnaam: file.originalname,
          mimeType: file.mimetype,
          opslag: file.filename,
        },
      });

      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "CREATE",
        entity: "AvgDocument",
        entityId: doc.id,
        legalRegime: LegalRegime.AVG,
        details: `Document geupload: ${titel}`,
        ipAddress: getIp(req),
      });

      res.status(201).json(doc);
      return;
    }

    const wpgZaak = await prisma.wpgZaak.findUnique({ where: { id: zaakId } });

    if (wpgZaak) {
      const doc = await prisma.wpgDocument.create({
        data: {
          zaakId,
          titel,
          documentType,
          bestandsnaam: file.originalname,
          mimeType: file.mimetype,
          opslag: file.filename,
        },
      });

      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "CREATE",
        entity: "WpgDocument",
        entityId: doc.id,
        legalRegime: LegalRegime.WPG,
        wpgArtikel: wpgZaak.wpgArtikel as WpgArticle,
        details: `Document geupload: ${titel}`,
        ipAddress: getIp(req),
      });

      res.status(201).json(doc);
      return;
    }

    res.status(404).json({ error: "Zaak niet gevonden" });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: "Fout bij uploaden document" });
  }
});

/**
 * GET /api/zaken/:zaakId/documenten - List documents for a zaak
 */
router.get("/:zaakId/documenten", async (req: Request, res: Response) => {
  try {
    const zaakId = String(req.params.zaakId);

    // Try AVG first
    const avgZaak = await prisma.avgZaak.findUnique({ where: { id: zaakId } });
    if (avgZaak) {
      const documenten = await prisma.avgDocument.findMany({
        where: { zaakId },
        orderBy: { createdAt: "desc" },
      });
      res.json(documenten);
      return;
    }

    // Try WPG
    const wpgZaak = await prisma.wpgZaak.findUnique({ where: { id: zaakId } });
    if (wpgZaak) {
      const user = req.user!;

      const documenten = await prisma.wpgDocument.findMany({
        where: { zaakId },
        orderBy: { createdAt: "desc" },
      });

      // Log WPG access
      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "READ",
        entity: "WpgDocument",
        entityId: zaakId,
        legalRegime: LegalRegime.WPG,
        wpgArtikel: wpgZaak.wpgArtikel as WpgArticle,
        details: `Documentenlijst opgevraagd voor zaak`,
        ipAddress: getIp(req),
      });

      res.json(documenten);
      return;
    }

    res.status(404).json({ error: "Zaak niet gevonden" });
  } catch (error) {
    console.error("Error listing documents:", error);
    res.status(500).json({ error: "Fout bij ophalen documenten" });
  }
});

/**
 * GET /api/zaken/:zaakId/documenten/:docId/download - Download a document
 */
router.get("/:zaakId/documenten/:docId/download", async (req: Request, res: Response) => {
  try {
    const zaakId = String(req.params.zaakId);
    const docId = String(req.params.docId);

    // Try AVG first
    const avgDoc = await prisma.avgDocument.findFirst({
      where: { id: docId, zaakId },
    });

    if (avgDoc) {
      const filePath = path.resolve(uploadsDir, avgDoc.opslag);
      res.download(filePath, avgDoc.bestandsnaam);
      return;
    }

    // Try WPG
    const wpgDoc = await prisma.wpgDocument.findFirst({
      where: { id: docId, zaakId },
    });

    if (wpgDoc) {
      const user = req.user!;
      const wpgZaak = await prisma.wpgZaak.findUnique({ where: { id: zaakId } });

      await logAccess({
        userId: user.id,
        userRole: user.role,
        action: "READ",
        entity: "WpgDocument",
        entityId: docId,
        legalRegime: LegalRegime.WPG,
        wpgArtikel: wpgZaak?.wpgArtikel as WpgArticle,
        details: `Document gedownload: ${wpgDoc.titel}`,
        ipAddress: getIp(req),
      });

      const filePath = path.resolve(uploadsDir, wpgDoc.opslag);
      res.download(filePath, wpgDoc.bestandsnaam);
      return;
    }

    res.status(404).json({ error: "Document niet gevonden" });
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: "Fout bij downloaden document" });
  }
});

export default router;

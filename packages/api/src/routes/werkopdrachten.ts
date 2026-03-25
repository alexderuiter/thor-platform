import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { UserRole, HandhavingsThema } from "@thor/shared";

const router = Router();

const createWerkopdrachtSchema = z.object({
  titel: z.string().min(1),
  omschrijving: z.string().optional(),
  thema: z.nativeEnum(HandhavingsThema),
  gebiedGeoJson: z.string().optional(),
  startDatum: z.string(),
  eindDatum: z.string().optional(),
});

/**
 * POST /api/werkopdrachten - Create a work order (MA-3)
 */
router.post("/", requireRole(UserRole.AANVOERDER, UserRole.BEHEERDER), async (req: Request, res: Response) => {
  try {
    const data = createWerkopdrachtSchema.parse(req.body);
    const opdracht = await prisma.werkopdracht.create({
      data: {
        ...data,
        startDatum: new Date(data.startDatum),
        eindDatum: data.eindDatum ? new Date(data.eindDatum) : undefined,
      },
    });
    res.status(201).json(opdracht);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validatiefout", details: error.errors });
      return;
    }
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * GET /api/werkopdrachten - List work orders
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const opdrachten = await prisma.werkopdracht.findMany({
      where: { status: "OPEN" },
      orderBy: { startDatum: "desc" },
    });
    res.json(opdrachten);
  } catch (error) {
    res.status(500).json({ error: "Interne serverfout" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { prisma } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { UserRole } from "@thor/shared";

const router = Router();

/**
 * GET /api/workflow/taken - Get workflow tasks for current user
 * KWC gets quality control tasks, Juristen get legal review tasks, etc.
 */
router.get("/taken", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const status = String(req.query.status || "OPEN");

    const taken = await prisma.workflowTaak.findMany({
      where: {
        OR: [
          { toegewezenAan: user.id },
          { toegewezenAan: null, status: "OPEN" },
        ],
        status,
      },
      orderBy: [{ prioriteit: "desc" }, { createdAt: "asc" }],
    });

    res.json(taken);
  } catch (error) {
    console.error("Error fetching taken:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * PATCH /api/workflow/taken/:id - Update task (assign, complete)
 */
router.patch("/taken/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, resultaat } = req.body as { status: string; resultaat?: string };
    const user = req.user!;

    const taak = await prisma.workflowTaak.update({
      where: { id },
      data: {
        status,
        resultaat,
        toegewezenAan: user.id,
      },
    });

    // When KWC approves/rejects, update the zaak status
    if (taak.type === "KWALITEITSCONTROLE" && status === "AFGEROND") {
      const newZaakStatus = resultaat === "GOEDGEKEURD"
        ? "GOEDGEKEURD"
        : "AFGEKEURD";

      if (taak.zaakType === "AVG") {
        await prisma.avgZaak.update({
          where: { id: taak.zaakId },
          data: { status: newZaakStatus },
        });
      } else {
        await prisma.wpgZaak.update({
          where: { id: taak.zaakId },
          data: { status: newZaakStatus },
        });
      }
    }

    res.json(taak);
  } catch (error) {
    console.error("Error updating taak:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

/**
 * GET /api/workflow/werkvoorraad - Get backlog for specific role (TH-8)
 */
router.get("/werkvoorraad", requireRole(UserRole.KWC, UserRole.JURIST, UserRole.BONNEN_ADMIN), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let typeFilter: string[] = [];

    switch (user.role) {
      case UserRole.KWC:
        typeFilter = ["KWALITEITSCONTROLE"];
        break;
      case UserRole.JURIST:
        typeFilter = ["JURIDISCHE_TOETS"];
        break;
      case UserRole.BONNEN_ADMIN:
        typeFilter = ["EXPORT"];
        break;
    }

    const taken = await prisma.workflowTaak.findMany({
      where: {
        type: { in: typeFilter },
        status: { in: ["OPEN", "IN_BEHANDELING"] },
      },
      orderBy: [{ prioriteit: "desc" }, { createdAt: "asc" }],
    });

    res.json(taken);
  } catch (error) {
    console.error("Error fetching werkvoorraad:", error);
    res.status(500).json({ error: "Interne serverfout" });
  }
});

export default router;

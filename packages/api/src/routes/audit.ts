import { Router, Request, Response } from "express";
import { prisma } from "../db/client.js";
import { requireRole } from "../middleware/auth.js";
import { UserRole } from "@thor/shared";

const router = Router();

/**
 * GET /api/admin/audit/wpg - List WPG audit logs (BEHEERDER only)
 * Supports pagination and filters
 */
router.get("/audit/wpg", requireRole(UserRole.BEHEERDER), async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || "1")) || 1;
    const limit = Math.min(parseInt(String(req.query.limit || "50")) || 50, 100);
    const skip = (page - 1) * limit;

    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const entity = req.query.entity ? String(req.query.entity) : undefined;
    const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined;
    const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.wpgAuditLog.findMany({
        where,
        include: {
          user: { select: { id: true, naam: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.wpgAuditLog.count({ where }),
    ]);

    res.json({
      results: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching WPG audit logs:", error);
    res.status(500).json({ error: "Fout bij ophalen WPG audit logs" });
  }
});

/**
 * GET /api/admin/audit/avg - List AVG audit logs (BEHEERDER only)
 * Supports pagination and filters
 */
router.get("/audit/avg", requireRole(UserRole.BEHEERDER), async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || "1")) || 1;
    const limit = Math.min(parseInt(String(req.query.limit || "50")) || 50, 100);
    const skip = (page - 1) * limit;

    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const entity = req.query.entity ? String(req.query.entity) : undefined;
    const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined;
    const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.avgAuditLog.findMany({
        where,
        include: {
          user: { select: { id: true, naam: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.avgAuditLog.count({ where }),
    ]);

    res.json({
      results: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching AVG audit logs:", error);
    res.status(500).json({ error: "Fout bij ophalen AVG audit logs" });
  }
});

/**
 * GET /api/admin/retention/check - Trigger retention check (BEHEERDER only)
 */
router.get("/retention/check", requireRole(UserRole.BEHEERDER), async (_req: Request, res: Response) => {
  try {
    const { checkRetention } = await import("../services/retention.js");
    const result = await checkRetention();
    res.json(result);
  } catch (error) {
    console.error("Error running retention check:", error);
    res.status(500).json({ error: "Fout bij retentiecontrole" });
  }
});

export default router;

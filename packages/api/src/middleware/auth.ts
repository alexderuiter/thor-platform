import { Request, Response, NextFunction } from "express";
import {
  LegalRegime,
  UserRole,
  WpgArticle,
  WPG_ACCESS_MATRIX,
  REGISTRATION_LEGAL_REGIME,
  RegistrationType,
} from "@thor/shared";
import { prisma } from "../db/client.js";

// Extend Express Request with user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        naam: string;
        role: UserRole;
        activeRegime?: LegalRegime; // Which "hat" the user currently wears
      };
    }
  }
}

/**
 * Authentication middleware
 * In MVP: uses X-User-Id header. In production: SSO via OpenID Connect/SAML2 (ICTA-1)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      naam: user.naam,
      role: user.role as UserRole,
      activeRegime: (req.headers["x-legal-regime"] as LegalRegime) || LegalRegime.AVG,
    };
    next();
  } catch {
    res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * WPG-2: Enforce role-based access for WPG data
 * Users must explicitly switch to WPG mode and have proper authorization
 */
export function requireWpgAccess(wpgArticle: WpgArticle) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const allowedRoles = WPG_ACCESS_MATRIX[wpgArticle];
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Geen toegang tot WPG-gegevens",
        detail: `Uw rol (${req.user.role}) heeft geen toegang tot Art. ${wpgArticle} gegevens`,
      });
      return;
    }

    // WPG-2: Log that user is accessing WPG data under specific role
    req.user.activeRegime = LegalRegime.WPG;
    next();
  };
}

/**
 * Check if user has one of the required roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "Onvoldoende rechten",
        detail: `Vereiste rol(len): ${roles.join(", ")}`,
      });
      return;
    }
    next();
  };
}

/**
 * Determine which legal regime applies to a registration type
 */
export function getLegalRegime(registrationType: RegistrationType): LegalRegime {
  return REGISTRATION_LEGAL_REGIME[registrationType] || LegalRegime.AVG;
}

// ============================================================================
// THOR Platform - Shared Domain Types
// Aligned with ZGW (Zaakgericht Werken) API standards
// Respects AVG/WPG data separation
// ============================================================================

// --- Legal Regime ---
// The core distinction: which law governs the data processing
export enum LegalRegime {
  AVG = "AVG", // Algemene Verordening Gegevensbescherming (bestuursrechtelijk)
  WPG = "WPG", // Wet Politiegegevens (strafrechtelijk)
}

// WPG Article basis - determines access rules and retention periods
export enum WpgArticle {
  ARTICLE_8 = "ART_8",  // Dagelijkse politietaak (1yr open, 5yr search, 10yr destroy)
  ARTICLE_9 = "ART_9",  // Gerichte opsporing (active until verdict, 6mo reuse)
  ARTICLE_13 = "ART_13", // Informanten/undercover
}

// --- Roles ---
export enum UserRole {
  BOA = "BOA",                    // Buitengewoon Opsporingsambtenaar
  TOEZICHTHOUDER = "TOEZICHTHOUDER", // Toezichthouder
  KWC = "KWC",                    // Kwaliteitscontroleur
  AANVOERDER = "AANVOERDER",      // Team lead
  JURIST = "JURIST",              // Juridisch medewerker
  ANALIST = "ANALIST",            // Data analyst
  BEHEERDER = "BEHEERDER",        // Functioneel beheerder
  BONNEN_ADMIN = "BONNEN_ADMIN",  // Bonnenadministratie
}

// --- Registration Types (ALG-14) ---
export enum RegistrationType {
  WAARNEMING = "WAARNEMING",
  CONSTATERING = "CONSTATERING",
  COMBIBON = "COMBIBON",
  COMBIBON_WAARSCHUWING = "COMBIBON_WAARSCHUWING",
  BESTUURLIJKE_BOETE = "BESTUURLIJKE_BOETE", // BBOOR
  LAST_ONDER_DWANGSOM = "LAST_ONDER_DWANGSOM",
  LAST_ONDER_BESTUURSDWANG = "LAST_ONDER_BESTUURSDWANG",
  AANHOUDING = "AANHOUDING",
  PROCES_VERBAAL = "PROCES_VERBAAL",
  TIKVERBAAL = "TIKVERBAAL",
  INBESLAGNAME = "INBESLAGNAME",
  HALT_REGISTRATIE = "HALT_REGISTRATIE",
}

// Map registration types to their legal regime
export const REGISTRATION_LEGAL_REGIME: Record<RegistrationType, LegalRegime> = {
  [RegistrationType.WAARNEMING]: LegalRegime.AVG,
  [RegistrationType.CONSTATERING]: LegalRegime.AVG,
  [RegistrationType.COMBIBON]: LegalRegime.WPG,
  [RegistrationType.COMBIBON_WAARSCHUWING]: LegalRegime.AVG,
  [RegistrationType.BESTUURLIJKE_BOETE]: LegalRegime.AVG,
  [RegistrationType.LAST_ONDER_DWANGSOM]: LegalRegime.AVG,
  [RegistrationType.LAST_ONDER_BESTUURSDWANG]: LegalRegime.AVG,
  [RegistrationType.AANHOUDING]: LegalRegime.WPG,
  [RegistrationType.PROCES_VERBAAL]: LegalRegime.WPG,
  [RegistrationType.TIKVERBAAL]: LegalRegime.WPG,
  [RegistrationType.INBESLAGNAME]: LegalRegime.AVG,
  [RegistrationType.HALT_REGISTRATIE]: LegalRegime.WPG,
};

// --- Case Status (ZGW aligned) ---
export enum ZaakStatus {
  CONCEPT = "CONCEPT",
  OPEN = "OPEN",
  IN_BEHANDELING = "IN_BEHANDELING",
  WACHT_OP_KWALITEITSCONTROLE = "WACHT_OP_KWALITEITSCONTROLE",
  AFGEKEURD = "AFGEKEURD",
  GOEDGEKEURD = "GOEDGEKEURD",
  KLAAR_VOOR_EXPORT = "KLAAR_VOOR_EXPORT",
  GEEXPORTEERD = "GEEXPORTEERD",
  GESEPONEERD = "GESEPONEERD",
  AFGEHANDELD = "AFGEHANDELD",
}

// --- Person Roles in a Case ---
export enum BetrokkeneRol {
  VERDACHTE = "VERDACHTE",
  OVERTREDER = "OVERTREDER",
  GETUIGE = "GETUIGE",
  SLACHTOFFER = "SLACHTOFFER",
  EIGENAAR = "EIGENAAR",
  HOUDER = "HOUDER",
  MELDER = "MELDER",
  VERBALISANT = "VERBALISANT",
  TWEEDE_VERBALISANT = "TWEEDE_VERBALISANT",
}

// --- Enforcement Themes ---
export enum HandhavingsThema {
  AFVAL_MILIEU = "AFVAL_MILIEU",
  VERKEER = "VERKEER",
  FIETS = "FIETS",
  OVERLAST_PERSONEN = "OVERLAST_PERSONEN",
  WATER_NAUTISCH = "WATER_NAUTISCH",
  ONDERMIJNING = "ONDERMIJNING",
  OPENBAAR_VERVOER = "OPENBAAR_VERVOER",
  HORECA = "HORECA",
}

// --- API Types ---
export interface CreateZaakRequest {
  registrationType: RegistrationType;
  thema: HandhavingsThema;
  locatie: LocatieInput;
  omschrijving?: string;
  betrokkenen?: BetrokkeneInput[];
  werkopdracht_id?: string;
}

export interface LocatieInput {
  straatnaam: string;
  huisnummer?: string;
  postcode?: string;
  woonplaats: string;
  latitude?: number;
  longitude?: number;
  toelichting?: string;
}

export interface BetrokkeneInput {
  rol: BetrokkeneRol;
  bsn?: string;
  voornaam?: string;
  tussenvoegsel?: string;
  achternaam?: string;
  geboortedatum?: string;
  kenteken?: string;
  kvk_nummer?: string;
}

// --- WPG Audit Log ---
export interface WpgAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "VERSTREKKING";
  zaakId: string;
  legalRegime: LegalRegime;
  wpgArticle?: WpgArticle;
  details: string;
  recipientOrganisation?: string; // For verstrekkingen (WPG-4)
  grondslag?: string;
}

// --- Access Control Matrix ---
// WPG-2: Mutual exclusive roles per legal regime
export const WPG_ACCESS_MATRIX: Record<WpgArticle, UserRole[]> = {
  [WpgArticle.ARTICLE_8]: [UserRole.BOA, UserRole.AANVOERDER, UserRole.KWC, UserRole.BEHEERDER],
  [WpgArticle.ARTICLE_9]: [UserRole.BOA, UserRole.AANVOERDER], // + Bevoegd Functionaris
  [WpgArticle.ARTICLE_13]: [UserRole.BEHEERDER], // Zeer beperkt
};

export const AVG_ACCESS_MATRIX: Record<UserRole, boolean> = {
  [UserRole.BOA]: true,
  [UserRole.TOEZICHTHOUDER]: true,
  [UserRole.KWC]: true,
  [UserRole.AANVOERDER]: true,
  [UserRole.JURIST]: true,
  [UserRole.ANALIST]: true,
  [UserRole.BEHEERDER]: true,
  [UserRole.BONNEN_ADMIN]: true,
};

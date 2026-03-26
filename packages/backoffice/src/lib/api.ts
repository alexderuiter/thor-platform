const API_BASE = "/api";

// In MVP: simulate auth with a user ID header
// In production: SSO via OpenID Connect / SAML2
let currentUserId = "";

export function setCurrentUser(userId: string) {
  currentUserId = userId;
}

export function getCurrentUserId() {
  return currentUserId;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": currentUserId,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Zaken ---
export interface Zaak {
  id: string;
  zaakNummer: string;
  registratieType: string;
  status: string;
  thema: string;
  omschrijving?: string;
  legalRegime: "AVG" | "WPG";
  wpgArtikel?: string;
  locatie?: {
    straatnaam: string;
    huisnummer?: string;
    woonplaats: string;
  };
  betrokkenen: Array<{
    id: string;
    rol: string;
    voornaam?: string;
    achternaam?: string;
    kenteken?: string;
  }>;
  medewerker?: { id: string; naam: string; role: string };
  documenten?: Array<{ id: string; titel: string; documentType: string; status: string }>;
  notities?: Array<{ id: string; inhoud: string; auteur: string; createdAt: string }>;
  statusWijzigingen?: Array<{
    vanStatus: string;
    naarStatus: string;
    reden?: string;
    userId: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ZakenResponse {
  results: Zaak[];
  total: number;
  page: number;
  totalPages: number;
}

export const zakenApi = {
  list: (regime?: string, page = 1) =>
    request<ZakenResponse>(`/zaken?regime=${regime || "AVG"}&page=${page}`),

  get: (id: string) => request<Zaak>(`/zaken/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Zaak>("/zaken", { method: "POST", body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string, reden?: string) =>
    request<Zaak>(`/zaken/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reden }),
    }),
};

// --- Workflow ---
export interface WorkflowTaak {
  id: string;
  zaakId: string;
  zaakType: string;
  type: string;
  titel: string;
  status: string;
  resultaat?: string;
  createdAt: string;
}

export const workflowApi = {
  taken: (status = "OPEN") => request<WorkflowTaak[]>(`/workflow/taken?status=${status}`),

  updateTaak: (id: string, status: string, resultaat?: string) =>
    request<WorkflowTaak>(`/workflow/taken/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, resultaat }),
    }),

  werkvoorraad: () => request<WorkflowTaak[]>("/workflow/werkvoorraad"),
};

// --- Documents ---
export interface Document {
  id: string;
  zaakId: string;
  titel: string;
  documentType: string;
  bestandsnaam: string;
  mimeType: string;
  status: string;
  createdAt: string;
}

export const documentApi = {
  list: (zaakId: string) => request<Document[]>(`/zaken/${zaakId}/documenten`),

  upload: async (zaakId: string, file: File, titel: string, documentType: string): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("titel", titel);
    formData.append("documentType", documentType);

    const res = await fetch(`${API_BASE}/zaken/${zaakId}/documenten`, {
      method: "POST",
      headers: {
        "X-User-Id": currentUserId,
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  downloadUrl: (zaakId: string, docId: string) =>
    `${API_BASE}/zaken/${zaakId}/documenten/${docId}/download`,
};

// --- Audit Logs ---
export interface AuditLogEntry {
  id: string;
  userId: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  wpgArtikel?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; naam: string; role: string };
}

export interface AuditLogResponse {
  results: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export const auditApi = {
  wpgLogs: (params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    return request<AuditLogResponse>(`/admin/audit/wpg?${searchParams.toString()}`);
  },

  avgLogs: (params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    return request<AuditLogResponse>(`/admin/audit/avg?${searchParams.toString()}`);
  },
};

// --- Users ---
export interface User {
  id: string;
  email: string;
  naam: string;
  role: string;
}

export const userApi = {
  me: () => request<User>("/me"),
};

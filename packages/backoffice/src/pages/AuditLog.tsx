import { useState, useEffect } from "react";
import { auditApi, type AuditLogEntry, type AuditLogResponse } from "../lib/api";

type Tab = "WPG" | "AVG";

export default function AuditLog() {
  const [tab, setTab] = useState<Tab>("WPG");
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {
      page,
      limit: 50,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const fetchFn = tab === "WPG" ? auditApi.wpgLogs : auditApi.avgLogs;

    fetchFn(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, page, dateFrom, dateTo]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Audit Log</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <button
          className={`btn ${tab === "WPG" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderRadius: "var(--radius) 0 0 var(--radius)" }}
          onClick={() => handleTabChange("WPG")}
        >
          WPG Logs
        </button>
        <button
          className={`btn ${tab === "AVG" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderRadius: "0 var(--radius) var(--radius) 0" }}
          onClick={() => handleTabChange("AVG")}
        >
          AVG Logs
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group">
            <label>Datum van</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="form-group">
            <label>Datum tot</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
          <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
            >
              Filters wissen
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: "var(--color-secondary)" }}>
          Fout: {error}
        </div>
      )}

      {loading ? (
        <p>Laden...</p>
      ) : data && data.results.length > 0 ? (
        <>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>Datum</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>Gebruiker</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>Actie</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>Entiteit</th>
                  <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>Details</th>
                  {tab === "WPG" && (
                    <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}>WPG Artikel</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.results.map((log: AuditLogEntry) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleString("nl-NL")}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {log.user?.naam || log.userId}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span className="badge badge-status">{log.action}</span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>{log.entity}</td>
                    <td style={{ padding: "8px 12px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.details}
                    </td>
                    {tab === "WPG" && (
                      <td style={{ padding: "8px 12px" }}>{log.wpgArtikel || "-"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Vorige
              </button>
              <span style={{ padding: "6px 12px", fontSize: 13 }}>
                Pagina {data.page} van {data.totalPages} ({data.total} resultaten)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Volgende
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Geen audit logs gevonden</p>
        </div>
      )}
    </div>
  );
}

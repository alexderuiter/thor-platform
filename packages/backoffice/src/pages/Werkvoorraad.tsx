import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { workflowApi, type WorkflowTaak } from "../lib/api";

export default function Werkvoorraad() {
  const [taken, setTaken] = useState<WorkflowTaak[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"OPEN" | "IN_BEHANDELING" | "AFGEROND">("OPEN");

  useEffect(() => {
    setLoading(true);
    workflowApi
      .taken(filter)
      .then(setTaken)
      .catch(() => setTaken([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleAction = async (taak: WorkflowTaak, resultaat: string) => {
    try {
      await workflowApi.updateTaak(taak.id, "AFGEROND", resultaat);
      setTaken((prev) => prev.filter((t) => t.id !== taak.id));
    } catch (err) {
      console.error("Error updating taak:", err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Werkvoorraad</h2>
      </div>

      <div className="tabs">
        {(["OPEN", "IN_BEHANDELING", "AFGEROND"] as const).map((s) => (
          <button key={s} className={`tab ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>
            {s === "OPEN" ? "Te doen" : s === "IN_BEHANDELING" ? "In behandeling" : "Afgerond"}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Laden...</p>
      ) : taken.length > 0 ? (
        <div>
          {taken.map((taak) => (
            <div key={taak.id} className="card">
              <div className="card-header">
                <div>
                  <h4 style={{ fontSize: 15 }}>{taak.titel}</h4>
                  <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                    Type: {taak.type.replace(/_/g, " ")} |
                    Regime: <span className={`badge badge-${taak.zaakType.toLowerCase()}`}>{taak.zaakType}</span> |
                    Aangemaakt: {new Date(taak.createdAt).toLocaleDateString("nl-NL")}
                  </div>
                </div>
                <span className={`badge badge-status ${taak.status.toLowerCase().replace(/_/g, "-")}`}>
                  {taak.status}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Link to={`/zaken/${taak.zaakId}`} className="btn btn-sm btn-secondary">
                  Zaak bekijken
                </Link>
                {taak.status === "OPEN" && taak.type === "KWALITEITSCONTROLE" && (
                  <>
                    <button className="btn btn-sm btn-success" onClick={() => handleAction(taak, "GOEDGEKEURD")}>
                      Goedkeuren
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleAction(taak, "AFGEKEURD")}>
                      Afkeuren
                    </button>
                  </>
                )}
                {taak.status === "OPEN" && taak.type === "EXPORT" && (
                  <button className="btn btn-sm btn-primary" onClick={() => handleAction(taak, "GEEXPORTEERD")}>
                    Exporteren
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--color-text-muted)" }}>
            Geen taken met status &quot;{filter}&quot;
          </p>
        </div>
      )}
    </div>
  );
}

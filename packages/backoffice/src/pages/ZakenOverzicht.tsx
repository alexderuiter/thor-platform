import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { zakenApi, type Zaak, type ZakenResponse } from "../lib/api";

const STATUS_LABELS: Record<string, string> = {
  CONCEPT: "Concept",
  OPEN: "Open",
  IN_BEHANDELING: "In behandeling",
  WACHT_OP_KWALITEITSCONTROLE: "Wacht op KWC",
  AFGEKEURD: "Afgekeurd",
  GOEDGEKEURD: "Goedgekeurd",
  KLAAR_VOOR_EXPORT: "Klaar voor export",
  GEEXPORTEERD: "Geexporteerd",
  GESEPONEERD: "Geseponeerd",
  AFGEHANDELD: "Afgehandeld",
};

const TYPE_LABELS: Record<string, string> = {
  WAARNEMING: "Waarneming",
  CONSTATERING: "Constatering",
  COMBIBON: "Combibon",
  COMBIBON_WAARSCHUWING: "Combibon (waarschuwing)",
  BESTUURLIJKE_BOETE: "Bestuurlijke boete",
  LAST_ONDER_DWANGSOM: "Last onder dwangsom",
  LAST_ONDER_BESTUURSDWANG: "Last onder bestuursdwang",
  AANHOUDING: "Aanhouding",
  PROCES_VERBAAL: "Proces-verbaal",
  TIKVERBAAL: "Tikverbaal",
  INBESLAGNAME: "Inbeslagname",
  HALT_REGISTRATIE: "Halt registratie",
};

export default function ZakenOverzicht() {
  const [regime, setRegime] = useState<"AVG" | "WPG">("AVG");
  const [data, setData] = useState<ZakenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    zakenApi
      .list(regime)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [regime]);

  return (
    <div>
      <div className="page-header">
        <h2>Zaken overzicht</h2>
        <Link to="/zaken/nieuw" className="btn btn-primary">
          + Nieuwe registratie
        </Link>
      </div>

      {/* AVG/WPG regime tabs - WPG-1: visible distinction */}
      <div className="tabs">
        <button
          className={`tab ${regime === "AVG" ? "active" : ""}`}
          onClick={() => setRegime("AVG")}
        >
          <span className="badge badge-avg" style={{ marginRight: 8 }}>AVG</span>
          Bestuursrechtelijk
        </button>
        <button
          className={`tab ${regime === "WPG" ? "active" : ""}`}
          onClick={() => setRegime("WPG")}
        >
          <span className="badge badge-wpg" style={{ marginRight: 8 }}>WPG</span>
          Strafrechtelijk
        </button>
      </div>

      {/* Regime indicator */}
      <div className={`regime-indicator ${regime.toLowerCase()}`}>
        {regime === "AVG" ? (
          <>U bekijkt bestuursrechtelijke zaken (AVG). Persoonsgegevens worden verwerkt conform de Algemene Verordening Gegevensbescherming.</>
        ) : (
          <>U bekijkt strafrechtelijke zaken (WPG). Alle toegang wordt gelogd conform de Wet politiegegevens. Toegang is beperkt tot geautoriseerde BOA&apos;s.</>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--color-secondary)", color: "var(--color-secondary)" }}>
          Fout bij laden: {error}. Is de API server gestart?
        </div>
      )}

      {loading ? (
        <p>Laden...</p>
      ) : data && data.results.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Regime</th>
                  <th>Zaaknummer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Locatie</th>
                  <th>Thema</th>
                  <th>Datum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((zaak) => (
                  <tr key={zaak.id}>
                    <td>
                      <span className={`badge badge-${zaak.legalRegime.toLowerCase()}`}>
                        {zaak.legalRegime}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {zaak.zaakNummer.slice(0, 8)}...
                    </td>
                    <td>{TYPE_LABELS[zaak.registratieType] || zaak.registratieType}</td>
                    <td>
                      <span className={`badge badge-status ${zaak.status.toLowerCase().replace(/_/g, "-")}`}>
                        {STATUS_LABELS[zaak.status] || zaak.status}
                      </span>
                    </td>
                    <td>
                      {zaak.locatie
                        ? `${zaak.locatie.straatnaam} ${zaak.locatie.huisnummer || ""}`
                        : "-"}
                    </td>
                    <td>{zaak.thema.replace(/_/g, " ")}</td>
                    <td style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {new Date(zaak.createdAt).toLocaleDateString("nl-NL")}
                    </td>
                    <td>
                      <Link to={`/zaken/${zaak.id}`} className="btn btn-sm btn-secondary">
                        Bekijken
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--color-text-muted)" }}>
            {data.total} zaken gevonden - Pagina {data.page} van {data.totalPages}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--color-text-muted)" }}>
            Geen {regime === "WPG" ? "strafrechtelijke" : "bestuursrechtelijke"} zaken gevonden.
          </p>
          <Link to="/zaken/nieuw" className="btn btn-primary" style={{ marginTop: 16 }}>
            Eerste registratie aanmaken
          </Link>
        </div>
      )}
    </div>
  );
}

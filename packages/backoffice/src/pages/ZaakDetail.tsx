import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { zakenApi, documentApi, type Zaak, type Document } from "../lib/api";

export default function ZaakDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [zaak, setZaak] = useState<Zaak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documenten, setDocumenten] = useState<Document[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitel, setUploadTitel] = useState("");
  const [uploadType, setUploadType] = useState("OVERIG");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    zakenApi
      .get(id)
      .then((z) => {
        setZaak(z);
        return documentApi.list(id);
      })
      .then(setDocumenten)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async () => {
    if (!id || !uploadFile) return;
    setUploading(true);
    try {
      await documentApi.upload(id, uploadFile, uploadTitel || uploadFile.name, uploadType);
      const docs = await documentApi.list(id);
      setDocumenten(docs);
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadTitel("");
      setUploadType("OVERIG");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij uploaden");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const updated = await zakenApi.updateStatus(id, newStatus);
      setZaak((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij status wijziging");
    }
  };

  if (loading) return <p>Laden...</p>;
  if (error) return <div className="card" style={{ color: "var(--color-secondary)" }}>Fout: {error}</div>;
  if (!zaak) return <div className="card">Zaak niet gevonden</div>;

  const isWpg = zaak.legalRegime === "WPG";

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2>Zaak {zaak.zaakNummer.slice(0, 8)}</h2>
            <span className={`badge badge-${zaak.legalRegime.toLowerCase()}`}>{zaak.legalRegime}</span>
            <span className={`badge badge-status ${zaak.status.toLowerCase().replace(/_/g, "-")}`}>
              {zaak.status.replace(/_/g, " ")}
            </span>
          </div>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
            {zaak.registratieType.replace(/_/g, " ")} - {zaak.thema.replace(/_/g, " ")}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Terug
        </button>
      </div>

      {/* WPG notice */}
      {isWpg && (
        <div className="regime-indicator wpg">
          WPG-zaak: Alle toegang tot deze zaak wordt gelogd conform de Wet politiegegevens.
          {(zaak as any).wpgArtikel && <> Grondslag: {(zaak as any).wpgArtikel}</>}
        </div>
      )}

      <div className="detail-grid">
        {/* Left column: case details */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Zaakgegevens</h3>
            <div className="detail-field">
              <div className="label">Zaaknummer</div>
              <div className="value" style={{ fontFamily: "monospace" }}>{zaak.zaakNummer}</div>
            </div>
            <div className="detail-field">
              <div className="label">Type</div>
              <div className="value">{zaak.registratieType.replace(/_/g, " ")}</div>
            </div>
            <div className="detail-field">
              <div className="label">Thema</div>
              <div className="value">{zaak.thema.replace(/_/g, " ")}</div>
            </div>
            {zaak.omschrijving && (
              <div className="detail-field">
                <div className="label">Omschrijving</div>
                <div className="value">{zaak.omschrijving}</div>
              </div>
            )}
            <div className="detail-field">
              <div className="label">Aangemaakt door</div>
              <div className="value">{zaak.medewerker?.naam || "-"} ({zaak.medewerker?.role})</div>
            </div>
            <div className="detail-field">
              <div className="label">Datum</div>
              <div className="value">{new Date(zaak.createdAt).toLocaleString("nl-NL")}</div>
            </div>
          </div>

          {/* Location */}
          {zaak.locatie && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Locatie</h3>
              <div className="detail-field">
                <div className="label">Adres</div>
                <div className="value">
                  {zaak.locatie.straatnaam} {zaak.locatie.huisnummer}, {zaak.locatie.woonplaats}
                </div>
              </div>
            </div>
          )}

          {/* WPG cautie info */}
          {isWpg && (zaak as any).cautieGegeven !== undefined && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Strafrechtelijke informatie</h3>
              <div className="detail-field">
                <div className="label">Cautie gegeven</div>
                <div className="value">{(zaak as any).cautieGegeven ? "Ja" : "Nee"}</div>
              </div>
              <div className="detail-field">
                <div className="label">Recht op bijstand medegedeeld</div>
                <div className="value">{(zaak as any).rechtBijstand ? "Ja" : "Nee"}</div>
              </div>
              <div className="detail-field">
                <div className="label">Recht op vertolking medegedeeld</div>
                <div className="value">{(zaak as any).rechtVertolking ? "Ja" : "Nee"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: betrokkenen + actions */}
        <div>
          {/* Betrokkenen */}
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Betrokkene(n)</h3>
            {zaak.betrokkenen.length > 0 ? (
              zaak.betrokkenen.map((b) => (
                <div key={b.id} style={{ marginBottom: 12, padding: 12, background: "#f9fafb", borderRadius: "var(--radius)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{b.voornaam || ""} {b.achternaam || "(onbekend)"}</strong>
                    <span className="badge badge-status">{b.rol}</span>
                  </div>
                  {b.kenteken && <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Kenteken: {b.kenteken}</div>}
                </div>
              ))
            ) : (
              <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Geen betrokkenen</p>
            )}
          </div>

          {/* Workflow actions */}
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Acties</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {zaak.status === "CONCEPT" && (
                <button className="btn btn-primary" onClick={() => handleStatusChange("OPEN")}>
                  Registratie afronden
                </button>
              )}
              {zaak.status === "OPEN" && (
                <button className="btn btn-primary" onClick={() => handleStatusChange("WACHT_OP_KWALITEITSCONTROLE")}>
                  Indienen voor kwaliteitscontrole
                </button>
              )}
              {zaak.status === "WACHT_OP_KWALITEITSCONTROLE" && (
                <>
                  <button className="btn btn-success" onClick={() => handleStatusChange("GOEDGEKEURD")}>
                    Goedkeuren (KWC)
                  </button>
                  <button className="btn btn-danger" onClick={() => handleStatusChange("AFGEKEURD")}>
                    Afkeuren (KWC)
                  </button>
                </>
              )}
              {zaak.status === "AFGEKEURD" && (
                <button className="btn btn-primary" onClick={() => handleStatusChange("OPEN")}>
                  Opnieuw bewerken
                </button>
              )}
              {zaak.status === "GOEDGEKEURD" && (
                <button className="btn btn-primary" onClick={() => handleStatusChange("KLAAR_VOOR_EXPORT")}>
                  Klaarzetten voor export
                </button>
              )}
              {(zaak.status === "OPEN" || zaak.status === "CONCEPT") && (
                <button className="btn btn-secondary" onClick={() => handleStatusChange("GESEPONEERD")}>
                  Seponeren
                </button>
              )}
            </div>
          </div>

          {/* Status history */}
          {zaak.statusWijzigingen && zaak.statusWijzigingen.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Statushistorie</h3>
              {zaak.statusWijzigingen.map((sw, i) => (
                <div key={i} style={{ marginBottom: 8, fontSize: 13, display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--color-text-muted)", minWidth: 120 }}>
                    {new Date(sw.createdAt).toLocaleString("nl-NL")}
                  </span>
                  <span>{sw.vanStatus} &rarr; {sw.naarStatus}</span>
                  {sw.reden && <span style={{ color: "var(--color-text-muted)" }}>({sw.reden})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16 }}>Documenten</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                {showUploadForm ? "Annuleren" : "+ Document uploaden"}
              </button>
            </div>

            {showUploadForm && (
              <div style={{ marginBottom: 16, padding: 16, background: "#f9fafb", borderRadius: "var(--radius)" }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Bestand</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    style={{ fontSize: 13 }}
                  />
                </div>
                <div className="form-row" style={{ marginBottom: 12 }}>
                  <div className="form-group">
                    <label>Titel</label>
                    <input
                      type="text"
                      value={uploadTitel}
                      onChange={(e) => setUploadTitel(e.target.value)}
                      placeholder="Titel van het document"
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                      <option value="FOTO">Foto</option>
                      <option value="RAPPORT">Rapport</option>
                      <option value="PROCES_VERBAAL">Proces-verbaal</option>
                      <option value="OVERIG">Overig</option>
                    </select>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? "Uploaden..." : "Uploaden"}
                </button>
              </div>
            )}

            {documenten.length > 0 ? (
              documenten.map((doc) => (
                <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{doc.titel}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {doc.bestandsnaam} - {new Date(doc.createdAt).toLocaleString("nl-NL")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="badge badge-status">{doc.documentType.replace(/_/g, " ")}</span>
                    <a
                      href={documentApi.downloadUrl(zaak.id, doc.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12, padding: "2px 8px", textDecoration: "none" }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Geen documenten</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

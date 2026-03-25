import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zakenApi } from "../lib/api";

const REGISTRATION_TYPES = [
  { value: "WAARNEMING", label: "Waarneming", regime: "AVG" },
  { value: "CONSTATERING", label: "Constatering / Rapport van bevinding", regime: "AVG" },
  { value: "BESTUURLIJKE_BOETE", label: "Bestuurlijke Boete (BBOOR)", regime: "AVG" },
  { value: "LAST_ONDER_DWANGSOM", label: "Last onder Dwangsom", regime: "AVG" },
  { value: "LAST_ONDER_BESTUURSDWANG", label: "Last onder Bestuursdwang", regime: "AVG" },
  { value: "INBESLAGNAME", label: "Inbeslagname", regime: "AVG" },
  { value: "COMBIBON", label: "Combibon (sanctie)", regime: "WPG" },
  { value: "COMBIBON_WAARSCHUWING", label: "Combibon (waarschuwing)", regime: "AVG" },
  { value: "TIKVERBAAL", label: "Tikverbaal", regime: "WPG" },
  { value: "PROCES_VERBAAL", label: "Proces-verbaal", regime: "WPG" },
  { value: "AANHOUDING", label: "Aanhouding", regime: "WPG" },
];

const THEMAS = [
  { value: "AFVAL_MILIEU", label: "Afval & Milieu" },
  { value: "VERKEER", label: "Verkeer" },
  { value: "FIETS", label: "Fiets" },
  { value: "OVERLAST_PERSONEN", label: "Overlast Personen" },
  { value: "WATER_NAUTISCH", label: "Water / Nautisch" },
  { value: "ONDERMIJNING", label: "Ondermijning" },
  { value: "OPENBAAR_VERVOER", label: "Openbaar Vervoer" },
  { value: "HORECA", label: "Horeca" },
];

const BETROKKENE_ROLLEN = [
  { value: "OVERTREDER", label: "Overtreder" },
  { value: "VERDACHTE", label: "Verdachte" },
  { value: "GETUIGE", label: "Getuige" },
  { value: "SLACHTOFFER", label: "Slachtoffer" },
  { value: "EIGENAAR", label: "Eigenaar" },
  { value: "HOUDER", label: "Houder" },
  { value: "MELDER", label: "Melder" },
];

export default function NieuweZaak() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    registratieType: "CONSTATERING",
    thema: "AFVAL_MILIEU",
    omschrijving: "",
    locatie: {
      straatnaam: "",
      huisnummer: "",
      postcode: "",
      woonplaats: "Amsterdam",
    },
    betrokkenen: [{ rol: "OVERTREDER", voornaam: "", achternaam: "", kenteken: "" }],
    cautieGegeven: false,
  });

  const selectedType = REGISTRATION_TYPES.find((t) => t.value === form.registratieType);
  const isWpg = selectedType?.regime === "WPG";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const zaak = await zakenApi.create({
        ...form,
        betrokkenen: form.betrokkenen.filter((b) => b.voornaam || b.achternaam || b.kenteken),
      });
      navigate(`/zaken/${zaak.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Nieuwe registratie</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Type registratie</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Registratietype</label>
              <select
                value={form.registratieType}
                onChange={(e) => setForm({ ...form, registratieType: e.target.value })}
              >
                <optgroup label="Bestuursrechtelijk (AVG)">
                  {REGISTRATION_TYPES.filter((t) => t.regime === "AVG").map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Strafrechtelijk (WPG)">
                  {REGISTRATION_TYPES.filter((t) => t.regime === "WPG").map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>Handhavingsthema</label>
              <select
                value={form.thema}
                onChange={(e) => setForm({ ...form, thema: e.target.value })}
              >
                {THEMAS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* WPG-1: Visible regime distinction */}
          <div className={`regime-indicator ${isWpg ? "wpg" : "avg"}`}>
            {isWpg ? (
              <>Deze registratie valt onder de Wet politiegegevens (WPG). Alle acties worden gelogd. Toegang is beperkt tot geautoriseerde medewerkers.</>
            ) : (
              <>Deze registratie valt onder de Algemene Verordening Gegevensbescherming (AVG).</>
            )}
          </div>

          {/* WPG: Cautie fields (TH-3) */}
          {isWpg && (
            <div style={{ marginTop: 16, padding: 16, background: "#fef2f2", borderRadius: "var(--radius)" }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Strafrechtelijke verplichtingen</h4>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={form.cautieGegeven}
                  onChange={(e) => setForm({ ...form, cautieGegeven: e.target.checked })}
                />
                Cautie is gegeven
              </label>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Locatie</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Straatnaam *</label>
              <input
                type="text"
                required
                value={form.locatie.straatnaam}
                onChange={(e) => setForm({ ...form, locatie: { ...form.locatie, straatnaam: e.target.value } })}
                placeholder="bijv. Middenweg"
              />
            </div>
            <div className="form-group">
              <label>Huisnummer</label>
              <input
                type="text"
                value={form.locatie.huisnummer}
                onChange={(e) => setForm({ ...form, locatie: { ...form.locatie, huisnummer: e.target.value } })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Postcode</label>
              <input
                type="text"
                value={form.locatie.postcode}
                onChange={(e) => setForm({ ...form, locatie: { ...form.locatie, postcode: e.target.value } })}
              />
            </div>
            <div className="form-group">
              <label>Woonplaats</label>
              <input
                type="text"
                value={form.locatie.woonplaats}
                onChange={(e) => setForm({ ...form, locatie: { ...form.locatie, woonplaats: e.target.value } })}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Betrokkene(n)</h3>
          {form.betrokkenen.map((b, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--color-border)" }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={b.rol}
                    onChange={(e) => {
                      const updated = [...form.betrokkenen];
                      updated[i] = { ...updated[i], rol: e.target.value };
                      setForm({ ...form, betrokkenen: updated });
                    }}
                  >
                    {BETROKKENE_ROLLEN.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Kenteken</label>
                  <input
                    type="text"
                    value={b.kenteken}
                    onChange={(e) => {
                      const updated = [...form.betrokkenen];
                      updated[i] = { ...updated[i], kenteken: e.target.value };
                      setForm({ ...form, betrokkenen: updated });
                    }}
                    placeholder="AB-123-CD"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Voornaam</label>
                  <input
                    type="text"
                    value={b.voornaam}
                    onChange={(e) => {
                      const updated = [...form.betrokkenen];
                      updated[i] = { ...updated[i], voornaam: e.target.value };
                      setForm({ ...form, betrokkenen: updated });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Achternaam</label>
                  <input
                    type="text"
                    value={b.achternaam}
                    onChange={(e) => {
                      const updated = [...form.betrokkenen];
                      updated[i] = { ...updated[i], achternaam: e.target.value };
                      setForm({ ...form, betrokkenen: updated });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setForm({
              ...form,
              betrokkenen: [...form.betrokkenen, { rol: "GETUIGE", voornaam: "", achternaam: "", kenteken: "" }],
            })}
          >
            + Betrokkene toevoegen
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Omschrijving</h3>
          <div className="form-group">
            <label>Toelichting / redenen van wetenschap</label>
            <textarea
              value={form.omschrijving}
              onChange={(e) => setForm({ ...form, omschrijving: e.target.value })}
              placeholder="Beschrijf de waarneming of overtreding..."
              rows={4}
            />
          </div>
        </div>

        {error && (
          <div className="card" style={{ borderColor: "var(--color-secondary)", color: "var(--color-secondary)" }}>
            Fout: {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Opslaan..." : "Registratie aanmaken"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}

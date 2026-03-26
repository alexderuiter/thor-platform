import { useState, useRef, useEffect, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (Vite bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- Types ---
export interface AddressResult {
  straatnaam: string;
  huisnummer: string;
  postcode: string;
  woonplaats: string;
  weergavenaam: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  onSelect: (address: AddressResult) => void;
  initialValue?: string;
}

interface PdokSuggestion {
  type: string;
  weergavenaam: string;
  id: string;
  score: number;
}

// --- PDOK endpoints ---
const PDOK_SUGGEST = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest";
const PDOK_LOOKUP = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup";
const PDOK_REVERSE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse";

// Amsterdam center
const AMSTERDAM_CENTER: [number, number] = [52.3676, 4.9041];

// --- Helper: reverse geocode via PDOK ---
async function reverseGeocode(lat: number, lng: number): Promise<AddressResult | null> {
  try {
    const params = new URLSearchParams({
      type: "adres",
      rows: "1",
      lat: lat.toString(),
      lon: lng.toString(),
    });
    // Step 1: Reverse geocode to get nearest address ID
    const res = await fetch(`${PDOK_REVERSE}?${params}`);
    const data = await res.json();
    const reverseDoc = data.response?.docs?.[0];
    if (!reverseDoc) return null;

    // Step 2: Lookup by ID to get full address details (straatnaam, huisnummer, postcode)
    const lookupRes = await fetch(`${PDOK_LOOKUP}?id=${encodeURIComponent(reverseDoc.id)}`);
    const lookupData = await lookupRes.json();
    const doc = lookupData.response?.docs?.[0];

    if (doc) {
      return {
        straatnaam: doc.straatnaam || "",
        huisnummer: doc.huis_nlt || "",
        postcode: doc.postcode || "",
        woonplaats: doc.woonplaatsnaam || "Amsterdam",
        weergavenaam: reverseDoc.weergavenaam,
        latitude: lat,
        longitude: lng,
      };
    }

    // Fallback: parse weergavenaam if lookup fails
    return {
      straatnaam: reverseDoc.weergavenaam.split(",")[0]?.trim() || "",
      huisnummer: "",
      postcode: "",
      woonplaats: "Amsterdam",
      weergavenaam: reverseDoc.weergavenaam,
      latitude: lat,
      longitude: lng,
    };
  } catch (err) {
    console.error("Reverse geocode failed:", err);
    return null;
  }
}

export default function AddressSearch({ onSelect, initialValue = "" }: Props) {
  // --- State ---
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<PdokSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // --- Close dropdown on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Handle address selection from any source ---
  const handleAddressSelected = useCallback(
    (address: AddressResult) => {
      setQuery(address.weergavenaam);
      setSelected(true);
      setShowDropdown(false);
      setSuggestions([]);
      onSelect(address);

      // Update map marker if map is visible
      if (address.latitude && address.longitude) {
        setMapPosition([address.latitude, address.longitude]);
      }
    },
    [onSelect]
  );

  // --- GPS: Get current position ---
  const handleGpsLocate = async () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocatie wordt niet ondersteund door deze browser");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapPosition([latitude, longitude]);

        // Reverse geocode
        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          handleAddressSelected(address);
        } else {
          setGpsError("Geen adres gevonden op deze locatie. Gebruik de kaart of zoek handmatig.");
          setShowMap(true);
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError("Locatietoegang geweigerd. Gebruik de kaart of zoek handmatig.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError("Locatie niet beschikbaar. Gebruik de kaart om een locatie aan te wijzen.");
            break;
          case err.TIMEOUT:
            setGpsError("Locatiebepaling duurde te lang. Probeer opnieuw of gebruik de kaart.");
            break;
          default:
            setGpsError("Kon locatie niet bepalen. Gebruik de kaart of zoek handmatig.");
        }
        setShowMap(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // --- Initialize/update Leaflet map ---
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    // Already initialized?
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      if (mapPosition) {
        mapRef.current.setView(mapPosition, 17);
        if (markerRef.current) {
          markerRef.current.setLatLng(mapPosition);
        } else {
          markerRef.current = L.marker(mapPosition).addTo(mapRef.current);
        }
      }
      return;
    }

    const center = mapPosition || AMSTERDAM_CENTER;
    const zoom = mapPosition ? 17 : 14;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add marker if we have a position
    if (mapPosition) {
      markerRef.current = L.marker(mapPosition).addTo(map);
    }

    // Click handler: reverse geocode
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setMapPosition([lat, lng]);

      // Move/create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      // Reverse geocode
      const address = await reverseGeocode(lat, lng);
      if (address) {
        handleAddressSelected(address);
      } else {
        setGpsError("Geen adres gevonden op deze locatie. Probeer een andere plek.");
      }
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  // Update marker when mapPosition changes (after init)
  useEffect(() => {
    if (!mapRef.current || !mapPosition) return;
    mapRef.current.setView(mapPosition, 17);
    if (markerRef.current) {
      markerRef.current.setLatLng(mapPosition);
    } else {
      markerRef.current = L.marker(mapPosition).addTo(mapRef.current);
    }
  }, [mapPosition]);

  // --- Text search via PDOK suggest ---
  const searchAddress = async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        fq: "type:adres",
        rows: "7",
        bq: "gemeentenaam:Amsterdam^2",
      });
      const res = await fetch(`${PDOK_SUGGEST}?${params}`);
      const data = await res.json();

      setSuggestions(
        (data.response?.docs || []).map((doc: any) => ({
          type: doc.type,
          weergavenaam: doc.weergavenaam,
          id: doc.id,
          score: doc.score,
        }))
      );
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(value), 300);
  };

  const handleSuggestionSelect = async (suggestion: PdokSuggestion) => {
    setShowDropdown(false);

    try {
      const res = await fetch(`${PDOK_LOOKUP}?id=${encodeURIComponent(suggestion.id)}`);
      const data = await res.json();
      const doc = data.response?.docs?.[0];

      if (doc) {
        let latitude: number | undefined;
        let longitude: number | undefined;
        const match = doc.centroide_ll?.match(/POINT\(([\d.]+)\s+([\d.]+)\)/);
        if (match) {
          longitude = parseFloat(match[1]);
          latitude = parseFloat(match[2]);
        }

        handleAddressSelected({
          straatnaam: doc.straatnaam || "",
          huisnummer: doc.huis_nlt || "",
          postcode: doc.postcode || "",
          woonplaats: doc.woonplaatsnaam || "Amsterdam",
          weergavenaam: suggestion.weergavenaam,
          latitude,
          longitude,
        });
      }
    } catch (err) {
      console.error("PDOK lookup error:", err);
    }
  };

  // --- Auto-detect GPS on mount ---
  useEffect(() => {
    handleGpsLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---
  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* GPS button + status */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleGpsLocate}
          disabled={gpsLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: gpsLoading ? "#e5e7eb" : "var(--color-primary)",
            color: gpsLoading ? "#6b7280" : "white",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: gpsLoading ? "wait" : "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: 16 }}>{gpsLoading ? "\u23F3" : "\uD83D\uDCCD"}</span>
          {gpsLoading ? "Locatie bepalen..." : "Gebruik mijn locatie"}
        </button>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: showMap ? "#1e40af" : "#f3f4f6",
            color: showMap ? "white" : "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: 16 }}>{"\uD83D\uDDFA\uFE0F"}</span>
          {showMap ? "Kaart verbergen" : "Aanwijzen op kaart"}
        </button>
      </div>

      {gpsError && (
        <div style={{
          padding: "8px 12px",
          background: "#fef3c7",
          borderRadius: "var(--radius)",
          fontSize: 13,
          color: "#92400e",
          marginBottom: 12,
        }}>
          {gpsError}
        </div>
      )}

      {/* Interactive map */}
      {showMap && (
        <div style={{ marginBottom: 12 }}>
          <div
            ref={mapContainerRef}
            style={{
              height: 300,
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          />
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            Klik op de kaart om een locatie te kiezen. Het dichtstbijzijnde adres wordt automatisch opgezocht.
          </p>
        </div>
      )}

      {/* Text search */}
      <div className="form-group" style={{ position: "relative" }}>
        <label>Of zoek op adres</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="Begin te typen, bijv. Keizersgracht 1 Amsterdam"
          autoComplete="off"
          style={{
            borderColor: selected ? "#16a34a" : undefined,
          }}
        />
        {loading && (
          <span style={{ position: "absolute", right: 12, top: 38, fontSize: 12, color: "var(--color-text-muted)" }}>
            Zoeken...
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            listStyle: "none",
            margin: 0,
            padding: 0,
            zIndex: 1000,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => handleSuggestionSelect(s)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 14,
                borderBottom: "1px solid #f3f4f6",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              {s.weergavenaam}
            </li>
          ))}
        </ul>
      )}

      {/* Selected address confirmation */}
      {selected && (
        <p style={{ fontSize: 12, color: "#16a34a", marginTop: 4 }}>
          Adres geselecteerd uit BAG-register
        </p>
      )}
    </div>
  );
}

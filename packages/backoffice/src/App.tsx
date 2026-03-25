import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { setCurrentUser, type User } from "./lib/api";

// In MVP: user selector to simulate different roles
// In production: SSO via Amsterdam IAM
const DEMO_USERS: Array<{ id: string; naam: string; role: string }> = [];

export default function App() {
  const [users, setUsers] = useState<Array<{ id: string; naam: string; role: string }>>([]);
  const [currentUser, setUser] = useState<{ id: string; naam: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch users from API for demo login selector
  // In production: SSO via Amsterdam IAM
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSelectUser = (user: { id: string; naam: string; role: string }) => {
    setCurrentUser(user.id);
    setUser(user);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>THOR Platform laden...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, color: "var(--color-primary)", letterSpacing: 3 }}>THOR</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 4 }}>Toezicht en Handhaving Openbare Ruimte</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 2 }}>Gemeente Amsterdam</p>
        </div>
        <div className="card" style={{ width: 400, padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Selecteer gebruiker (demo)</h3>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
            In productie: inloggen via Amsterdam SSO (OpenID Connect)
          </p>
          {users.map((u) => (
            <button
              key={u.naam}
              onClick={() => handleSelectUser(u)}
              className="btn btn-secondary"
              style={{ width: "100%", marginBottom: 8, justifyContent: "space-between" }}
            >
              <span>{u.naam}</span>
              <span className="badge badge-status">{u.role}</span>
            </button>
          ))}
          {users.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Start eerst de API server en database (zie README)
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>THOR</h1>
          <p>Toezicht & Handhaving</p>
        </div>
        <nav>
          <NavLink to="/" end>Zaken</NavLink>
          <NavLink to="/zaken/nieuw">+ Nieuwe registratie</NavLink>
          <NavLink to="/werkvoorraad">Werkvoorraad</NavLink>
        </nav>
        <div className="sidebar-user" style={{ position: "absolute", bottom: 0, width: 260 }}>
          <div>{currentUser.naam}</div>
          <span className="role-badge">{currentUser.role}</span>
          <button
            onClick={() => { setUser(null); setCurrentUser(""); }}
            style={{ display: "block", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12 }}
          >
            Andere gebruiker
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

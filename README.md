# THOR Platform - Digitaal Platform Toezicht & Handhaving

MVP van een digitaal platform voor Toezicht en Handhaving Openbare Ruimte, gebaseerd op de aanbestedingsdocumenten van de Gemeente Amsterdam (THOR2030).

## Architectuur

Het platform volgt de **Common Ground 5-lagenarchitectuur** met strikte scheiding tussen AVG en WPG gegevens:

```
┌─────────────────────────────────────────────────────────┐
│  INTERACTIE      │ Backoffice (React)  │ Mobile PWA     │
├─────────────────────────────────────────────────────────┤
│  PROCES          │ Workflow Engine  │ Zaak Status Machine│
├─────────────────────────────────────────────────────────┤
│  CONNECTIVITEIT  │ API Gateway (Express) │ Auth/RBAC    │
├─────────────────────────────────────────────────────────┤
│  DIENSTEN        │ ZGW-style APIs   │ Audit Logging     │
├──────────────────┬──────────────────────────────────────┤
│  DATA            │ AVG Schema       │ WPG Schema        │
│  (PostgreSQL)    │ (bestuursrecht)  │ (strafrecht)      │
└──────────────────┴──────────────────────────────────────┘
```

### AVG/WPG Scheiding (kern van het ontwerp)

De **Wet politiegegevens (WPG)** vereist strikte scheiding van strafrechtelijke gegevens:

- **AVG schema**: Bestuursrechtelijke zaken (constateringen, bestuurlijke boetes, LoD, LoB)
- **WPG schema**: Strafrechtelijke zaken (combibonnen, processen-verbaal, aanhoudingen)
- **Separate audit trails**: WPG vereist logging van alle CRUD + verstrekkingen (art. 5)
- **Role-based access**: WPG-gegevens alleen toegankelijk voor geautoriseerde BOA's
- **Retentiebeleid**: Art.8 (1jr open, 5jr zoekbaar, 10jr vernietigen), Art.9 (actief tot uitspraak)
- **Verstrekkingen-log**: Bij elke gegevensdeling met externe partijen (politie, OM)

### Geimplementeerde eisen (referentie naar PvE)

| Ref | Omschrijving | Status |
|-----|-------------|--------|
| ALG-1 | Fiscaal/straf/bestuursrechtelijke processen | MVP |
| ALG-2 | Documentgenerator met sjablonen | Structuur |
| ALG-9 | Single Sign On | MVP (header-based, SSO-ready) |
| ALG-14 | Registratietypen | MVP |
| ALG-15 | Backoffice omgeving | MVP |
| WPG-1 | AVG/WPG workflow scheiding | MVP |
| WPG-2 | Wederzijds uitsluitende rollen | MVP |
| WPG-3 | Politiegegevens herkenbaar (labeling) | MVP |
| WPG-4 | Verstrekkingen-logging | MVP |
| WPG-5 | Audit logging van alle verwerkingen | MVP |
| WPG-10..16 | Retentieregels Art.8/9 | Structuur |
| TH-3 | Cautie-velden | MVP |
| TH-16 | Meerdere betrokkenen per zaak | MVP |
| TH-19 | Kwaliteitscontrole workflow | MVP |
| MA-3 | Werkopdrachten | MVP |
| PRIV-7 | Veld-niveau autorisatie | Structuur |
| PRIV-34 | Gescheiden database | MVP |

## Snel starten

### Vereisten
- Node.js >= 20
- Docker (voor PostgreSQL)
- npm

### Installatie

```bash
# Clone en installeer dependencies
cd thor-platform
npm install

# Start PostgreSQL
docker compose up -d postgres

# Database migraties uitvoeren
cd packages/api
npx prisma migrate dev --name init
npx prisma generate

# Database vullen met testdata
npx tsx src/db/seed.ts

# Start development servers
cd ../..
npm run dev
```

### Ontwikkelomgeving

| Service | URL |
|---------|-----|
| Backoffice | http://localhost:5173 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

## Projectstructuur

```
thor-platform/
├── packages/
│   ├── api/                    # Express API server
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema (AVG + WPG schemas)
│   │   └── src/
│   │       ├── routes/         # API endpoints
│   │       │   ├── zaken.ts    # Zaakregistratie (CRUD)
│   │       │   ├── workflow.ts # Workflow taken
│   │       │   └── werkopdrachten.ts
│   │       ├── middleware/
│   │       │   └── auth.ts     # Auth + WPG access control
│   │       ├── services/
│   │       │   └── audit.ts    # WPG-5 audit logging
│   │       └── db/
│   │           ├── client.ts   # Prisma client
│   │           └── seed.ts     # Test data
│   ├── backoffice/             # React SPA (Vite)
│   │   └── src/
│   │       ├── pages/          # Zaken, NieuweZaak, Detail, Werkvoorraad
│   │       └── lib/api.ts      # API client
│   └── shared/                 # Gedeelde types en constanten
│       └── src/index.ts        # Domain types, enums, access matrix
├── docker-compose.yml
└── README.md
```

## Roadmap (na MVP)

- [ ] Mobile PWA voor handhavers op straat
- [ ] MRZ/barcode scanning (TH-22)
- [ ] GIS kaartweergave met aandachtslocaties (MA-5)
- [ ] Koppeling met basisregistraties (BRP, RDW, KvK)
- [ ] Koppeling met SIG (Signalen Informatie Gemeenten)
- [ ] Documentgeneratie met sjablonen (ALG-2)
- [ ] Export naar CJIB/CVOM (TH-5) en Belastingen (TH-6)
- [ ] ZGW API-standaard implementatie (Arch-8)
- [ ] NOREA audit compliance (WPG-7)
- [ ] Koppeling Amsterdam IAM (OpenID Connect/SAML2)
- [ ] Data platform ontsluiting voor IGH dashboards

## Licentie

Dit project is open source ten behoeve van transparantie en hergebruik door andere gemeenten (Common Ground principes).

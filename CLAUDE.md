@AGENTS.md

# OpStap Dashboard — Claude Code instructies

## Project context
OpStap Dashboard is het interne admin-dashboard voor OpStap: beheer van steden,
provincies, venues, events, meeting areas, beheerders en rapporten.
Gebouwd door Pascal Wiersma via Pascal Services, Groningen.
Lanceringsdatum app: 1 augustus 2026.

## Repositories
- `opstap` — React Native app (iOS + Android)
- `opstap-dashboard` — Next.js admin dashboard (dit project)
- `opstap-website` — Next.js marketingwebsite (opstap.app)

## Branch strategie
- Werk altijd vanaf `develop`, nooit direct op `main`
- Branch prefix per type: `feature/`, `fix/`, `chore/`
- Maak altijd een pull request na afronding naar `develop`
- Uitzondering: website werkt vanaf `main`

## Versie beheer
- Geen eigen semver-versienummer; dit project volgt de `develop`/`main`-flow zonder
  build nummers of eas.json (dat is specifiek voor de mobiele app)

## Tech stack
- Framework: Next.js 16 (App Router), TypeScript — zie AGENTS.md, dit is niet de
  Next.js uit trainingsdata, controleer `node_modules/next/dist/docs/` bij twijfel
- Database: Supabase (Postgres, RLS) — zelfde project als de app
- Kaart: Mapbox GL JS + Mapbox GL Draw (zone-tekenen voor meeting areas)
- Auth: Supabase Auth (login + wachtwoord-instellen voor beheerders)
- Styling: Tailwind CSS v4
- Grafieken: Recharts
- Iconen: lucide-react

## Codestandaarden
- Gebruik altijd TypeScript, geen `any` types
- Controleer altijd met `npx tsc --noEmit` na wijzigingen
- Gebruik Nederlandse variabelenamen voor domein-specifieke concepten

## Supabase
- Gebruik altijd Supabase MCP voor database wijzigingen
- Maak migraties aan via `supabase/migrations/` in de `opstap` repo (gedeelde database,
  migraties horen niet thuis in de dashboard-repo)
- Zet RLS aan op elke nieuwe tabel
- Geen hardcoded UUIDs of API keys in de code
- Server-side Supabase-calls via `app/lib`, admin-only writes via `app/actions`

## Database-migraties
- Schema-wijzigingen ALTIJD via een migratiebestand in `supabase/migrations/` in de
  `opstap` repo, toegepast met `apply_migration` (Supabase MCP) of `supabase db push`
  — NOOIT via `execute_sql` of de dashboard SQL-editor. `execute_sql` alleen voor
  read-only checks/queries.
- Kolommen/tabellen droppen of hernoemen: nooit in één stap. Eerst nieuwe kolom
  toevoegen + vullen, code laten overschakelen, pas in een latere migratie de oude
  kolom droppen.
- Vóór een risicovolle migratie op productie (drop/rename/constraint-wijziging):
  vraag expliciet om bevestiging en wijs op een backup/point-in-time-recovery-check.
- Uitgebreide uitleg (waarom, omgevingen, backfill-aanpak): zie `WORKFLOW.md` in de
  `opstap` repo. Korte afvinklijst per release: zie `RELEASE-CHECKLIST.md` in de
  `opstap` repo.

## Branch- en releaseflow
- Feature-branches → PR naar `develop`. CI (typecheck, lint, tests) moet groen zijn
  vóór merge.
- `develop` → `main` alleen na handmatige bevestiging door Pascal, nooit automatisch.
- Na merge naar `main`: migraties op productie toepassen (zie regel hierboven, via de
  `opstap` repo), dan pas de dashboard-deploy.

## Wat NIET automatisch mag
- Geen directe schemawijzigingen op productie zonder migratiebestand.
- Geen merge naar `main` zonder expliciet akkoord.
- Geen debug-instellingen in gedeelde workflow-bestanden die de PR-branch laten
  afwijken van `develop` — dat triggert de ingebouwde workflow-validatiebeveiliging.

## Belangrijke bestanden
- `app/(dashboard)/steden/` — steden beheer
- `app/(dashboard)/provincies/` — provincies beheer
- `app/(dashboard)/venues/` — venue beheer
- `app/(dashboard)/events-beheer/` en `app/(dashboard)/events/` — events beheer
- `app/(dashboard)/meeting-areas/` — meeting area's en zones (kaart-gebaseerd)
- `app/(dashboard)/rapporten/` — gebruikersrapportages
- `app/(dashboard)/beheerders/` — beheerdersaccounts
- `app/(auth)/login/` en `app/(auth)/wachtwoord-instellen/` — beheerder-authenticatie

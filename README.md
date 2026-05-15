# Dash ◎

Dashboard multi-projets pour suivre les KPIs et objectifs en temps réel, sans backend.

**Live:** https://nadir-dna.github.io/dash

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4
- **Data:** Supabase (Amens) + TrailBase local (Sitevitrine) — requêtes directes navigateur, pas de cron, pas de backend intermédiaire
- **Deploy:** GitHub Pages

## Architecture

```
Browser (React)
 ├── Supabase (Amens)         — @supabase/supabase-js — anon key
 └── TrailBase local (Sitevitrine) — REST /api/records/v1
```

Plus de cron, plus de `metrics.json` statique, plus de backend. Le frontend interroge les sources de données directement.

## Installation

```bash
npm install
```

## Configuration

```bash
cp .env.example .env.local
```

Remplir les 3 variables dans `.env.local` :

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL Supabase Amens |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase Amens |
| `VITE_TRAILBASE_URL` | URL TrailBase locale (ex: `http://localhost:4000`) |

```bash
npm run dev
```

Ouvrir http://localhost:5173/dash/

## Projets affichés

| Projet | Source | Icône |
|--------|--------|-------|
| Amens | Supabase | 🧘 |
| Sitevitrine | TrailBase local | 🌐 |
| FlashCert | Placeholder (en attente) | 🎓 |

## Déploiement GitHub Pages

```bash
npm run deploy
```

## Fichiers legacy (non utilisés par le frontend)

Les scripts suivants sont conservés pour référence mais ne sont plus utilisés :
- `scripts/collect_metrics.py` — ancien collecteur Python
- `scripts/collect_adapted.py` — variante adaptée
- `scripts/collect_metrics_v2.py` — version avec Supabase Storage
- `scripts/cron_metrics.py` — wrapper cron
- `supabase/*.sql` — migrations SQL historiques
- `public/metrics.json` — fichier statique obsolète

Le frontend n'importe ni ne dépend d'aucun de ces fichiers.

## Fonctionnalités

- Métriques temps réel par projet
- KPIs avec barres de progression et objectifs
- Statuts visuels (✓ Actif, ○ En attente, ✗ Erreur)
- Vue d'ensemble multi-projets
- Rechargement automatique (60s)
- Retry indépendant par projet en cas d'erreur
- Responsive mobile-first

## Structure

```
dash/
├── src/
│   ├── App.tsx                   # Composant principal
│   ├── index.css                 # Design system + Tailwind
│   ├── main.tsx                  # Point d'entrée
│   └── lib/
│       ├── metrics.ts            # Fetchers + métriques par projet
│       ├── supabaseClient.ts     # Client Supabase (@supabase/supabase-js)
│       └── trailbaseClient.ts    # Client TrailBase REST
├── public/
│   └── 404.html                  # SPA routing
├── .env.example                  # Template variables d'env
├── index.html                    # Entry point
├── vite.config.ts               # Vite config + GitHub Pages base
└── README.md                     # Documentation
```

---

Développé par Nadir DNA

# Dash ◎

Dashboard multi-projets pour suivre les KPIs et objectifs en temps réel.

**Live Demo:** https://nadir-dna.github.io/dash

## Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Design:** Nothing Design (noir profond #0A0A0A + rouge #FF0000)
- **Mobile:** Mobile-first responsive
- **Deploy:** GitHub Pages

## Installation

```bash
npm install
npm run dev
```

## Déploiement GitHub Pages

```bash
# Build and deploy to GitHub Pages
npm run deploy
```

Le site sera disponible sur: https://nadir-dna.github.io/dash

## Architecture

```
GitHub Pages (frontend React)
    ↓ appels HTTP
Supabase (API + base de données)
    ↑ données
Cron job (browser-use scraping)
```

## Fonctionnalités

- Sélection de projet dynamique (7 projets)
- KPIs avec objectifs et écarts
- Statuts visuels (✅ ⚠️ ❌)
- Vue d'ensemble des réseaux sociaux
- Design minimaliste Nothing
- Responsive mobile-first

## Thème Nothing

### Couleurs

| Élément | Hex |
|---------|-----|
| Background | #0A0A0A |
| Text | #FFFFFF |
| Gray | #888888 |
| Red | #FF0000 |
| Border | #222222 |

### Typographie

- Titres: Montserrat Bold
- Corps: Inter

## Structure

```
dash/
├── src/
│   ├── App.tsx          # Composant principal
│   ├── App.css          # Styles spécifiques
│   ├── index.css        # Tailwind + thème Nothing
│   └── main.tsx         # Point d'entrée
├── public/
│   └── 404.html         # SPA routing
├── index.html           # Entry point
├── vite.config.ts      # Vite config + GitHub Pages base
└── README.md            # Documentation
```

## Prochaines Étapes

- [ ] Intégrer Supabase (API + DB)
- [ ] Connecter browser-use pour scraping
- [ ] Ajouter export PDF/Excel
- [ ] Configurer notifications Telegram
- [ ] Ajouter auth (si nécessaire)

---

Développé par Nadir DNA
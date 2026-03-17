# Northstar — Investor Portal Demo

A self-contained demo of the Northstar Development investor portal, built with React + Vite. Uses mock data that mirrors the structure you'd get from Supabase + Captable Inc. + MicroRealEstate in production.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
# → http://localhost:3000
```

## What's Included

| Page | Features |
|------|----------|
| **Overview** | NAV summary, performance chart (vs benchmark), distribution chart, property cards, recent messages |
| **Portfolio** | Property table with status, IRR, MOIC, progress. Click any row → detail view with construction updates |
| **Cap Table** | LP/GP breakdown, commitment vs called, ownership bars, distribution waterfall structure |
| **Documents** | Filterable document list with K-1s, PPMs, capital calls. Status badges for action-required items |
| **Distributions** | Full history table, YTD summary, next estimated distribution |
| **Messages** | LP ↔ GP messaging. Click to read, reply input (UI only in demo) |

## Architecture (Production)

This demo uses `src/data.js` as a mock data store. In production, replace with:

- **Supabase** → Auth, PostgreSQL database, file storage, realtime
- **Captable Inc.** → Cap table, e-signing, data rooms
- **MicroRealEstate** → Property operations, tenant data
- **Novu** → Multi-channel notifications
- **Stream Chat** → LP ↔ GP messaging

## Customization

- **Brand colors**: Edit `red`, `bg`, `surface` constants at top of `src/App.jsx`
- **Fonts**: Swap Google Fonts link in `index.html` and update `serif`/`sans` constants
- **Data**: Edit `src/data.js` to add properties, investors, documents

## Build for Production

```bash
npm run build    # outputs to /dist
npm run preview  # preview production build locally
```

## License

Demo code — use freely. Northstar Development branding is proprietary.

# Tree Survey Pro

A professional web application for certified arborists to conduct and document tree surveys according to Israeli Ministry of Agriculture standards.

Built entirely with Vanilla JavaScript — no framework, no build step, runs directly in the browser.

---

## Features

- **Multi-project management** with cloud sync (Supabase) and local auto-save (File System Access API)
- **600+ species database** with calibrated valuation coefficients (k-values, 2024 Ministry of Agriculture rates)
- **Government formula tree valuation**: `V = 20 × k × π × Σ(d²/4) × (health/5) × (location/5) × count`
- **Official Excel report export** using the Ministry of Agriculture template (SheetJS)
- **PDF summary reports** with full project data
- **Per-tree photo gallery** stored in IndexedDB (no size limit)
- **Subscription system** with coupon support and Supabase-backed user management
- **Admin panel** for managing users, registrations, prices, and coupons
- **RTL Hebrew UI** with full print support

---

## Architecture

Multi-module Vanilla JS with shared global scope (no bundler required):

```
tree-survey-demo/
├── index.html                  # Single-page app shell + all screens
├── css/
│   └── styles.css              # All styles, CSS variables, RTL, print
└── js/
    ├── app.js                  # Entry point — DOMContentLoaded, beforeunload
    ├── data/
    │   ├── SpeciesData.js      # Species DB, k-values, global state (loaded first)
    │   └── GovTemplate.js      # Base64-encoded government Excel template
    └── managers/
        ├── StorageManager.js   # localStorage + IndexedDB + Supabase layer
        ├── AuthManager.js      # Login, register, session, admin auth
        ├── ProjectManager.js   # Project CRUD, home screen, tabs
        ├── TreeManager.js      # Tree rows, undo/redo, Excel export
        ├── ImageManager.js     # Photo capture, gallery, overlay viewer
        ├── ReportManager.js    # Analysis charts, PDF report generation
        ├── BackupManager.js    # Auto-save to local folder (File System Access API)
        ├── AdminManager.js     # Admin panel — users, coupons, registrations
        └── UIController.js     # Shared UI helpers, autocomplete, modals
```

**Script load order matters** — each file shares the same global scope. `SpeciesData.js` (state + species DB) must load before any manager.

---

## Setup

### 1. Clone & open
```bash
git clone https://github.com/YOUR_USERNAME/tree-survey-pro.git
cd tree-survey-pro
# Open index.html in Chrome or Edge (Firefox lacks full File System Access API support)
```

### 2. Configure Supabase (optional — app works offline without it)

Create a project at [supabase.com](https://supabase.com) and create these tables:

```sql
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text,
  name text,
  role text default 'user',
  status text default 'active',
  plan text,
  expiry text,
  created text
);

-- Registrations table
create table registrations (
  id uuid primary key default gen_random_uuid(),
  username text, password text, name text,
  contact text, plan text, price text,
  coupon text, status text default 'pending',
  date text
);

-- Projects table
create table projects (
  username text primary key,
  data text
);
```

Then update `js/managers/StorageManager.js`:
```js
const SB_DEFAULT_URL = 'https://your-project.supabase.co';
const SB_DEFAULT_KEY = 'your-anon-key';
```

### 3. Set admin password

Generate a SHA-256 hash of your password at [emn178.github.io/online-tools/sha256.html](https://emn178.github.io/online-tools/sha256.html) and add it to `js/managers/AuthManager.js`:
```js
const ADMIN_PASS_HASHES = [
  'your-sha256-hash-here',
];
```

---

## Demo Note

This repository is a portfolio demo. The following are intentionally omitted:
- **Species database**: Shown with 15 representative entries (full version: 600+ species)
- **Government Excel template**: Proprietary Ministry of Agriculture file
- **Supabase credentials**: Configure your own project (see Setup above)
- **Admin password hashes**: Add your own (see Setup above)

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Frontend | Vanilla JavaScript (ES2020), HTML5, CSS3 |
| Cloud DB | [Supabase](https://supabase.com) (PostgreSQL via REST) |
| Local storage | localStorage + IndexedDB |
| Local file save | [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) |
| Excel export | [SheetJS (xlsx)](https://sheetjs.com/) |
| Auth | SHA-256 password hashing via Web Crypto API |

---

## License

Proprietary — source shared for portfolio purposes only. Not licensed for production use.

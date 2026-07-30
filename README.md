# O Melhor do Natal

A full-stack version of **O Melhor do Natal**, built with React and Vite on the frontend and Express with MySQL on the backend.

## Stack

### Frontend

| Technology / package | Purpose | Documentation | npm |
|---|---|---|---|
| React (`react`) | User interface | [react.dev](https://react.dev/) | [npm](https://www.npmjs.com/package/react) |
| React DOM (`react-dom`) | Browser rendering | [React DOM](https://react.dev/reference/react-dom) | [npm](https://www.npmjs.com/package/react-dom) |
| Vite (`vite`) | Development server and production build | [vite.dev](https://vite.dev/) | [npm](https://www.npmjs.com/package/vite) |
| React plugin for Vite (`@vitejs/plugin-react`) | React integration for Vite | [GitHub](https://github.com/vitejs/vite-plugin-react) | [npm](https://www.npmjs.com/package/@vitejs/plugin-react) |
| React Router (`react-router`) | Client-side routing | [reactrouter.com](https://reactrouter.com/) | [npm](https://www.npmjs.com/package/react-router) |
| Tailwind CSS (`tailwindcss`) | Utility-first CSS framework | [tailwindcss.com](https://tailwindcss.com/) | [npm](https://www.npmjs.com/package/tailwindcss) |
| Tailwind Vite plugin (`@tailwindcss/vite`) | Tailwind integration for Vite | [Vite guide](https://tailwindcss.com/docs/installation/using-vite) | [npm](https://www.npmjs.com/package/@tailwindcss/vite) |
| shadcn/ui (`shadcn`) | Customizable UI components | [ui.shadcn.com](https://ui.shadcn.com/) | [npm](https://www.npmjs.com/package/shadcn) |
| Base UI (`@base-ui/react`) | Accessible primitives used by the selected shadcn base | [base-ui.com](https://base-ui.com/react/overview/quick-start) | [npm](https://www.npmjs.com/package/@base-ui/react) |
| tw-animate-css (`tw-animate-css`) | Tailwind animation utilities | [GitHub](https://github.com/Wombosvideo/tw-animate-css) | [npm](https://www.npmjs.com/package/tw-animate-css) |
| Lucide React (`lucide-react`) | Icon library | [lucide.dev](https://lucide.dev/guide/packages/lucide-react) | [npm](https://www.npmjs.com/package/lucide-react) |
| Class Variance Authority (`class-variance-authority`) | Component variants | [cva.style](https://cva.style/docs) | [npm](https://www.npmjs.com/package/class-variance-authority) |
| clsx (`clsx`) | Conditional class names | [GitHub](https://github.com/lukeed/clsx) | [npm](https://www.npmjs.com/package/clsx) |
| tailwind-merge (`tailwind-merge`) | Tailwind class conflict resolution | [GitHub](https://github.com/dcastil/tailwind-merge) | [npm](https://www.npmjs.com/package/tailwind-merge) |

### Backend

| Technology / package | Purpose | Documentation | npm |
|---|---|---|---|
| MySQL2 (`mysql2`) | Promise-based MySQL connection pool | [GitHub](https://github.com/sidorares/node-mysql2) | [npm](https://www.npmjs.com/package/mysql2) |
| Express Session (`express-session`) | Server-side session middleware | [GitHub](https://github.com/expressjs/session) | [npm](https://www.npmjs.com/package/express-session) |
| Express MySQL Session (`express-mysql-session`) | MySQL-backed session storage | [GitHub](https://github.com/chill117/express-mysql-session) | [npm](https://www.npmjs.com/package/express-mysql-session) |
| Node.js | JavaScript runtime | [nodejs.org](https://nodejs.org/) | — |
| Express (`express`) | Backend HTTP server and API | [expressjs.com](https://expressjs.com/) | [npm](https://www.npmjs.com/package/express) |
| dotenv (`dotenv`) | Loads local development variables from `.env` | [GitHub](https://github.com/motdotla/dotenv) | [npm](https://www.npmjs.com/package/dotenv) |
| MySQL | Database server | [MySQL documentation](https://dev.mysql.com/doc/) | — |

### Development tools

| Technology / package | Purpose | Documentation | npm |
|---|---|---|---|
| ESLint (`eslint`) | JavaScript and React linting | [eslint.org](https://eslint.org/) | [npm](https://www.npmjs.com/package/eslint) |
| Prettier (`prettier`) | Code formatting | [prettier.io](https://prettier.io/) | [npm](https://www.npmjs.com/package/prettier) |

## Current project structure

```text
omdn/
├── public/
├── server/
│   └── server.js
├── src/
│   ├── assets/
│   ├── components/
│   │   └── ui/
│   │       └── button.jsx
│   ├── lib/
│   │   └── utils.js
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── dev/
│   │       └── DesignSystemPage.jsx
│   ├── router/
│   │   ├── AppRoutes.jsx
│   │   └── DevRoutes.jsx
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── components.json
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package.json
├── README.md
└── vite.config.js
```

## Installation

```bash
npm install
```

## Development

Start the Vite frontend:

```bash
npm run dev
```

Start the Express backend in a second terminal:

```bash
npm run dev:server
```

## Available scripts

```json
{
  "dev": "vite",
  "dev:server": "node --env-file=.env.development --watch server/server.js",
  "build": "vite build",
  "prestart": "npm run build",
  "start": "node server/server.js",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server |
| `npm run dev:server` | Loads `.env.development` and starts the Express backend with Node watch mode |
| `npm run build` | Creates the Vite production build in `dist` |
| `npm start` | Runs `prestart` and then starts the Express backend |
| `npm run lint` | Runs ESLint |
| `npm run preview` | Previews the Vite production build |

## Environment variables

The local `.env` file is for development only and must not be committed or deployed.

Production variables are configured directly in the hosting platform.

```text
.env          # local values, ignored by Git
.env.example  # variable names only, committed to Git
```

Do not place secrets in frontend variables. Vite variables prefixed with `VITE_` are included in the browser bundle.

## Routing

The project uses React Router.

The development-only design-system route is:

```text
/dev/design-system
```

Development routes are registered only when Vite is running in development mode.

## Backend and database structure

The backend extends the existing frontend structure without moving its files:

```text
server/
|-- database/
|   |-- migrations/
|   |   `-- 001_create_auth_tables.sql
|   `-- seeds/
|       `-- 001_seed_roles_permissions.sql
|-- dbConnect/
|   `-- createPool.js
|-- routes/
|   |-- adminRoutes.js
|   `-- apiRoutes.js
`-- server.js
```

- `server/server.js` creates the Express app, mounts routes, serves `dist/`, and provides the React Router fallback.
- `server/dbConnect/createPool.js` creates the promise-based MySQL connection pool.
- `server/routes/apiRoutes.js` contains the API health and test-items endpoints.
- `server/routes/adminRoutes.js` reserves the `/admin` namespace.
- `server/database/migrations/` contains schema changes for authentication, authorization, sessions, tokens, TOTP, recovery codes, and audit events.
- `server/database/seeds/` contains the initial roles, permissions, and role-permission assignments.

Run migrations before their corresponding seeds. These are explicit SQL files; there is currently no npm migration command.

### Backend routes

| Route | Purpose |
|---|---|
| `GET /api` | Returns the API health response |
| `GET /api/test-items` | Reads test items from MySQL |
| `/admin/*` | Reserved admin router; currently returns a JSON 404 |
| `/api/*` | Unknown API routes return a JSON 404 |

In production, Express serves the built frontend and sends `dist/index.html` for non-API routes so React Router can handle navigation.

## Design system

The interface uses:

- Tailwind CSS for layout and styling
- shadcn/ui for reusable components
- Base UI for accessible primitives
- Motion for animations
- Lucide React for icons

The design-system page is used to preview component variations, sizes, states, and usage examples during development.

## Color palette

| Name | Hex | OKLCH |
|---|---|---|
| Intense Cherry | `#c43a47` | `oklch(0.5553 0.1739 19.78)` |
| Wine Plum | `#843145` | `oklch(0.437 0.1151 8.38)` |
| Dark Slate Grey | `#204e4a` | `oklch(0.3906 0.0508 187.67)` |
| Pine Blue | `#3e6c67` | `oklch(0.4967 0.0514 186.79)` |
| Ocean Blue | `#3a8bc1` | `oklch(0.6111 0.1133 241.37)` |
| Baltic Blue | `#216182` | `oklch(0.4677 0.083 235.24)` |
| Dark Goldenrod | `#a28100` | `oklch(0.617 0.1261 90.65)` |
| Golden Bronze | `#cca300` | `oklch(0.732 0.1496 90.57)` |
| Pearl Beige | `#e7d6ba` | `oklch(0.8827 0.0418 80.3)` |
| Dust Grey | `#e2ddd5` | `oklch(0.8993 0.0121 79.78)` |

### CSS reference

```css
/* Reds */
--intense-cherry: oklch(0.5553 0.1739 19.78);
--wine-plum: oklch(0.437 0.1151 8.38);

/* Greens */
--dark-slate-grey: oklch(0.3906 0.0508 187.67);
--pine-blue: oklch(0.4967 0.0514 186.79);

/* Blues */
--ocean-blue: oklch(0.6111 0.1133 241.37);
--baltic-blue: oklch(0.4677 0.083 235.24);

/* Golds */
--dark-goldenrod: oklch(0.617 0.1261 90.65);
--golden-bronze: oklch(0.732 0.1496 90.57);

/* Neutrals */
--pearl-beige: oklch(0.8827 0.0418 80.3);
--dust-grey: oklch(0.8993 0.0121 79.78);
```

## Deployment

The project is intended to run on Hostinger as a Node.js application.

The Node.js entry point is:

```text
server/server.js
```

The frontend production files are generated with:

```bash
npm run build
```

When Hostinger runs `npm start`, the `prestart` script builds the Vite frontend before Express starts. If the platform invokes `server/server.js` directly, the frontend must be built separately by the deployment process.

Production environment variables are configured in Hostinger and are read by the backend through `process.env`.

# Amplify (frontend)

Amplify is an organizing platform for campaigns and community organizations. Organizations build target groups from the voter file and their own membership. They then run outreach activities on them, such as door canvassing, phonebanking, texting and petitions, and track the results in reports and campaign summaries. A hotline module handles incidents and rapid response.

This folder is the web client: an Angular 22 single-page app (NgModule-based, built with the `@angular/build` application builder), currently **version 3.8.0** (`src/environments/version.ts`). It talks to the Express/MongoDB API in [`ampbe_open`](https://github.com/ogiovanniruiz/ampbe_open).

## Requirements

- Node.js 24 and npm 11
- The Angular CLI. Install it globally (`npm install -g @angular/cli`), or prefix commands with `npx` (for example `npx ng serve`).
- A running `ampbe_open` server for the API, which defaults to `http://localhost:3000`.

## Development server

```bash
npm install

# In another terminal: start the API (nodemon, port 3000, reads .env.development)
cd ../ampbe_open && npm run devstart

# Start the client
ng serve        # or: npm start
```

Open `http://localhost:4200/`. The app reloads whenever you change a source file.

Development builds use `src/environments/environment.ts`, which points at the local API and shows a "Development" chip on the login screen. The service worker is off, so the "new version available" prompt never appears while you're developing.

## Build

```bash
ng build                                  # development build
ng build --configuration production       # production build
```

Both write to `dist/amplify/`.

The `production` configuration does three things:
- swaps in `src/environments/environment.prod.ts` (the production API and `https://amplifyvote.com`)
- turns on the service worker (`ngsw-config.json`)
- enforces the bundle budgets in `angular.json`

There is no `--prod` flag in current Angular; use `--configuration production` instead.

## Deploy

No hosting config ships with the repo; bring your own. The build output in `dist/amplify` is a static site, so any static host works. Configure it to:

- rewrite every path to `/index.html`
- serve `index.html`, `ngsw-worker.js`, `ngsw.json`, `safety-worker.js`, `worker-basic.min.js` and `manifest.webmanifest` with `Cache-Control: no-cache`, so open tabs pick up new builds
- serve the hashed bundles (`*-XXXXXXXX.js` / `.css`) with `Cache-Control: public, max-age=31536000, immutable`

Then, for each release:

1. Bump the version in **both** places, to the same value:
   - `src/environments/version.ts` (client)
   - `process.env.version` at the top of `ampbe_open/app.js` (server)
2. Build: `ng build --configuration production`
3. Deploy `dist/amplify` with your host's tool

**Why the versions must match:** on every protected route, `AuthGuard` sends the client version to `/api/checkVersion`. If it differs from the server's, the session is cleared and the user is sent back to log in. That keeps old clients from talking to a newer API, but if only one side is bumped, everyone gets logged out.

Tabs that are already open find the new build within about 15 minutes (`AppUpdateService`) and offer a reload.

## Configuration

| Field | Purpose |
|---|---|
| `production` | `true` only in the production build: Angular production mode, service worker on, real calling and texting. `false` in development: "Development" chip at login, calls and texts go to the test number, texting notifications skipped. |
| `API_URL` | Base URL of the `ampbe_open` API. The JWT is only ever sent to this origin. |
| `LOGO_DIR` | Logo shown on the login screen and in activities |

| File | Used by |
|---|---|
| `src/environments/environment.ts` | `ng serve` and `ng build` |
| `src/environments/environment.prod.ts` | `ng build --configuration production` |

## Features

Each area is a lazy-loaded route (`src/app/app-routing.module.ts`). All of them except `register` and `passwordreset` require login.

| Route | What it's for |
|---|---|
| `home` | Organizations and campaigns: create, edit and request them, manage users and permissions, billing, calling and texting number pools, and live election results |
| `campaignMap` | The campaign map: draw polygons and turfs, search addresses and voters, build target groups (group creator), manage surveys and nonresponse sets, campaign permissions and billing, and campaign summaries with raw contact data exports |
| `activity` | Create, edit, clone and complete activities. The **activity report** has stats, per-volunteer, survey and nonresponse tables, notes and CSV export. Its **Edit entries** dialog searches and corrects survey responses and nonresponses, keeping an edit history. Also texting templates and text responses. |
| `canvass` | Map-based door-to-door canvassing for volunteers: household surveys, nonresponses, and door reset |
| `phonebank` | Phonebanking through Twilio voice |
| `swCalling` | Phonebanking through SignalWire |
| `texting` | Peer-to-peer texting: initial messages, replies and survey capture |
| `petition` | Petition collection with optional voter-file checks |
| `membership` | Org membership: members, CSV uploads with voter matching and geocoding, tags, opt-ins and member history |
| `people` | Voter-file search |
| `hotline` | Incidents, alerts, responders and dispatch, with call and text intake |
| `register`, `passwordreset` | Sign-up and password recovery |

## Project structure

```
src/
├── app/
│   ├── components/      One folder per route above, each with its own module and dialogs/
│   ├── dialogs/         Shared dialogs: login, user profile, confirm, contact form, map, precincts
│   ├── services/        One HTTP service per API area (activity, campaign, canvass, contact records, groups, …)
│   ├── models/          TypeScript models for API data
│   ├── authguards/      AuthGuard: login check and client/server version check
│   ├── interceptors/    AuthInterceptor: adds the JWT to API requests
│   ├── pipes/           Date and birthdate formatting
│   ├── directives/      fitLabels (fits text in map labels)
│   ├── utils/           Map base layers and tooltips, billing, phone formatting, org levels, petition settings, loading timeouts
│   ├── styles/          dialog-common.scss: shared ge-* dialog styles used across components
│   └── material.module.ts   The Angular Material modules the app uses
├── styles/              Global SCSS partials, e.g. _activity-dialogs.scss (the shared ea-* dialog styles)
├── environments/        Environment files and version.ts
└── assets/              Images and static files
```

## Auth and sessions

- **Login:** logging in (locally or through OAuth) returns a JWT, which is kept in `sessionStorage` under `jwt`.
- **Requests:** `AuthInterceptor` adds `Authorization: Bearer <jwt>` to requests to `API_URL` only, never to third-party URLs.
- **Routes:** `AuthGuard` protects every route except `register` and `passwordreset`, and runs the version check described under [Deploy](#deploy).
- **Session state:** the current user, organization, campaign and activity are kept in `sessionStorage`, so each browser tab has its own session.

## Tests

```bash
ng test   # unit tests (Karma + Jasmine)
```

Tests run with Karma and Jasmine through `@angular/build:karma`. Coverage is light: there are only a handful of spec files (12), so most behaviour is checked by running the app.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`. New feature areas follow the existing pattern: a folder in `src/app/components/` with its own lazy-loaded module and route.

# Amplify (frontend)

Amplify is an organizing platform for campaigns and community organizations. Organizations build target groups from the voter file and their own membership. They then run outreach activities on them, such as door canvassing, phonebanking, texting and petitions, and track the results in reports and campaign summaries. A hotline module handles incidents and rapid response.

This folder is the web client: an Angular 16 single-page app, currently **version 3.8.0** (`src/environments/version.ts`). It talks to the Express/MongoDB API in [`../amp3server`](../amp3server).

## Requirements

- Node.js and npm
- The Angular CLI. Install it globally (`npm install -g @angular/cli`), or prefix commands with `npx` (for example `npx ng serve`).
- A running `amp3server` for the API, which defaults to `http://localhost:3000`.

## Development server

```bash
npm install

# In another terminal: start the API (nodemon, port 3000, reads .env.development)
cd ../amp3server && npm run devstart

# Start the client
ng serve        # or: npm start
```

Open `http://localhost:4200/`. The app reloads whenever you change a source file.

Development builds use `src/environments/environment.ts`, which points at the local API and shows a "Development" chip on the login screen. The service worker is off, so the "new version available" prompt never appears while you're developing.

## Build

```bash
ng build                                  # development build
ng build --configuration prodfirebase     # production build
```

Both write to `dist/amplify/`.

The `prodfirebase` configuration does three things:
- swaps in `src/environments/environment.prod.firebase.ts` (the production API and `https://amplifyvote.com`)
- turns on the service worker (`ngsw-config.json`)
- enforces the bundle budgets in `angular.json`

The old `--prod` flag no longer exists in Angular 16; use `--configuration prodfirebase` instead.

## Deploy

The client is hosted on Firebase Hosting (`firebase.json` serves `dist/amplify`, rewrites every path to `index.html`, and sends `index.html` and the service-worker files with no-cache headers).

1. Bump the version in **both** places, to the same value:
   - `src/environments/version.ts` (client)
   - the server's `version` environment variable (`amp3server`)
2. Build: `ng build --configuration prodfirebase`
3. Deploy: `npx firebase deploy --only hosting`

**Why the versions must match:** on every protected route, `AuthGuard` sends the client version to `/api/checkVersion`. If it differs from the server's, the session is cleared and the user is sent back to log in. That keeps old clients from talking to a newer API, but if only one side is bumped, everyone gets logged out.

Tabs that are already open find the new build within about 15 minutes (`AppUpdateService`) and offer a reload.

## Configuration

| Field | Purpose |
|---|---|
| `production` | Angular production mode |
| `API_URL` | Base URL of the `amp3server` API. The JWT is only ever sent to this origin. |
| `LOGO_DIR` | Logo shown on the login screen and in activities |
| `demoVersion` | Development mode: shows the "Development" chip at login and skips live texting notifications |

| File | Used by |
|---|---|
| `src/environments/environment.ts` | `ng serve` and `ng build` |
| `src/environments/environment.prod.firebase.ts` | `ng build --configuration prodfirebase` |

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
│   ├── utils/           Map base layers and tooltips, billing, phone formatting, org levels, petition settings
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

These come from the original project template. Only a few spec files exist and they may not be current, so treat a failing run as a sign the test needs updating rather than the app.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`. New feature areas follow the existing pattern: a folder in `src/app/components/` with its own lazy-loaded module and route.

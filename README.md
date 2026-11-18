# Nitya

**Build consistent habits, one day at a time.**

Nitya is a habit-tracking app for the web and Android. It brings daily habits, tasks, and goals into one place, with progress tracking and reminders.

## Features

- Organize habits, tasks, and goals from a daily overview.
- Track completions and review progress over time.
- Set per-habit reminders in the browser; browser reminders run while the app is open. Optional web push can deliver reminders in the background when configured.
- Opt into a separate daily 8 p.m. check-in notification on Android.
- After the first online load, queue supported changes to habits, tasks, and goals while offline and sync them when connectivity returns.
- Sign in, complete onboarding, and manage profile preferences.

## Technology

TypeScript · React · Vite · Tailwind CSS · Supabase · Capacitor · Android

## Run locally

### Requirements

- Node.js and npm
- A Supabase project

### Setup

1. Clone the repository and install its dependencies:

   ```sh
   git clone https://github.com/flam3z3122/Nitya.git
   cd Nitya
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase project values:

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   For web push notifications, set `VITE_VAPID_PUBLIC_KEY` to your public VAPID key. This is optional for the basic app.

3. Install and authenticate the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then link this checkout to your Supabase project and apply the versioned migrations:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push --remote
   ```

   Review the target project before confirming `db push`. It applies pending migrations from `supabase/migrations`.

4. Start the development server:

   ```sh
   npm run dev
   ```

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

## Android

The Android app is managed with Capacitor. With Android Studio and the Android SDK installed, sync the web app and open the native project:

```sh
npm run cap:sync
npm run cap:open
```

## Optional web push setup

Web push reminders require HTTPS, browser notification permission, a service worker, and server-side VAPID keys. Add the private key and public key as Supabase Edge Function secrets, then deploy the reminder function:

```sh
supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY
supabase functions deploy send-reminders
```

The app also needs the matching `VITE_VAPID_PUBLIC_KEY` in its web build. `VAPID_SUBJECT` and `CRON_SECRET` are optional function secrets; the function has a default subject, and accepts the configured cron secret for authorization. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. The repository does not configure a scheduler, so background reminders require an external scheduled invocation of `send-reminders`. Do not expose the private VAPID key in the web app.

The account deletion function can be deployed separately when needed:

```sh
supabase functions deploy delete-account
```

## Project layout

- `src/` — application screens, components, hooks, and data handling
- `supabase/migrations/` — database schema changes
- `supabase/functions/` — Supabase Edge Functions
- `android/` — native Android project

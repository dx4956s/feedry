# Feedry

Feedry is an Expo React Native news reader with a newspaper-style UI, unread-first home flow, RSS feed management, per-article read tracking, and an article-scoped AI chat overlay.

## Features

- Unread-first `Home` queue
- Full `Feed` view with `All`, `Unread`, and `Read` filtering
- User-managed RSS feed list stored in Supabase
- `Curated` feed tab backed by a shared Supabase table
- Read status persisted locally with `AsyncStorage`
- OpenAI article chat persisted locally per article
- Profile and settings screen with locally stored OpenAI API key

## Stack

- Expo 54
- React Native 0.81
- TypeScript
- NativeWind
- Supabase Auth + Postgres
- `fast-xml-parser` for RSS/Atom parsing
- `react-native-reanimated`
- Zustand

## App Config

Main Expo config lives in [app.config.ts](./app.config.ts).

Important assets:

- App icon: `assets/icon.png`
- Android adaptive icon: `assets/adaptive-icon.png`
- Splash: `assets/splash.png`
- Web favicon: `assets/favicon.png`

If icons or splash do not update on device, rebuild the native app:

```bash
npx expo prebuild
cd android && ./gradlew clean
cd ..
npx expo run:android
```

## Environment

Feedry expects these Expo public env vars:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

They are read in [lib/supabase.ts](./lib/supabase.ts).

## Install

```bash
npm install
```

## Run

```bash
npm run start
npm run android
npm run ios
```

## Lint / Format

```bash
npm run lint
npm run format
```

## Supabase

Migrations live in [supabase/migrations](./supabase/migrations).

Current migrations:

- [20260419_create_profiles_and_rss_feeds.sql](./supabase/migrations/20260419_create_profiles_and_rss_feeds.sql)
- [20260421_create_authors_curated_feeds.sql](./supabase/migrations/20260421_create_authors_curated_feeds.sql)

Apply them with:

```bash
supabase db push
```

### Tables

`profiles`

- user profile data

`rss_feeds`

- user-owned RSS feeds
- columns include `title`, `url`, `category`, `user_id`

`authors_curated_feeds`

- shared curated feed list for authenticated users to browse
- columns include `title`, `url`, `category`
- rows from this table can be copied into a user’s `rss_feeds` list from the `Curated` tab

### Adding curated feeds manually

In Supabase `Table Editor`, open `authors_curated_feeds` and insert rows with:

- `title`
- `url`
- `category`

Example:

- `title`: `TechCrunch`
- `url`: `https://techcrunch.com/feed/`
- `category`: `Tech`

## Auth Flow

Feedry currently uses a single email/password flow:

1. Try sign-in
2. If the user does not exist, prompt to create the account
3. If confirmed, sign up with the same email/password

Supabase email confirmation behavior depends on your project settings. If email confirmation is enabled, new users may need to confirm their address before they can sign in fully.

## OpenAI

The OpenAI API key is entered in Settings and stored locally on device only.

Current behavior:

- the AI button is only usable when a key is present
- AI chat is scoped to the current article
- chat history is saved locally per article
- state is cleared when switching to another article

Important: this app currently calls OpenAI directly from the client using the user-provided key. Use a restricted project key for this setup.

## Storage Behavior

Local storage:

- Supabase auth session: `AsyncStorage`
- Read article state: `AsyncStorage`
- Per-article AI chat history: `AsyncStorage`
- OpenAI API key: `SecureStore`

## Notes

- RSS and Atom parsing is done with `fast-xml-parser`
- Feed summaries are best-effort and depend on what the source feed exposes
- Android builds are safest on JDK 17

## Repository Hygiene

Commit Supabase migrations to git.

Do not commit:

- `.env` secrets
- private API keys
- Supabase service role keys

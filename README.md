# Jukebox

A personal YouTube party jukebox. One device plays music; anyone with the link can search, queue songs and play / pause / skip from their phone.

- `index.html`: guest page (search, paste a link, queue, controls). This is what the QR code opens.
- `host.html`: host page with the YouTube player. Open it on the device connected to the speaker.

Static files only: GitHub Pages hosts them, Firestore syncs the queue in realtime, the YouTube IFrame Player plays, and the YouTube Data API searches. There is no server and no build step.

## How it works

```
Guest (index.html) ──► Firestore: jukebox/state + jukebox/state/queue ──► Host (host.html)
  add songs, play/pause/skip                                         takes the next song, plays it,
                                                                     publishes now-playing
```

- Guests add queue docs and write a `cmd` (`play` / `pause` / `skip`) on `jukebox/state`.
- Only the host removes songs from the queue, so guests never race each other.
- Search results are cached in `searches/{query}` for 24 h to save quota.

## Setup

### 1. Firebase (realtime state, free Spark plan)

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Firestore Database → Create database** (production mode, any region).
3. **Rules** tab → paste [`firestore.rules`](firestore.rules) → Publish. Don't use "test mode": its rules expire after 30 days.
4. **Project settings → Your apps → Add app → Web**. Copy `apiKey`, `authDomain`, `projectId` and `appId` into `firebaseConfig` in [`config.js`](config.js). If you named the database, set `firestoreDatabaseId` to that name; otherwise use `(default)`. Rules are per database, so publish them on the one you use.

### 2. YouTube Data API key (search, optional)

1. In <https://console.cloud.google.com>, select the same project (Firebase projects are Google Cloud projects).
2. **APIs & Services → Library → YouTube Data API v3 → Enable**.
3. **Credentials → Create credentials → API key**, then edit the key:
   - **Application restrictions → Websites:** `https://daohoangson.github.io/*` (add `http://localhost:*/*` for local testing)
   - **API restrictions → Restrict key → YouTube Data API v3**
4. Put it in `YT_API_KEY` in [`config.js`](config.js).

The default quota is 10,000 units a day and needs no approval. That's about **98 searches a day** (100 units per search plus 1 for durations), with cached repeats free. Without a key, guests can still paste YouTube links.

### 3. GitHub Pages

Push to `main`, then go to **Settings → Pages → Deploy from a branch → `main` / root**. The site goes live at <https://daohoangson.github.io/jukebox/>.

## Running the party

1. On the host device, open `https://daohoangson.github.io/jukebox/host.html` and tap **Start party**.
2. Guests scan the QR code on the host page, or open the site root.

For the host device:
- Use **Chrome, logged in to YouTube Premium, in a normal tab with third-party cookies allowed**. Then the embedded player shows no ads. Incognito, or blocked third-party cookies, means ads.
- **Keep the screen on.** Embedded YouTube stops when the screen turns off or the tab is hidden. The page requests a screen wake lock; a plugged-in laptop, tablet or TV browser works best.
- Videos that can't be embedded are skipped automatically, with a notice shown to guests.

## Local development

Pages served from `localhost` use the local Firestore emulator, so testing never touches the live queue. You don't need a Firebase project for this. Add `?live` to the URL (e.g. `host.html?live`) to test against the real project instead. The YouTube search key needs `http://localhost:8000/*` in its allowed websites.

```bash
npx firebase-tools emulators:start --only firestore --project demo-jukebox
```

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/host.html> and <http://localhost:8000/> in two tabs. The emulator needs Java; firebase-tools 15+ will require Java 21.

## Known limits

- Single global room, open rules: anyone with the URL can queue or skip. A PIN is the easy upgrade if that's ever a problem.
- Some music videos block embedding. Search filters them out (`videoEmbeddable=true`); pasted ones get skipped.
- Queue order is first-come-first-served by server timestamp.

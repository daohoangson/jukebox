# Jukebox

Family-scale party jukebox: everyone is in the same room or car, trusts each other, and the owner controls the host. See `README.md` for setup and how it works.

## Principles

- Choose the smallest, simplest fix. Add infrastructure (device IDs, heartbeats, host leases, offline states, fairness, auth, servers, build steps) only when the owner asks.
- Keep the host screen to the player, now-playing card and queue.
- Design both pages for phones, used one-handed; the host scales up to tablets, laptops and TVs.

## Rules

- Play YouTube only through the official IFrame player, kept visible.
- Firebase is on the Blaze plan: keep usage within the free tier and ask before adding billed services.
- Keep search quota-friendly: embeddable-only, on submit, cached.

## Testing

- Click Start party with a real click (autoplay needs a gesture), and run one started host tab at a time.
- The Python server lets browsers cache modules: `fetch(url, {cache: 'reload'})` edited files before reloading.

## Git

Commit and push only when asked; pushing to `main` deploys the live site.

import { YT_API_KEY } from './config.js';
import { searchesRef, doc, getDoc, setDoc } from './firebase.js';

export const $ = (sel) => document.querySelector(sel);

/** Create an element; text is always set via textContent, so titles can't inject HTML. */
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
}

/**
 * One toast at a time: a new one replaces the current one instead of stacking on top of it.
 * Toasts go into one persistent live region, so screen readers announce each of them.
 * Pass `action` ({ label, onclick }) for an inline button such as Undo; such toasts stay a bit longer.
 */
let toastTimer;
export function toast(text, action) {
  let region = document.querySelector('#toasts');
  if (!region) {
    region = el('div', { id: 'toasts', className: 'toasts', role: 'status' });
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const button = action && el('button', {
    type: 'button', className: 'toast-action', textContent: action.label,
    onclick: () => { region.replaceChildren(); action.onclick(); },
  });
  region.replaceChildren(el('div', { className: 'toast' }, el('span', { textContent: text }), button));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => region.replaceChildren(), action ? 6000 : 3500);
}

export function youtubeId(input) {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Title + thumbnail for a pasted link, via oEmbed (no API key, no quota). */
export async function songFromLink(videoId) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const meta = await fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!meta) return null; // 401/404 = private, removed, or embedding disabled
  return {
    videoId,
    title: meta.title,
    channel: meta.author_name || '',
    thumb: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    duration: null,
  };
}

const decodeEntities = (s) => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent;

function isoToSeconds(iso) {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null;
}

export function formatDuration(sec) {
  if (sec == null) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : m;
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export const searchEnabled = Boolean(YT_API_KEY);
const CACHE_MS = 24 * 3600 * 1000;

/**
 * YouTube Data API search (100 units) + durations (1 unit), embeddable videos only.
 * Results are cached in Firestore for a day so repeated queries cost nothing.
 */
export async function search(query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100);
  const cacheRef = doc(searchesRef, encodeURIComponent(q));
  const cached = await getDoc(cacheRef).catch(() => null);
  if (cached?.exists() && Date.now() - cached.data().at < CACHE_MS) return cached.data().results;

  const api = (path, params) =>
    fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key: YT_API_KEY })}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error?.message || `YouTube API error ${r.status}`);
        return body;
      });

  const found = await api('search', {
    part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '10', q,
  });
  // type=video isn't always honored (channels can slip in), so keep real videos only
  const items = found.items.filter((i) => i.id?.videoId);
  const ids = items.map((i) => i.id.videoId);
  const details = ids.length ? await api('videos', { part: 'contentDetails', id: ids.join(',') }) : { items: [] };
  const durations = Object.fromEntries(details.items.map((v) => [v.id, isoToSeconds(v.contentDetails.duration)]));

  const results = items.map((i) => ({
    videoId: i.id.videoId,
    title: decodeEntities(i.snippet.title),
    channel: decodeEntities(i.snippet.channelTitle),
    thumb: i.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`,
    duration: durations[i.id.videoId] ?? null,
  }));
  // Caching is best-effort; setDoc can also throw synchronously on bad data
  try { setDoc(cacheRef, { results, at: Date.now() }).catch(() => {}); } catch {}
  return results;
}

const ICONS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  skip: 'M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z',
  music: 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z',
};

/** Inline SVG icon (static paths only, so innerHTML is safe here). */
export function icon(name) {
  const span = el('span', { className: 'icon' });
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${ICONS[name]}"/></svg>`;
  return span;
}

/** Icon-only button with an accessible label. */
export function iconButton(name, label, props = {}) {
  const b = el('button', { type: 'button', className: 'icon-btn', title: label, ...props }, icon(name));
  b.setAttribute('aria-label', label);
  return b;
}

/** Swap a button's icon (e.g. play ↔ pause). */
export function setIcon(button, name, label) {
  button.replaceChildren(icon(name));
  button.title = label;
  button.setAttribute('aria-label', label);
}

/** Use a song's thumbnail as ambient light behind `node` (see `--art` in style.css). */
export function setArt(node, thumb) {
  node.classList.toggle('has-art', Boolean(thumb));
  if (thumb) node.style.setProperty('--art', `url(${JSON.stringify(thumb)})`);
  else node.style.removeProperty('--art');
}

/** Three bouncing bars: shows at a glance whether music is playing (they rest when paused). */
export function equalizer() {
  const eq = el('span', { className: 'eq' }, el('i'), el('i'), el('i'));
  eq.setAttribute('aria-hidden', 'true');
  return eq;
}

/** Placeholder rows shown while search results load, shaped like real rows so nothing jumps. */
export function skeletonRows(count) {
  return Array.from({ length: count }, () => el('li', { className: 'song skeleton' },
    el('span', { className: 'thumb' }),
    el('div', { className: 'info' }, el('span', { className: 'line' }), el('span', { className: 'line short' })),
  ));
}

/** Shared row renderer for queue / search results. */
export function songRow(song, { meta, action, position } = {}) {
  return el('li', { className: 'song' },
    position != null ? el('span', { className: 'pos', textContent: position }) : null,
    el('img', { src: song.thumb, alt: '', loading: 'lazy' }),
    el('div', { className: 'info' },
      el('div', { className: 'title', textContent: song.title }),
      el('div', { className: 'meta', textContent: meta ?? [song.channel, formatDuration(song.duration)].filter(Boolean).join(' · ') }),
    ),
    action,
  );
}

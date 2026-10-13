import { YT_API_KEY } from './config.js';
import { searchesRef, doc, getDoc, setDoc } from './firebase.js';

export const $ = (sel) => document.querySelector(sel);

/** Create an element; text is always set via textContent, so titles can't inject HTML. */
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c != null));
  return node;
}

export function toast(text) {
  const t = el('div', { className: 'toast', textContent: text });
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
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
  const ids = found.items.map((i) => i.id.videoId);
  const details = ids.length ? await api('videos', { part: 'contentDetails', id: ids.join(',') }) : { items: [] };
  const durations = Object.fromEntries(details.items.map((v) => [v.id, isoToSeconds(v.contentDetails.duration)]));

  const results = found.items.map((i) => ({
    videoId: i.id.videoId,
    title: decodeEntities(i.snippet.title),
    channel: decodeEntities(i.snippet.channelTitle),
    thumb: i.snippet.thumbnails.medium?.url || i.snippet.thumbnails.default?.url,
    duration: durations[i.id.videoId] ?? null,
  }));
  setDoc(cacheRef, { results, at: Date.now() }).catch(() => {});
  return results;
}

/** Shared row renderer for queue / search results. */
export function songRow(song, { meta, action } = {}) {
  return el('li', { className: 'song' },
    el('img', { src: song.thumb, alt: '', loading: 'lazy' }),
    el('div', { className: 'info' },
      el('div', { className: 'title', textContent: song.title }),
      el('div', { className: 'meta', textContent: meta ?? [song.channel, formatDuration(song.duration)].filter(Boolean).join(' · ') }),
    ),
    action,
  );
}

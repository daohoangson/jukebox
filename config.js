// Fill these in after creating your Firebase project and Google Cloud API key (see README.md).
// Both values are public by design: they end up in the browser anyway.

// Firebase console → Project settings → Your apps → Web app → SDK config
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};

// Google Cloud console → APIs & Services → Credentials → API key
// Restrict it to: HTTP referrers https://<user>.github.io/* and the YouTube Data API v3 only.
// Leave empty to disable search (pasting YouTube links still works).
export const YT_API_KEY = '';

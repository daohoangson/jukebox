// Fill these in after creating your Firebase project and Google Cloud API key (see README.md).
// Both values are public by design: they end up in the browser anyway.

// Firebase console → Project settings → Your apps → Web app → SDK config
export const firebaseConfig = {
  apiKey: "AIzaSyBX_jTIbXCBugIwXudLk8TwOykrw1yxkn8",
  authDomain: "jukebox-by-mrpaint.firebaseapp.com",
  projectId: "jukebox-by-mrpaint",
  appId: "1:578549453198:web:c09bed7cbb33dfdc74d4df",
};

// Firestore database ID (Firestore Database page). Use '(default)' if you didn't name it.
export const firestoreDatabaseId = "jukebox";

// Google Cloud console → APIs & Services → Credentials → API key
// Restrict it to: HTTP referrers https://<user>.github.io/* and the YouTube Data API v3 only.
// Leave empty to disable search (pasting YouTube links still works).
export const YT_API_KEY = "AIzaSyDQEIpOGnjDXJtRH_3jXzt1hbrEe4fh_AQ";

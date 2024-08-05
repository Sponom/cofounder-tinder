/* eslint-disable no-restricted-globals */
import { initializeApp } from 'firebase/app';
import { getAuth, getIdToken } from 'firebase/auth';
import { getInstallations, getToken } from 'firebase/installations';

// this is set during install
let firebaseConfig;

async function getAuthIdToken(auth) {
  await auth.authStateReady();
  if (!auth.currentUser) return;

  // eslint-disable-next-line consistent-return
  return getIdToken(auth.currentUser);
}

async function fetchWithFirebaseHeaders(request) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const installations = getInstallations(app);
  const headers = new Headers(request.headers);
  const [authIdToken, installationToken] = await Promise.all([
    getAuthIdToken(auth),
    getToken(installations),
  ]);
  headers.append('Firebase-Instance-ID-Token', installationToken);
  if (authIdToken) headers.append('Authorization', `Bearer ${authIdToken}`);
  const newRequest = new Request(request, { headers });
  return fetch(newRequest);
}

self.addEventListener('install', () => {
  // extract firebase config from query string
  const serializedFirebaseConfig = new URL(location).searchParams.get(
    'firebaseConfig',
  );

  if (!serializedFirebaseConfig) {
    throw new Error(
      'Firebase Config object not found in service worker query string.',
    );
  }

  firebaseConfig = JSON.parse(serializedFirebaseConfig);
  console.log('Service worker installed with Firebase config', firebaseConfig);
});

self.addEventListener('fetch', (event) => {
  const { origin } = new URL(event.request.url);
  if (origin !== self.location.origin) return;
  event.respondWith(fetchWithFirebaseHeaders(event.request));
});

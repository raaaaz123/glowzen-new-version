/**
 * Collection and document paths, with no Firebase import of their own.
 *
 * The client SDK and the Admin SDK both need these names, and importing
 * `lib/firebase/firestore` from a route handler would pull the *browser*
 * Firestore SDK into the server bundle. Keeping the strings here means the
 * webhook and the app can never drift onto two different collections.
 */

/** The web app is namespaced away from the mobile app's `glowface_*` data. */
export const WEB_NAMESPACE = "glowzen_web";

export const collections = {
  users: `${WEB_NAMESPACE}_users`,
} as const;

export const paths = {
  user: (uid: string) => `${collections.users}/${uid}`,
  analyses: (uid: string) => `${collections.users}/${uid}/analyses`,
  analysis: (uid: string, id: string) => `${collections.users}/${uid}/analyses/${id}`,
  plan: (uid: string) => `${collections.users}/${uid}/state/plan`,
  progress: (uid: string) => `${collections.users}/${uid}/state/progress`,
  previews: (uid: string) => `${collections.users}/${uid}/state/previews`,
} as const;

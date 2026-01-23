/**
 * @bayit/firebase-config
 *
 * Shared Firebase configuration package for Bayit+ ecosystem.
 * Prevents configuration duplication across web, mobile, and partner platforms.
 *
 * @example
 * ```typescript
 * import { getFirebaseConfig } from '@bayit/firebase-config';
 * import { initializeApp } from 'firebase/app';
 *
 * const firebaseConfig = getFirebaseConfig();
 * const app = initializeApp(firebaseConfig);
 * ```
 *
 * @packageDocumentation
 */

export {
  getFirebaseConfig,
  getFirebaseConfigWithOverrides,
  type FirebaseConfig,
} from './config';

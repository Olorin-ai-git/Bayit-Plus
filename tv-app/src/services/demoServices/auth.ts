/**
 * DEMO-ONLY: Demo authentication service.
 * Not used in production.
 */

import { demoUser } from '../../demo';
import { delay } from './delay';

export const demoAuthService = {
  login: async (email: string, password: string) => {
    await delay();
    return { user: demoUser, token: 'demo-token-12345' };
  },
  register: async (userData: { email: string; name: string; password: string }) => {
    await delay();
    return { user: { ...demoUser, ...userData }, token: 'demo-token-12345' };
  },
  me: async () => {
    await delay();
    return demoUser;
  },
  getGoogleAuthUrl: async () => {
    await delay();
    return { url: '#demo-google-auth' };
  },
  googleCallback: async (code: string) => {
    await delay();
    return { user: demoUser, token: 'demo-token-google' };
  },
};

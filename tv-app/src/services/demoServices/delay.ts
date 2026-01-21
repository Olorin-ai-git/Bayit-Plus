/**
 * DEMO-ONLY: Simulates network delay for demo mode.
 * Not used in production.
 */

import { config } from '../../config/appConfig';

export const delay = (ms: number = config.mock.delay): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

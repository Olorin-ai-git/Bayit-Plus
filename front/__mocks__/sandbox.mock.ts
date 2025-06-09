/**
 * This file is used for the sandbox object mocks for the `yarn serve` command
 * It can also double as sandbox mocks for jest and other tests
 * Any unmocked functions are noops by default when doing local server development
 */

import {
  CustomerInteraction,
  Profiler,
  TrackingEvent,
} from '@appfabric/sandbox-spec';

/* eslint-disable no-console */
export default {
  logger: {
    // Since we need this for the server, we ignore

    log: (message: string) => console.log(message),
    error: (message: string) => console.log(message),
  },
  performance: {
    record: (instance: Profiler | CustomerInteraction) => console.log(instance),
    createProfiler: (profilerName: string) => ({
      start: () => console.log(profilerName),
      mark: (markName: string) => console.log(markName),
      measure: (fromMark: string) => console.log(fromMark),
      end: (captureName: string) => console.log(captureName),
    }),
    createCustomerInteraction: (interactionName: string) => ({
      fail: () => console.log(interactionName),
      success: () => console.log(interactionName),
    }),
  },
  analytics: {
    track: (trackingEvent: TrackingEvent) => console.log(trackingEvent),
  },
};
/* eslint-enable no-console */

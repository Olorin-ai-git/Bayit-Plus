import { mock } from 'ts-mockito';
import { Sandbox, SandboxPubsub } from '@appfabric/sandbox-spec';

export const mockSandbox = () => {
  const sandbox = mock<Sandbox>();
  const pubsub = mock<SandboxPubsub>();

  Object.defineProperty(sandbox, 'pubsub', {
    get: () => ({
      publish: jest.fn(),
      publishSync: jest.fn(),
      subscribe: jest.fn(),
      once: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      getSubscribers: jest.fn(),
      getTopics: jest.fn(),
      clearSandboxSubscriptions: jest.fn(),
      clearContextSubscriptions: jest.fn(),
      debug: jest.fn(),
      remote: {
        publish: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    }),
  });

  Object.defineProperty(sandbox, 'logger', {
    get: () => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      logException: jest.fn(),
      isLevelDebug: jest.fn(),
      isLevelLog: jest.fn(),
      isLevelInfo: jest.fn(),
      isLevelWarn: jest.fn(),
      isLevelError: jest.fn(),
      isLevelFatal: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }),
  });

  Object.defineProperty(sandbox, 'appContext', {
    get: () => ({
      getEnvironment: jest.fn().mockReturnValue('local'),
      getAppInfo: jest.fn(),
      getLocalizationInfo: jest.fn(),
      getUserAuthInfo: jest.fn(),
      getUserAuth: jest.fn(),
      getPlatformInfo: jest.fn(),
      getRealmInfo: jest.fn(),
      getRealm: jest.fn(),
      getUserProfileInfo: jest.fn(),
      getUserProfile: jest.fn(),
    }),
  });

  return sandbox;
};

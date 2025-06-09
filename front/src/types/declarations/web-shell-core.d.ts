// src/types/web-shell-core.d.ts
declare module '@appfabric/web-shell-core' {
  export interface Sandbox {
    logger: any;
    navigation: any;
    performance: any;
    analytics: any;
    appContext: any;
    experiments: any;
    featureFlags: any;
    pubsub: any;
    storage: any;
    user: any;
    config: any;
    i18n: any;
  }
}

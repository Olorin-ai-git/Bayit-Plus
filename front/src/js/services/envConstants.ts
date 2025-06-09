import { RestClient } from '@appfabric/ui-data-layer/client';
import type { Sandbox } from '@appfabric/sandbox-spec';

type RestClientConstructorConfig = ConstructorParameters<typeof RestClient>[0];

interface RestClientConfig extends RestClientConstructorConfig {
  sandbox: Sandbox;
}

export type StaticRestClientConfig = Omit<RestClientConfig, 'sandbox'>;

type Service = 'gaia';

const ENVIRONMENTS: Record<string, Record<Service, StaticRestClientConfig>> = {
  local: {
    gaia: {
      baseUrl: 'https://gaia-e2e.api.intuit.com',
    },
  },
  qa: {
    gaia: {
      baseUrl: 'https://gaia-qal.api.intuit.com',
    },
  },
  e2e: {
    gaia: {
      baseUrl: 'https://gaia-e2e.api.intuit.com',
    },
  },
  prod: {
    gaia: {
      baseUrl: 'https://gaia.api.intuit.com',
    },
  },
};

/**
 * get environment config
 * @param {string} environment : environment
 * @returns {RestClientConfig} envConfig
 */
const getEnvConfigData = (
  environment: string,
): Record<Service, StaticRestClientConfig> => ENVIRONMENTS[environment];

/**
 * get environment
 * @param {Sandbox} sandbox : sandbox
 * @param {Service} service : service
 * @returns {RestClientConfig} environment
 */
const getEnvConfig = (sandbox: Sandbox, service: Service): RestClientConfig => {
  /* istanbul ignore next */
  const pluginConfigEnvironment: string = <string>(
    sandbox?.appContext?.getEnvironment()
  );

  return {
    ...getEnvConfigData(pluginConfigEnvironment)[service],
    sandbox,
    pluginId: sandbox?.pluginConfig?.id,
  };
};

export { getEnvConfig, getEnvConfigData };

export type { RestClientConfig };

import type { SandboxPerformance } from '@appfabric/sandbox-spec';
import type { RestClientConfig } from 'src/js/services/envConstants';
import WithRUMInteractionName from './WithRUMInteractionName';
import { RUM_FCI_START_REQUEST } from './constants';

/**
 * A function to call on the start of the RestService request
 * @param {SandboxPerformance} performance The sandbox performance API
 * @returns {function} The expected onRequestStart function
 */
const onRequestStart = (
  performance: SandboxPerformance,
): NonNullable<RestClientConfig['onRequestStart']> =>
  function onRequestStartFn(this: WithRUMInteractionName, action) {
    const interaction = performance.createCustomerInteraction(
      this.getRUMInteractionName(action),
    );
    interaction.mark(RUM_FCI_START_REQUEST);
  };

export default onRequestStart;

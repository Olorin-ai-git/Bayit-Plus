import type { SandboxPerformance } from '@appfabric/sandbox-spec';
import type { RestClientConfig } from 'src/js/services/envConstants';
import WithRUMInteractionName from 'src/js/services/restService/WithRUMInteractionName';
import {
  RUM_FCI_END_REQUEST,
  RUM_FCI_START_REQUEST,
  RUM_FCI_DEFAULT_FAILURE_MESSAGE,
} from './constants';

/**
 * A function to call on the start of the RestService request
 * @param {SandboxPerformance} performance The sandbox performance API
 * @returns {function} The expected onRequestStart function
 */
const onRequestEnd = (
  performance: SandboxPerformance,
): NonNullable<RestClientConfig['onRequestEnd']> =>
  function onRequestStartFn(this: WithRUMInteractionName, action, metadata) {
    const interaction = performance.getCustomerInteraction(
      this.getRUMInteractionName(action),
    );
    if (interaction) {
      interaction.measure(RUM_FCI_START_REQUEST, RUM_FCI_END_REQUEST);
      if (metadata.x === 'p') {
        interaction.success();
      } else {
        interaction.fail(
          metadata.ert
            ? `${RUM_FCI_DEFAULT_FAILURE_MESSAGE}: ${metadata.ert}`
            : RUM_FCI_DEFAULT_FAILURE_MESSAGE,
        );
      }
      performance.record(interaction);
    }
  };

export default onRequestEnd;

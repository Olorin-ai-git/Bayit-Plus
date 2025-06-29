import type { RestClientConfig } from '../envConstants';
import WithRUMInteractionName from './WithRUMInteractionName';
import {
  RUM_FCI_END_REQUEST,
  RUM_FCI_START_REQUEST,
  RUM_FCI_DEFAULT_FAILURE_MESSAGE,
} from './constants';

/**
 * A function to call on the end of the RestService request
 * @returns {function} The expected onRequestEnd function
 */
const onRequestEnd = (): NonNullable<RestClientConfig['onRequestEnd']> =>
  function onRequestEndFn(this: WithRUMInteractionName, action: string, metadata: { x: string; ert?: string }) {
    // Simplified version without performance tracking
    const interactionName = this.getRUMInteractionName(action);
    if (metadata.x === 'p') {
      console.log(`[RUM] Request succeeded: ${interactionName}`);
    } else {
      console.log(`[RUM] Request failed: ${interactionName} - ${metadata.ert || RUM_FCI_DEFAULT_FAILURE_MESSAGE}`);
    }
  };

export default onRequestEnd;

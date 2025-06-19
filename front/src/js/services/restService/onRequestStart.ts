import type { RestClientConfig } from '../envConstants';
import WithRUMInteractionName from './WithRUMInteractionName';
import { RUM_FCI_START_REQUEST } from './constants';

/**
 * A function to call on the start of the RestService request
 * @returns {function} The expected onRequestStart function
 */
const onRequestStart = (): NonNullable<RestClientConfig['onRequestStart']> =>
  function onRequestStartFn(this: WithRUMInteractionName, action: string) {
    // Simplified version without performance tracking
    console.log(`[RUM] Starting request: ${this.getRUMInteractionName(action)}`);
  };

export default onRequestStart;

/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-unused-vars */

export const RUM_FCI_START_REQUEST = 'begin outbound request';
export const RUM_FCI_END_REQUEST = 'end outbound request';
export const RUM_FCI_DEFAULT_FAILURE_MESSAGE = 'outbound request failed';

interface RUMInteractionMeta {
  name: string;
  failureMessage?: string;
}

interface RUMWrapperFn {
  (
    asyncFn: () => Promise<Response>,
    interactionMetadata: RUMInteractionMeta,
  ): Promise<Response>;
}

/**
 * Simple performance tracker without AppFabric dependencies
 */
interface SimplePerformance {
  createCustomerInteraction: (name: string) => SimpleInteraction;
  record: (interaction: SimpleInteraction) => void;
}

interface SimpleInteraction {
  mark: (name: string) => void;
  measure: (startMark: string, endMark: string) => void;
  success: () => void;
  fail: (message: string) => void;
}

/**
 * Simple implementation of performance tracking
 */
const createSimplePerformance = (): SimplePerformance => ({
  createCustomerInteraction: (name: string) => ({
    mark: (markName: string) => {
      console.debug(`[Performance] Mark: ${markName} for ${name}`);
    },
    measure: (startMark: string, endMark: string) => {
      console.debug(`[Performance] Measure: ${startMark} to ${endMark} for ${name}`);
    },
    success: () => {
      console.debug(`[Performance] Success: ${name}`);
    },
    fail: (message: string) => {
      console.debug(`[Performance] Fail: ${name} - ${message}`);
    },
  }),
  record: (interaction: SimpleInteraction) => {
    console.debug('[Performance] Recording interaction');
  },
});

/**
 * Wraps custom fetch calls with simple performance tracking
 *
 * @param {SimplePerformance} performance the performance API
 * @returns {function} returns a wrapper function to wrap fetch calls
 */
const fetchFCIWrapper =
  (performance?: SimplePerformance): RUMWrapperFn =>
  async (fetchRequest, interactionMetadata) => {
    const perf = performance || createSimplePerformance();
    const interaction = perf.createCustomerInteraction(
      interactionMetadata.name,
    );
    interaction.mark(RUM_FCI_START_REQUEST);
    let resp: Response;
    let error: unknown;
    let success = true;

    try {
      resp = await fetchRequest();
      success = resp.status >= 200 && resp.status < 300;
    } catch (err) {
      error = err;
      success = false;
    }

    interaction.measure(RUM_FCI_START_REQUEST, RUM_FCI_END_REQUEST);

    if (success) {
      interaction.success();
    } else {
      interaction.fail(
        interactionMetadata.failureMessage || RUM_FCI_DEFAULT_FAILURE_MESSAGE,
      );
    }

    perf.record(interaction);

    if (error) throw error;

    // @ts-ignore
    return resp;
  };

export default fetchFCIWrapper;

export {};

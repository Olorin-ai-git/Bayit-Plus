/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-unused-vars */
import type { SandboxPerformance } from '@appfabric/sandbox-spec';

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
 * Wraps custom fetch calls with RUM FCI
 *
 * @param {SandboxPerformance} performance the sandbox performance API
 * @returns {function} returns a wrapper function to wrap fetch calls
 */
const fetchFCIWrapper =
  (performance: SandboxPerformance): RUMWrapperFn =>
  async (fetchRequest, interactionMetadata) => {
    const interaction = performance.createCustomerInteraction(
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

    performance.record(interaction);

    if (error) throw error;

    // @ts-ignore
    return resp;
  };

export default fetchFCIWrapper;

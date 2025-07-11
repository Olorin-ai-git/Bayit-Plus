/* eslint-disable */
/* eslint-disable no-unused-vars */

export const RUM_FCI_START_REQUEST = 'begin outbound request';
export const RUM_FCI_END_REQUEST = 'end outbound request';
export const RUM_FCI_DEFAULT_FAILURE_MESSAGE = 'Request failed';

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
 * Wraps custom fetch calls with simplified logging
 *
 * @returns {function} returns a wrapper function to wrap fetch calls
 */
const fetchFCIWrapper =
  (): RUMWrapperFn => async (fetchRequest, interactionMetadata) => {
    console.log(`[RUM] Starting: ${interactionMetadata.name}`);
    let resp: Response;
    let error: unknown;
    let success = true;

    try {
      resp = await fetchRequest();
      success = resp.status >= 200 && resp.status < 300;
      if (success) {
        console.log(`[RUM] Success: ${interactionMetadata.name}`);
      } else {
        console.log(
          `[RUM] Failed: ${interactionMetadata.name} - ${
            interactionMetadata.failureMessage ||
            RUM_FCI_DEFAULT_FAILURE_MESSAGE
          }`,
        );
      }
      return resp;
    } catch (err) {
      error = err;
      success = false;
      console.log(
        `[RUM] Failed: ${interactionMetadata.name} - ${
          interactionMetadata.failureMessage || RUM_FCI_DEFAULT_FAILURE_MESSAGE
        }`,
      );
      throw error;
    }
  };

export default fetchFCIWrapper;

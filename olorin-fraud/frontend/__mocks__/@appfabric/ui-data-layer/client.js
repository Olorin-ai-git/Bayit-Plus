/**
 * Mock RestClient for testing.
 */
class RestClient {
  static AuthConstants = { BROWSER_AUTH: 'browser_auth' };

  /**
   * Mock GET method
   * @returns {Promise<{ok: boolean, status: number, json: Function, text: Function}>}
   */
  static get() {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    });
  }

  /**
   * Mock POST method
   * @returns {Promise<{ok: boolean, status: number, json: Function, text: Function}>}
   */
  static post() {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    });
  }
}

module.exports = { RestClient };

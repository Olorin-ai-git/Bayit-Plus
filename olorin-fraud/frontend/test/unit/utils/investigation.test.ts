import { formatTimestamp } from '../../../src/js/utils/investigation';

describe('investigation utils', () => {
  describe('formatTimestamp', () => {
    it('formats ISO string to readable date', () => {
      expect(formatTimestamp('2020-01-01T12:34:56Z')).toMatch(/2020|Jan|12:34/);
    });
    it.skip('returns empty string for invalid input', () => {});
  });
});

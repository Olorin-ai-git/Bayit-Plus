import { api } from '../api';
import { clearCache, getFeatureFlags, isFeatureEnabled } from '../featureFlags';

jest.mock('../api', () => ({ api: { get: jest.fn() } }));
beforeEach(() => { clearCache(); jest.clearAllMocks(); });

it('uses the centralized relative URL and already decoded flag body', async () => {
  const flags = { scene_search: false, new_player: true };
  (api.get as jest.Mock).mockResolvedValue(flags);
  expect(await getFeatureFlags()).toEqual(flags);
  expect(api.get).toHaveBeenCalledWith('/admin/settings/feature-flags/public');
  expect(await isFeatureEnabled('scene_search')).toBe(false);
  expect(api.get).toHaveBeenCalledTimes(1);
});

it('returns retained decoded flags if a refresh fails', async () => {
  const flags = { scene_search: false };
  (api.get as jest.Mock).mockResolvedValue(flags);
  const time = jest.spyOn(Date, 'now').mockReturnValue(1);
  await getFeatureFlags();
  time.mockReturnValue(Number.MAX_SAFE_INTEGER);
  (api.get as jest.Mock).mockRejectedValue(new Error('unavailable'));
  expect(await getFeatureFlags()).toEqual(flags);
  time.mockRestore();
});

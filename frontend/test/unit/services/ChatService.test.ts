import {
  saveComment,
  fetchCommentMessages,
  fetchCommentLog,
} from '../../../src/js/services/ChatService';

const mockMessage = {
  sender: 'Investigator',
  text: 'Test message',
  timestamp: Date.now(),
};

describe('CommentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('saveComment', () => {
    it('saves a comment successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      const res = await saveComment('INV-1', 'user1', 'user_id', mockMessage);
      expect(res).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        '/investigation/INV-1/comment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ...mockMessage,
            entity_id: 'user1',
            entity_type: 'user_id',
          }),
        }),
      );
    });

    it('throws if saving fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(
        saveComment('INV-1', 'user1', 'user_id', mockMessage),
      ).rejects.toThrow('Failed to save comment');
    });
  });

  describe('fetchCommentMessages', () => {
    it('fetches comment messages successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMessage],
      });
      const res = await fetchCommentMessages('INV-1');
      expect(res).toEqual([mockMessage]);
      expect(fetch).toHaveBeenCalledWith('/investigation/INV-1/comment');
    });

    it('throws if fetching fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(fetchCommentMessages('INV-1')).rejects.toThrow(
        'Failed to fetch comment messages',
      );
    });
  });

  describe('fetchCommentLog', () => {
    it('fetches comment log successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockMessage],
      });
      const res = await fetchCommentLog('INV-1', 'Investigator');
      expect(res).toEqual([mockMessage]);
      expect(fetch).toHaveBeenCalledWith(
        '/investigation/INV-1/comment?sender=Investigator',
      );
    });

    it('throws if fetching fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      await expect(fetchCommentLog('INV-1', 'Policy Team')).rejects.toThrow(
        'Failed to fetch comment log',
      );
    });

    it('returns mock data for Investigator', async () => {
      const res = await fetchCommentLog('mock', 'Investigator');
      expect(res[0].sender).toBe('Investigator');
    });

    it('returns mock data for Policy Team', async () => {
      const res = await fetchCommentLog('mock', 'Policy Team');
      expect(res[0].sender).toBe('Policy Team');
    });
  });
});

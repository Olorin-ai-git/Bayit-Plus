/**
 * Unit tests for useComprehensionQuiz hook
 *
 * Tests API interactions for fetching questions and submitting answers.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComprehensionQuiz } from '../useComprehensionQuiz';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;

describe('useComprehensionQuiz', () => {
  const mockQuestion = {
    question_id: 'q-123',
    question_text: 'מה קרה בסצנה?',
    options: ['א', 'ב', 'ג', 'ד'],
    scene_start_time: 100,
    scene_end_time: 200,
    difficulty: 'medium',
    points: 10,
  };

  const mockSubmitResult = {
    is_correct: true,
    explanation: 'הסבר נכון',
    points_earned: 10,
    credits_deducted: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches question successfully', async () => {
    mockApi.get.mockResolvedValue(mockQuestion);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.question).toBeNull();

    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.question).toEqual(mockQuestion);
      expect(result.current.error).toBeNull();
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/v1/comprehension/test-content/question',
      { params: { scene_start: 100, scene_end: 200, language: 'he' } }
    );
  });

  test('handles fetch question error (403 insufficient credits)', async () => {
    mockApi.get.mockRejectedValue({
      response: { status: 403 },
    });

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.question).toBeNull();
      expect(result.current.error).toBe('Insufficient credits');
    });
  });

  test('handles fetch question error (generic)', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load question');
    });
  });

  test('submits answer successfully', async () => {
    mockApi.post.mockResolvedValue(mockSubmitResult);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    let submitResult;
    await act(async () => {
      submitResult = await result.current.submitAnswer('q-123', 0, 5000);
    });

    expect(submitResult).toEqual(mockSubmitResult);
    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/comprehension/questions/q-123/submit',
      { selected_option: 0, time_taken_ms: 5000 }
    );
  });

  test('handles submit answer error', async () => {
    mockApi.post.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    await expect(
      result.current.submitAnswer('q-123', 0, 5000)
    ).rejects.toThrow('Server error');
  });

  test('clearQuestion resets state', async () => {
    mockApi.get.mockResolvedValue(mockQuestion);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    // Fetch question
    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.question).not.toBeNull();
    });

    // Clear question
    act(() => {
      result.current.clearQuestion();
    });

    expect(result.current.question).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('sets loading state during fetch', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApi.get.mockReturnValue(promise as any);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    act(() => {
      result.current.fetchQuestion(100, 200, 'he');
    });

    // Loading should be true while fetching
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!(mockQuestion);
      await promise;
    });

    // Loading should be false after fetch completes
    expect(result.current.isLoading).toBe(false);
  });

  test('defaults to Hebrew language if not specified', async () => {
    mockApi.get.mockResolvedValue(mockQuestion);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    await act(async () => {
      await result.current.fetchQuestion(100, 200); // No language specified
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/v1/comprehension/test-content/question',
      { params: { scene_start: 100, scene_end: 200, language: 'he' } }
    );
  });

  test('supports English language parameter', async () => {
    mockApi.get.mockResolvedValue({
      ...mockQuestion,
      question_text: 'What happened in the scene?',
    });

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'en');
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/v1/comprehension/test-content/question',
      { params: { scene_start: 100, scene_end: 200, language: 'en' } }
    );
  });

  test('handles multiple consecutive fetches', async () => {
    mockApi.get
      .mockResolvedValueOnce(mockQuestion)
      .mockResolvedValueOnce({
        ...mockQuestion,
        question_id: 'q-456',
        question_text: 'שאלה אחרת?',
      });

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    // First fetch
    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.question?.question_id).toBe('q-123');
    });

    // Second fetch
    await act(async () => {
      await result.current.fetchQuestion(300, 400, 'he');
    });

    await waitFor(() => {
      expect(result.current.question?.question_id).toBe('q-456');
    });

    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  test('clears error on successful fetch after previous error', async () => {
    mockApi.get
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(mockQuestion);

    const { result } = renderHook(() => useComprehensionQuiz('test-content'));

    // First fetch - error
    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load question');
    });

    // Second fetch - success
    await act(async () => {
      await result.current.fetchQuestion(100, 200, 'he');
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.question).toEqual(mockQuestion);
    });
  });
});

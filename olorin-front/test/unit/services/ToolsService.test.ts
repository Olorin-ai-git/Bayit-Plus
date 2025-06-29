import { fetchAvailableTools, getDefaultTools } from 'src/js/services/ToolsService';

// Mock fetch globally
global.fetch = jest.fn();

describe('ToolsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAvailableTools', () => {
    it('should fetch and format tools correctly', async () => {
      const mockTools = [
        { name: 'splunk_query_tool', description: 'Splunk tool', category: 'olorin' },
        { name: 'identity_info_tool', description: 'OII tool', category: 'olorin' },
        { name: 'di_tool', description: 'DI tool', category: 'olorin' },
        { name: 'data_lake_tool', description: 'Data Lake tool', category: 'olorin' },
        { name: 'vector_search', description: 'Vector search', category: 'search' },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTools,
      } as Response);

      const result = await fetchAvailableTools();

      expect(fetch).toHaveBeenCalledWith('/api/mcp/tools');
      expect(result).toEqual(['DI BB', 'DATA LAKE', 'OII', 'Splunk', 'Vector Search']);
    });

    it('should handle API errors and return fallback tools', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('API Error')
      );

      const result = await fetchAvailableTools();

      expect(result).toEqual(['Splunk', 'OII', 'DI BB', 'DATA LAKE']);
    });

    it('should handle HTTP errors and return fallback tools', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await fetchAvailableTools();

      expect(result).toEqual(['Splunk', 'OII', 'DI BB', 'DATA LAKE']);
    });

    it('should remove duplicates and sort tools', async () => {
      const mockTools = [
        { name: 'splunk_query_tool', description: 'Splunk tool', category: 'olorin' },
        { name: 'splunk_search_tool', description: 'Another Splunk tool', category: 'olorin' },
        { name: 'identity_info_tool', description: 'OII tool', category: 'olorin' },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTools,
      } as Response);

      const result = await fetchAvailableTools();

      // Should have only one "Splunk" entry despite two splunk tools
      expect(result).toEqual(['OII', 'Splunk']);
      expect(result.filter(tool => tool === 'Splunk')).toHaveLength(1);
    });
  });

  describe('getDefaultTools', () => {
    it('should return the default tools list', () => {
      const result = getDefaultTools();
      expect(result).toEqual(['Splunk', 'OII', 'DI BB', 'DATA LAKE']);
    });
  });
}); 
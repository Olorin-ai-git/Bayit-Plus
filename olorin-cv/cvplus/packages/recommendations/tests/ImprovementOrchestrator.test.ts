import { ImprovementOrchestrator } from '../ImprovementOrchestrator';
import { RecommendationOrchestrator } from '../RecommendationOrchestrator';
import { ActionOrchestrator } from '../ActionOrchestrator';

// Mock the orchestrators
jest.mock('../RecommendationOrchestrator');
jest.mock('../ActionOrchestrator');

describe('ImprovementOrchestrator', () => {
  let orchestrator: ImprovementOrchestrator;
  let mockRecommendationOrchestrator: jest.Mocked<RecommendationOrchestrator>;
  let mockActionOrchestrator: jest.Mocked<ActionOrchestrator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    orchestrator = new ImprovementOrchestrator();
    
    // Get the mocked instances
    mockRecommendationOrchestrator = (orchestrator as any).recommendationOrchestrator;
    mockActionOrchestrator = (orchestrator as any).actionOrchestrator;
  });

  describe('generateRecommendations', () => {
    it('should delegate to RecommendationOrchestrator', async () => {
      const mockResult = { success: true, data: { recommendations: [] } };
      mockRecommendationOrchestrator.generateRecommendations.mockResolvedValue(mockResult);

      const result = await orchestrator.generateRecommendations(
        'job-123', 'user-456', 'Software Engineer', ['React', 'Node.js'], false
      );

      expect(mockRecommendationOrchestrator.generateRecommendations).toHaveBeenCalledWith(
        'job-123', 'user-456', 'Software Engineer', ['React', 'Node.js'], false
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle errors from RecommendationOrchestrator', async () => {
      const error = new Error('Generation failed');
      mockRecommendationOrchestrator.generateRecommendations.mockRejectedValue(error);

      await expect(orchestrator.generateRecommendations('job-123', 'user-456'))
        .rejects.toThrow('Generation failed');
    });
  });

  describe('applySelectedRecommendations', () => {
    it('should delegate to ActionOrchestrator', async () => {
      const mockResult = { success: true, data: { appliedRecommendations: [] } };
      mockActionOrchestrator.applySelectedRecommendations.mockResolvedValue(mockResult);

      const result = await orchestrator.applySelectedRecommendations(
        'job-123', 'user-456', ['rec-1', 'rec-2'], 'Developer', ['JavaScript']
      );

      expect(mockActionOrchestrator.applySelectedRecommendations).toHaveBeenCalledWith(
        'job-123', 'user-456', ['rec-1', 'rec-2'], 'Developer', ['JavaScript']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle errors from ActionOrchestrator', async () => {
      const error = new Error('Application failed');
      mockActionOrchestrator.applySelectedRecommendations.mockRejectedValue(error);

      await expect(orchestrator.applySelectedRecommendations('job-123', 'user-456', ['rec-1']))
        .rejects.toThrow('Application failed');
    });
  });

  describe('previewRecommendation', () => {
    it('should delegate to ActionOrchestrator', async () => {
      const mockResult = { success: true, data: { preview: 'preview-data' } };
      mockActionOrchestrator.previewRecommendation.mockResolvedValue(mockResult);

      const result = await orchestrator.previewRecommendation('job-123', 'user-456', 'rec-1');

      expect(mockActionOrchestrator.previewRecommendation).toHaveBeenCalledWith(
        'job-123', 'user-456', 'rec-1'
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('customizePlaceholders', () => {
    it('should delegate to ActionOrchestrator', async () => {
      const mockResult = { success: true, data: { customizedContent: 'content' } };
      mockActionOrchestrator.customizePlaceholders.mockResolvedValue(mockResult);

      const placeholders = { name: 'John Doe', role: 'Developer' };
      const result = await orchestrator.customizePlaceholders('job-123', 'user-456', 'rec-1', placeholders);

      expect(mockActionOrchestrator.customizePlaceholders).toHaveBeenCalledWith(
        'job-123', 'user-456', 'rec-1', placeholders
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getProcessingStatus', () => {
    it('should delegate to ActionOrchestrator', async () => {
      const mockResult = { status: 'processing', progress: 50 };
      mockActionOrchestrator.getProcessingStatus.mockResolvedValue(mockResult);

      const result = await orchestrator.getProcessingStatus('job-123', 'user-456');

      expect(mockActionOrchestrator.getProcessingStatus).toHaveBeenCalledWith('job-123', 'user-456');
      expect(result).toEqual(mockResult);
    });
  });

  describe('validateBatchRecommendations', () => {
    it('should delegate to ActionOrchestrator', async () => {
      const mockResult = { valid: [], invalid: [], missing: [] };
      mockActionOrchestrator.validateBatchRecommendations.mockResolvedValue(mockResult);

      const result = await orchestrator.validateBatchRecommendations('job-123', 'user-456', ['rec-1', 'rec-2']);

      expect(mockActionOrchestrator.validateBatchRecommendations).toHaveBeenCalledWith(
        'job-123', 'user-456', ['rec-1', 'rec-2']
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('monitoring methods', () => {
    describe('clearActiveRequests', () => {
      it('should delegate to RecommendationOrchestrator', () => {
        orchestrator.clearActiveRequests();
        expect(mockRecommendationOrchestrator.clearActiveRequests).toHaveBeenCalled();
      });
    });

    describe('getActiveRequestCount', () => {
      it('should delegate to RecommendationOrchestrator', () => {
        mockRecommendationOrchestrator.getActiveRequestCount.mockReturnValue(5);
        
        const result = orchestrator.getActiveRequestCount();
        
        expect(mockRecommendationOrchestrator.getActiveRequestCount).toHaveBeenCalled();
        expect(result).toBe(5);
      });
    });

    describe('getActiveRequestKeys', () => {
      it('should delegate to RecommendationOrchestrator', () => {
        const mockKeys = ['key-1', 'key-2'];
        mockRecommendationOrchestrator.getActiveRequestKeys.mockReturnValue(mockKeys);
        
        const result = orchestrator.getActiveRequestKeys();
        
        expect(mockRecommendationOrchestrator.getActiveRequestKeys).toHaveBeenCalled();
        expect(result).toEqual(mockKeys);
      });
    });

    describe('forceCleanupRequest', () => {
      it('should delegate to RecommendationOrchestrator', () => {
        mockRecommendationOrchestrator.forceCleanupRequest.mockReturnValue(true);
        
        const result = orchestrator.forceCleanupRequest('request-key');
        
        expect(mockRecommendationOrchestrator.forceCleanupRequest).toHaveBeenCalledWith('request-key');
        expect(result).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from sub-orchestrators', async () => {
      const error = new Error('Orchestrator error');
      mockRecommendationOrchestrator.generateRecommendations.mockRejectedValue(error);

      await expect(orchestrator.generateRecommendations('job-123', 'user-456'))
        .rejects.toThrow('Orchestrator error');
    });

    it('should handle undefined parameters gracefully', async () => {
      const mockResult = { success: true, data: {} };
      mockRecommendationOrchestrator.generateRecommendations.mockResolvedValue(mockResult);

      await expect(orchestrator.generateRecommendations('job-123', 'user-456'))
        .resolves.toEqual(mockResult);
        
      expect(mockRecommendationOrchestrator.generateRecommendations)
        .toHaveBeenCalledWith('job-123', 'user-456', undefined, undefined, undefined);
    });
  });

  describe('integration', () => {
    it('should maintain separation of concerns between orchestrators', () => {
      // Verify that the main orchestrator doesn't contain business logic
      // and properly delegates to specialized orchestrators
      
      expect(orchestrator).toHaveProperty('recommendationOrchestrator');
      expect(orchestrator).toHaveProperty('actionOrchestrator');
      
      // Verify orchestrator instances are created
      expect(RecommendationOrchestrator).toHaveBeenCalledTimes(1);
      expect(ActionOrchestrator).toHaveBeenCalledTimes(1);
    });
  });
});
// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ProfileService } from '../ProfileService';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, getDocs } from 'firebase/firestore';

// Import service types
import {
  ProfileTemplate,
  ProfileOptions,
  ViewData,
  EngagementData,
  PrivacySettings,
  QROptions,
  EmbedOptions,
  DateRange,
  ProfileUpdate
} from '../../types/service.types';

// Import profile types
import { PublicProfileData } from '../../../types/profile.types';

// Mock Firebase modules - already set up in setupTests.ts
const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

// Mock data
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com'
};

const mockProfileData: PublicProfileData = {
  id: 'profile-123',
  userId: 'test-user-123',
  name: 'John Doe',
  title: 'Software Engineer',
  bio: 'Passionate software engineer with 5+ years of experience',
  location: 'San Francisco, CA',
  profileImage: 'https://example.com/profile.jpg',
  experience: [],
  education: [],
  skills: [],
  portfolio: [],
  contact: {
    email: 'john@example.com',
    preferredContactMethod: 'email',
    availability: 'Available for opportunities'
  },
  privacy: {
    level: 'public',
    allowSearch: true,
    showContactInfo: true,
    showSocialLinks: true,
    allowDownload: true,
    allowSharing: true
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  status: 'published',
  slug: 'john-doe-software-engineer',
  views: 0,
  template: 'professional'
};

const mockTemplate: ProfileTemplate = {
  id: 'template-1',
  name: 'Professional',
  description: 'Clean and professional template',
  category: 'professional',
  preview: 'https://example.com/preview.jpg',
  thumbnails: ['https://example.com/thumb1.jpg'],
  features: ['Responsive', 'SEO Optimized'],
  customizationOptions: [],
  pricing: { free: true, premiumRequired: false },
  metadata: {
    author: 'CVPlus',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
    downloads: 1000,
    rating: 4.8,
    reviews: 50,
    tags: ['professional', 'clean']
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockCallableFunction: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup Firebase mocks
    mockCallableFunction = jest.fn();
    mockHttpsCallable.mockReturnValue(mockCallableFunction);

    mockGetAuth.mockReturnValue({
      currentUser: mockUser
    } as any);

    mockGetFirestore.mockReturnValue({} as any);

    // Create service instance
    profileService = new ProfileService();
  });

  afterEach(() => {
    profileService.clearAllCache();
  });

  describe('Profile Management', () => {
    describe('createProfile', () => {
      it('should create a profile successfully', async () => {
        const expectedResult = {
          success: true,
          profile: mockProfileData,
          urls: {
            public: 'https://cvplus.com/p/john-doe-software-engineer',
            preview: 'https://cvplus.com/preview/profile-123'
          }
        };

        mockCallableFunction.mockResolvedValue({ data: expectedResult });

        const options: ProfileOptions = {
          templateId: 'template-1',
          publishImmediately: true
        };

        const result = await profileService.createProfile(mockProfileData, options);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createPublicProfile');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          userId: mockUser.uid,
          profileData: mockProfileData,
          options
        });
        expect(result).toEqual(expectedResult);
      });

      it('should throw error when user is not authenticated', async () => {
        mockGetAuth.mockReturnValue({ currentUser: null } as any);

        await expect(
          profileService.createProfile(mockProfileData)
        ).rejects.toThrow('User must be authenticated to create profile');
      });

      it('should handle Firebase function errors', async () => {
        mockCallableFunction.mockRejectedValue(new Error('Network error'));

        await expect(
          profileService.createProfile(mockProfileData)
        ).rejects.toThrow('Profile creation failed: Network error');
      });
    });

    describe('getProfile', () => {
      it('should get profile from Firestore', async () => {
        const mockDoc = {
          exists: () => true,
          id: 'profile-123',
          data: () => ({ ...mockProfileData, id: undefined })
        };

        mockGetDoc.mockResolvedValue(mockDoc as any);

        const result = await profileService.getProfile('profile-123');

        expect(doc).toHaveBeenCalledWith(expect.anything(), 'publicProfiles', 'profile-123');
        expect(mockGetDoc).toHaveBeenCalled();
        expect(result).toEqual(mockProfileData);
      });

      it('should return cached profile if available', async () => {
        // First call - should fetch from Firestore
        const mockDoc = {
          exists: () => true,
          id: 'profile-123',
          data: () => ({ ...mockProfileData, id: undefined })
        };
        mockGetDoc.mockResolvedValue(mockDoc as any);

        await profileService.getProfile('profile-123');

        // Second call - should return from cache
        mockGetDoc.mockClear();
        const result = await profileService.getProfile('profile-123');

        expect(mockGetDoc).not.toHaveBeenCalled();
        expect(result).toEqual(mockProfileData);
      });

      it('should throw error when profile not found', async () => {
        const mockDoc = {
          exists: () => false
        };
        mockGetDoc.mockResolvedValue(mockDoc as any);

        await expect(
          profileService.getProfile('nonexistent-profile')
        ).rejects.toThrow('Failed to fetch profile: Profile not found');
      });
    });

    describe('updateProfile', () => {
      it('should update profile successfully', async () => {
        const updates: ProfileUpdate = {
          basicInfo: { name: 'Jane Doe', title: 'Senior Software Engineer' }
        };

        const expectedResult = {
          success: true,
          profile: { ...mockProfileData, name: 'Jane Doe', title: 'Senior Software Engineer' },
          changes: ['basicInfo']
        };

        mockCallableFunction.mockResolvedValue({ data: expectedResult });

        const result = await profileService.updateProfile('profile-123', updates);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'updatePublicProfile');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          updates,
          userId: mockUser.uid
        });
        expect(result).toEqual(expectedResult);
      });
    });

    describe('deleteProfile', () => {
      it('should delete profile successfully', async () => {
        mockCallableFunction.mockResolvedValue({});

        await profileService.deleteProfile('profile-123');

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'deletePublicProfile');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          userId: mockUser.uid
        });
      });

      it('should throw error when user is not authenticated', async () => {
        mockGetAuth.mockReturnValue({ currentUser: null } as any);

        await expect(
          profileService.deleteProfile('profile-123')
        ).rejects.toThrow('User must be authenticated to delete profile');
      });
    });

    describe('getUserProfiles', () => {
      it('should get user profiles from Firestore', async () => {
        const mockSnapshot = {
          docs: [
            {
              id: 'profile-1',
              data: () => ({ ...mockProfileData, id: undefined, name: 'Profile 1' })
            },
            {
              id: 'profile-2',
              data: () => ({ ...mockProfileData, id: undefined, name: 'Profile 2' })
            }
          ]
        };

        mockGetDocs.mockResolvedValue(mockSnapshot as any);

        const result = await profileService.getUserProfiles();

        expect(collection).toHaveBeenCalledWith(expect.anything(), 'publicProfiles');
        expect(query).toHaveBeenCalled();
        expect(mockGetDocs).toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Profile 1');
        expect(result[1].name).toBe('Profile 2');
      });
    });
  });

  describe('Template Operations', () => {
    describe('getTemplates', () => {
      it('should get available templates', async () => {
        const expectedTemplates = [mockTemplate];
        mockCallableFunction.mockResolvedValue({ data: { templates: expectedTemplates } });

        const result = await profileService.getTemplates();

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getProfileTemplates');
        expect(result).toEqual(expectedTemplates);
      });

      it('should cache templates', async () => {
        const expectedTemplates = [mockTemplate];
        mockCallableFunction.mockResolvedValue({ data: { templates: expectedTemplates } });

        // First call
        await profileService.getTemplates();

        // Second call - should use cache
        mockCallableFunction.mockClear();
        const result = await profileService.getTemplates();

        expect(mockCallableFunction).not.toHaveBeenCalled();
        expect(result).toEqual(expectedTemplates);
      });
    });

    describe('applyTemplate', () => {
      it('should apply template to profile', async () => {
        const expectedResult = {
          success: true,
          profile: { ...mockProfileData, template: 'template-2' }
        };

        mockCallableFunction.mockResolvedValue({ data: expectedResult });

        const result = await profileService.applyTemplate('profile-123', 'template-2');

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'applyProfileTemplate');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          templateId: 'template-2',
          userId: mockUser.uid
        });
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Analytics Integration', () => {
    describe('trackProfileView', () => {
      it('should track profile view without throwing errors', async () => {
        const viewData: ViewData = {
          sessionId: 'session-123',
          visitorId: 'visitor-456',
          country: 'US',
          device: 'desktop'
        };

        mockCallableFunction.mockResolvedValue({});

        // Should not throw
        await expect(
          profileService.trackProfileView('profile-123', viewData)
        ).resolves.toBeUndefined();

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'trackProfileView');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          viewData: expect.objectContaining({
            ...viewData,
            timestamp: expect.any(String),
            userAgent: expect.any(String),
            referrer: expect.any(String)
          })
        });
      });

      it('should not throw error when tracking fails', async () => {
        mockCallableFunction.mockRejectedValue(new Error('Network error'));

        // Should not throw even when Firebase function fails
        await expect(
          profileService.trackProfileView('profile-123', {})
        ).resolves.toBeUndefined();
      });
    });

    describe('getProfileAnalytics', () => {
      it('should get profile analytics', async () => {
        const mockAnalytics = {
          profileId: 'profile-123',
          period: { days: 30 },
          summary: {
            totalViews: 1000,
            uniqueVisitors: 800,
            averageSessionDuration: 120,
            bounceRate: 0.3,
            conversionRate: 0.05,
            growthRate: 0.15
          },
          traffic: {
            dailyViews: [],
            hourlyDistribution: [],
            peakHours: [9, 14, 20],
            totalPageViews: 1200,
            averagePagesPerSession: 1.2
          },
          engagement: {
            topSections: [],
            averageScrollDepth: 0.8,
            interactionRate: 0.6,
            downloadCount: 50,
            shareCount: 25,
            contactFormSubmissions: 10
          },
          conversions: {
            goals: [],
            funnelData: [],
            conversionPaths: []
          },
          geographic: {
            countries: [],
            cities: [],
            languages: []
          },
          devices: {
            devices: [],
            browsers: [],
            operatingSystems: [],
            screenResolutions: []
          },
          referrers: {
            sources: [],
            socialMedia: [],
            searchEngines: [],
            directTraffic: 500
          },
          trends: {
            viewsTrend: [],
            engagementTrend: [],
            popularContent: []
          },
          generatedAt: '2024-01-01T00:00:00Z'
        };

        mockCallableFunction.mockResolvedValue({ data: mockAnalytics });

        const dateRange: DateRange = { days: 30 };
        const result = await profileService.getProfileAnalytics('profile-123', dateRange);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getProfileAnalytics');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          dateRange
        });
        expect(result).toEqual(mockAnalytics);
      });
    });

    describe('trackEngagement', () => {
      it('should track engagement data', async () => {
        const engagementData: EngagementData = {
          type: 'click',
          section: 'portfolio',
          element: 'project-1',
          duration: 5000
        };

        mockCallableFunction.mockResolvedValue({});

        await expect(
          profileService.trackEngagement('profile-123', engagementData)
        ).resolves.toBeUndefined();

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'trackProfileEngagement');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          engagement: expect.objectContaining({
            ...engagementData,
            timestamp: expect.any(String)
          })
        });
      });
    });
  });

  describe('Sharing & Embedding', () => {
    describe('generateShareURL', () => {
      it('should generate social sharing URL', async () => {
        const expectedUrl = 'https://linkedin.com/sharing/share-offsite/?url=https://cvplus.com/p/profile-123';
        mockCallableFunction.mockResolvedValue({ data: { url: expectedUrl } });

        const result = await profileService.generateShareURL('profile-123', 'linkedin');

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateShareURL');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          platform: 'linkedin'
        });
        expect(result).toBe(expectedUrl);
      });
    });

    describe('generateQRCode', () => {
      it('should generate QR code for profile', async () => {
        const qrResult = {
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          url: 'https://cvplus.com/p/profile-123',
          format: 'png',
          size: 200,
          downloadUrl: 'https://cvplus.com/qr/profile-123.png'
        };

        mockCallableFunction.mockResolvedValue({ data: qrResult });

        const options: QROptions = { size: 200, format: 'png' };
        const result = await profileService.generateQRCode('profile-123', options);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateProfileQR');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          options
        });
        expect(result).toEqual(qrResult);
      });
    });

    describe('generateEmbedCode', () => {
      it('should generate embed code for profile', async () => {
        const expectedCode = '<iframe src="https://cvplus.com/embed/profile-123" width="400" height="600"></iframe>';
        mockCallableFunction.mockResolvedValue({ data: { embedCode: expectedCode } });

        const options: EmbedOptions = { width: 400, height: 600 };
        const result = await profileService.generateEmbedCode('profile-123', options);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateEmbedCode');
        expect(result).toBe(expectedCode);
      });
    });
  });

  describe('Privacy & Access Control', () => {
    describe('updatePrivacySettings', () => {
      it('should update privacy settings', async () => {
        const privacySettings: PrivacySettings = {
          level: 'unlisted',
          allowSearch: false,
          showContactInfo: true,
          showSocialLinks: true,
          allowDownload: false,
          allowSharing: true
        };

        mockCallableFunction.mockResolvedValue({});

        await profileService.updatePrivacySettings('profile-123', privacySettings);

        expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateProfilePrivacy');
        expect(mockCallableFunction).toHaveBeenCalledWith({
          profileId: 'profile-123',
          settings: privacySettings,
          userId: mockUser.uid
        });
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache data with expiry', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'profile-123',
        data: () => ({ ...mockProfileData, id: undefined })
      };
      mockGetDoc.mockResolvedValue(mockDoc as any);

      // First call - should fetch from Firestore
      await profileService.getProfile('profile-123');

      // Check cache stats
      const stats = profileService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries).toContain('profile-profile-123');

      // Clear all cache
      profileService.clearAllCache();

      const statsAfterClear = profileService.getCacheStats();
      expect(statsAfterClear.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors consistently', async () => {
      mockGetAuth.mockReturnValue({ currentUser: null } as any);

      await expect(profileService.createProfile(mockProfileData))
        .rejects.toThrow('User must be authenticated');

      await expect(profileService.updateProfile('profile-123', {}))
        .rejects.toThrow('User must be authenticated');

      await expect(profileService.deleteProfile('profile-123'))
        .rejects.toThrow('User must be authenticated');
    });

    it('should handle Firebase function errors gracefully', async () => {
      const firebaseError = new Error('Firebase function error');
      mockCallableFunction.mockRejectedValue(firebaseError);

      await expect(profileService.createProfile(mockProfileData))
        .rejects.toThrow('Profile creation failed: Firebase function error');

      await expect(profileService.getTemplates())
        .rejects.toThrow('Failed to fetch templates: Firebase function error');
    });
  });
});
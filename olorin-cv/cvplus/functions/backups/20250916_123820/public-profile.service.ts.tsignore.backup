// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * PublicProfile Firestore Service
 *
 * Firebase model service for managing PublicProfile entities with comprehensive
 * CRUD operations, visibility controls, and engagement tracking.
 *
 * @fileoverview PublicProfile service for Firebase Functions with SEO and analytics
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  runTransaction
} from 'firebase-admin/firestore';
import {
  PublicProfile,
  validatePublicProfile,
  isPublicProfile,
  ProfileSection,
  PrivacyLevel,
  ContactOption,
  CustomBranding,
  DEFAULT_VISIBLE_SECTIONS,
  DEFAULT_BRANDING,
  PREMIUM_SECTIONS,
  validateCustomBranding,
  isValidSlug,
  generateSlug,
  isProfileExpired,
  isProfileCurrentlyActive,
  getProfileUrl,
  calculateEngagementRate,
  getTopSections,
  hasViewPermission,
  getAnalyticsSummary
} from '../../../shared/types/public-profile';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const COLLECTION_NAME = 'publicProfiles';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const BATCH_SIZE = 500;
const MAX_SLUG_ATTEMPTS = 10;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: PublicProfile;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const slugCache = new Map<string, string>(); // slug -> id mapping

function getCacheKey(id: string): string {
  return `publicProfile:${id}`;
}

function getSlugCacheKey(slug: string): string {
  return `slug:${slug}`;
}

function getCachedProfile(id: string): PublicProfile | null {
  const key = getCacheKey(id);
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedProfile(profile: PublicProfile): void {
  const key = getCacheKey(profile.id);
  const now = Date.now();

  cache.set(key, {
    data: profile,
    timestamp: now,
    expiresAt: now + (CACHE_TTL_SECONDS * 1000)
  });

  // Cache slug mapping
  slugCache.set(profile.slug, profile.id);
}

function invalidateCache(id: string, slug?: string): void {
  const key = getCacheKey(id);
  cache.delete(key);

  if (slug) {
    slugCache.delete(slug);
  }
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Create a new PublicProfile in Firestore
 */
export async function createPublicProfile(
  profileData: Omit<PublicProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PublicProfile> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const newProfileRef = doc(profilesRef);

  const now = Timestamp.now();

  // Ensure slug is unique
  const slug = await ensureUniqueSlug(profileData.slug);

  const profile: PublicProfile = {
    ...profileData,
    id: newProfileRef.id,
    slug,
    visibleSections: profileData.visibleSections || DEFAULT_VISIBLE_SECTIONS,
    customBranding: profileData.customBranding || DEFAULT_BRANDING,
    viewCount: 0,
    uniqueViewCount: 0,
    contactFormSubmissions: 0,
    shareCount: 0,
    topCountries: [],
    deviceStats: {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      topBrowsers: [],
      operatingSystems: []
    },
    createdAt: now,
    updatedAt: now
  };

  // Validate profile data
  const validationErrors = validatePublicProfile(profile);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('PublicProfile validation failed', { errors: validationErrors, profileId: profile.id });
    throw new Error(errorMessage);
  }

  try {
    await setDoc(newProfileRef, profile);
    setCachedProfile(profile);

    logger.info('PublicProfile created successfully', {
      profileId: profile.id,
      slug: profile.slug,
      userId: profile.userId,
      jobId: profile.jobId,
      privacyLevel: profile.privacyLevel
    });
    return profile;
  } catch (error) {
    logger.error('Failed to create PublicProfile', { error, profileId: profile.id });
    throw new Error(`Failed to create public profile: ${error}`);
  }
}

/**
 * Get PublicProfile by ID
 */
export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  // Check cache first
  const cached = getCachedProfile(id);
  if (cached) {
    return cached;
  }

  const db = getFirestore();
  const profileRef = doc(db, COLLECTION_NAME, id);

  try {
    const docSnapshot = await getDoc(profileRef);

    if (!docSnapshot.exists()) {
      logger.debug('PublicProfile not found', { profileId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isPublicProfile(data)) {
      logger.error('Invalid PublicProfile data structure', { profileId: id, data });
      throw new Error('Invalid public profile data structure');
    }

    const profile = data as PublicProfile;
    setCachedProfile(profile);

    return profile;
  } catch (error) {
    logger.error('Failed to get PublicProfile', { error, profileId: id });
    throw new Error(`Failed to retrieve public profile: ${error}`);
  }
}

/**
 * Get PublicProfile by slug
 */
export async function getPublicProfileBySlug(slug: string): Promise<PublicProfile | null> {
  // Check slug cache first
  const cachedId = slugCache.get(slug);
  if (cachedId) {
    return getCachedProfile(cachedId);
  }

  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const q = query(profilesRef, where('slug', '==', slug), firestoreLimit(1));

  try {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      logger.debug('PublicProfile not found by slug', { slug });
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    if (!isPublicProfile(data)) {
      logger.error('Invalid PublicProfile data structure', { slug, data });
      throw new Error('Invalid public profile data structure');
    }

    const profile = data as PublicProfile;
    setCachedProfile(profile);

    return profile;
  } catch (error) {
    logger.error('Failed to get PublicProfile by slug', { error, slug });
    throw new Error(`Failed to retrieve public profile by slug: ${error}`);
  }
}

/**
 * Update PublicProfile
 */
export async function updatePublicProfile(
  id: string,
  updates: Partial<Omit<PublicProfile, 'id' | 'createdAt'>>
): Promise<PublicProfile> {
  // Get existing profile
  const existingProfile = await getPublicProfile(id);
  if (!existingProfile) {
    throw new Error(`Public profile not found: ${id}`);
  }

  // If slug is being updated, ensure it's unique
  if (updates.slug && updates.slug !== existingProfile.slug) {
    updates.slug = await ensureUniqueSlug(updates.slug);
  }

  const updatedProfile: PublicProfile = {
    ...existingProfile,
    ...updates,
    updatedAt: Timestamp.now()
  };

  // Validate updated profile
  const validationErrors = validatePublicProfile(updatedProfile);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('PublicProfile update validation failed', { errors: validationErrors, profileId: id });
    throw new Error(errorMessage);
  }

  const db = getFirestore();
  const profileRef = doc(db, COLLECTION_NAME, id);

  try {
    await updateDoc(profileRef, updates as any);

    // Update cache
    setCachedProfile(updatedProfile);

    // If slug changed, invalidate old slug cache
    if (updates.slug && updates.slug !== existingProfile.slug) {
      slugCache.delete(existingProfile.slug);
    }

    logger.info('PublicProfile updated successfully', {
      profileId: id,
      updatedFields: Object.keys(updates)
    });
    return updatedProfile;
  } catch (error) {
    logger.error('Failed to update PublicProfile', { error, profileId: id });
    throw new Error(`Failed to update public profile: ${error}`);
  }
}

/**
 * Delete PublicProfile
 */
export async function deletePublicProfile(id: string): Promise<boolean> {
  const existingProfile = await getPublicProfile(id);
  if (!existingProfile) {
    throw new Error(`Public profile not found: ${id}`);
  }

  const db = getFirestore();
  const profileRef = doc(db, COLLECTION_NAME, id);

  try {
    await deleteDoc(profileRef);

    // Remove from cache
    invalidateCache(id, existingProfile.slug);

    logger.info('PublicProfile deleted', { profileId: id, slug: existingProfile.slug });
    return true;
  } catch (error) {
    logger.error('Failed to delete PublicProfile', { error, profileId: id });
    throw new Error(`Failed to delete public profile: ${error}`);
  }
}

// ============================================================================
// Slug Management
// ============================================================================

/**
 * Ensure slug is unique by appending numbers if necessary
 */
async function ensureUniqueSlug(desiredSlug: string): Promise<string> {
  if (!isValidSlug(desiredSlug)) {
    throw new Error(`Invalid slug format: ${desiredSlug}`);
  }

  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);

  let attempt = 0;
  let currentSlug = desiredSlug;

  while (attempt < MAX_SLUG_ATTEMPTS) {
    const q = query(profilesRef, where('slug', '==', currentSlug), firestoreLimit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return currentSlug;
    }

    attempt++;
    currentSlug = `${desiredSlug}-${attempt}`;
  }

  throw new Error(`Could not generate unique slug after ${MAX_SLUG_ATTEMPTS} attempts`);
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) {
    return false;
  }

  const profile = await getPublicProfileBySlug(slug);
  return profile === null;
}

/**
 * Generate and reserve a slug from a name
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  return ensureUniqueSlug(baseSlug);
}

// ============================================================================
// View Tracking and Analytics
// ============================================================================

/**
 * Record a profile view
 */
export async function recordProfileView(
  profileId: string,
  visitorInfo: {
    isUniqueVisitor: boolean;
    country?: string;
    city?: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  }
): Promise<PublicProfile> {
  const db = getFirestore();

  return runTransaction(db, async (transaction) => {
    const profileRef = doc(db, COLLECTION_NAME, profileId);
    const profileDoc = await transaction.get(profileRef);

    if (!profileDoc.exists()) {
      throw new Error(`Public profile not found: ${profileId}`);
    }

    const profileData = profileDoc.data() as PublicProfile;
    const now = Timestamp.now();

    const updates: Partial<PublicProfile> = {
      viewCount: profileData.viewCount + 1,
      lastViewedAt: now,
      updatedAt: now
    };

    if (visitorInfo.isUniqueVisitor) {
      updates.uniqueViewCount = profileData.uniqueViewCount + 1;
    }

    // Update device stats
    const deviceStats = { ...profileData.deviceStats };
    deviceStats[visitorInfo.deviceType]++;
    updates.deviceStats = deviceStats;

    // Update country stats if provided
    if (visitorInfo.country) {
      const topCountries = [...profileData.topCountries];
      const existingCountry = topCountries.find(c => c.countryCode === visitorInfo.country);

      if (existingCountry) {
        existingCountry.viewCount++;
        existingCountry.percentage = (existingCountry.viewCount / updates.viewCount!) * 100;
      } else {
        topCountries.push({
          countryCode: visitorInfo.country,
          countryName: getCountryName(visitorInfo.country),
          viewCount: 1,
          percentage: (1 / updates.viewCount!) * 100
        });
      }

      // Keep only top 10 countries
      topCountries.sort((a, b) => b.viewCount - a.viewCount);
      updates.topCountries = topCountries.slice(0, 10);
    }

    transaction.update(profileRef, updates);

    // Update cached version
    const updatedProfile = {
      ...profileData,
      ...updates
    };
    setCachedProfile(updatedProfile);

    logger.info('Profile view recorded', {
      profileId,
      viewCount: updates.viewCount,
      isUnique: visitorInfo.isUniqueVisitor
    });

    return updatedProfile;
  });
}

/**
 * Record a contact form submission
 */
export async function recordContactFormSubmission(profileId: string): Promise<PublicProfile> {
  const updates: Partial<PublicProfile> = {
    contactFormSubmissions: 0, // Will be incremented by 1 in the update
    updatedAt: Timestamp.now()
  };

  const existingProfile = await getPublicProfile(profileId);
  if (existingProfile) {
    updates.contactFormSubmissions = existingProfile.contactFormSubmissions + 1;
  }

  return updatePublicProfile(profileId, updates);
}

/**
 * Record a social share
 */
export async function recordSocialShare(profileId: string): Promise<PublicProfile> {
  const updates: Partial<PublicProfile> = {
    shareCount: 0, // Will be incremented by 1 in the update
    updatedAt: Timestamp.now()
  };

  const existingProfile = await getPublicProfile(profileId);
  if (existingProfile) {
    updates.shareCount = existingProfile.shareCount + 1;
  }

  return updatePublicProfile(profileId, updates);
}

// ============================================================================
// Visibility and Access Control
// ============================================================================

/**
 * Update profile visibility settings
 */
export async function updateVisibilitySettings(
  profileId: string,
  settings: {
    isActive?: boolean;
    privacyLevel?: PrivacyLevel;
    passwordProtected?: boolean;
    password?: string;
    allowedDomains?: string[];
    allowedIpRanges?: string[];
    allowIndexing?: boolean;
    expiresAt?: Timestamp;
    activatesAt?: Timestamp;
  }
): Promise<PublicProfile> {
  return updatePublicProfile(profileId, settings);
}

/**
 * Update visible sections
 */
export async function updateVisibleSections(
  profileId: string,
  visibleSections: ProfileSection[]
): Promise<PublicProfile> {
  // Validate that premium sections are only included for premium users
  // This would typically check user subscription status
  const validSections = visibleSections.filter(section => {
    // For now, allow all sections - in production, check user subscription
    return Object.values(ProfileSection).includes(section);
  });

  return updatePublicProfile(profileId, {
    visibleSections: validSections
  });
}

/**
 * Update contact options
 */
export async function updateContactOptions(
  profileId: string,
  contactOptions: ContactOption[]
): Promise<PublicProfile> {
  if (contactOptions.length === 0) {
    throw new Error('At least one contact option must be enabled');
  }

  return updatePublicProfile(profileId, {
    contactOptions
  });
}

/**
 * Update custom branding
 */
export async function updateCustomBranding(
  profileId: string,
  branding: Partial<CustomBranding>
): Promise<PublicProfile> {
  const existingProfile = await getPublicProfile(profileId);
  if (!existingProfile) {
    throw new Error(`Public profile not found: ${profileId}`);
  }

  const updatedBranding = {
    ...existingProfile.customBranding,
    ...branding
  };

  // Validate branding
  const brandingErrors = validateCustomBranding(updatedBranding);
  if (brandingErrors.length > 0) {
    throw new Error(`Branding validation failed: ${brandingErrors.join(', ')}`);
  }

  return updatePublicProfile(profileId, {
    customBranding: updatedBranding
  });
}

// ============================================================================
// Query Operations
// ============================================================================

export interface PublicProfileQueryOptions {
  userId?: string;
  jobId?: string;
  isActive?: boolean;
  privacyLevel?: PrivacyLevel;
  includeExpired?: boolean;
  minViewCount?: number;
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'viewCount' | 'createdAt' | 'updatedAt' | 'shareCount';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Query PublicProfiles with pagination
 */
export async function queryPublicProfiles(options: PublicProfileQueryOptions = {}): Promise<{
  profiles: PublicProfile[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);

  let q = query(profilesRef);

  // Apply filters
  if (options.userId) {
    q = query(q, where('userId', '==', options.userId));
  }

  if (options.jobId) {
    q = query(q, where('jobId', '==', options.jobId));
  }

  if (options.isActive !== undefined) {
    q = query(q, where('isActive', '==', options.isActive));
  }

  if (options.privacyLevel) {
    q = query(q, where('privacyLevel', '==', options.privacyLevel));
  }

  if (options.minViewCount !== undefined) {
    q = query(q, where('viewCount', '>=', options.minViewCount));
  }

  // Apply ordering
  const orderByField = options.orderByField || 'createdAt';
  const orderDirection = options.orderDirection || 'desc';
  q = query(q, orderBy(orderByField, orderDirection));

  // Apply pagination
  if (options.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }

  const limitCount = Math.min(options.limit || 50, BATCH_SIZE);
  q = query(q, firestoreLimit(limitCount + 1)); // Get one extra to check if there are more

  try {
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > limitCount;

    if (hasMore) {
      docs.pop(); // Remove the extra document
    }

    let profiles: PublicProfile[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isPublicProfile(data)) {
        const profile = data as PublicProfile;

        // Filter out expired profiles unless explicitly requested
        if (!options.includeExpired && isProfileExpired(profile)) {
          continue;
        }

        profiles.push(profile);
      } else {
        logger.warn('Invalid PublicProfile data in query result', { docId: doc.id });
      }
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      profiles,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to query PublicProfiles', { error, options });
    throw new Error(`Failed to query public profiles: ${error}`);
  }
}

/**
 * Get profiles by user ID
 */
export async function getProfilesByUserId(userId: string): Promise<PublicProfile[]> {
  const result = await queryPublicProfiles({
    userId,
    limit: 100,
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  return result.profiles;
}

/**
 * Get popular profiles
 */
export async function getPopularProfiles(limit: number = 20): Promise<PublicProfile[]> {
  const result = await queryPublicProfiles({
    isActive: true,
    privacyLevel: PrivacyLevel.PUBLIC,
    minViewCount: 10,
    limit,
    orderByField: 'viewCount',
    orderDirection: 'desc'
  });

  return result.profiles;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get country name from country code
 */
function getCountryName(countryCode: string): string {
  // This would typically use a country code to name mapping
  // For now, return the code as placeholder
  const countryMap: Record<string, string> = {
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'AU': 'Australia',
    'JP': 'Japan',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico'
  };

  return countryMap[countryCode] || countryCode;
}

/**
 * Clear all cached profiles (for testing/debugging)
 */
export function clearProfileCache(): void {
  cache.clear();
  slugCache.clear();
  logger.debug('PublicProfile cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[]; slugCacheSize: number } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
    slugCacheSize: slugCache.size
  };
}

/**
 * Clean up expired profiles
 */
export async function cleanupExpiredProfiles(): Promise<number> {
  const result = await queryPublicProfiles({
    includeExpired: true,
    limit: BATCH_SIZE
  });

  const expiredProfiles = result.profiles.filter(profile => isProfileExpired(profile));

  if (expiredProfiles.length === 0) {
    return 0;
  }

  const db = getFirestore();
  const batch = db.batch();

  expiredProfiles.forEach(profile => {
    const profileRef = doc(db, COLLECTION_NAME, profile.id);
    batch.update(profileRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    });
    invalidateCache(profile.id, profile.slug);
  });

  try {
    await batch.commit();
    logger.info('Deactivated expired profiles', { count: expiredProfiles.length });
    return expiredProfiles.length;
  } catch (error) {
    logger.error('Failed to cleanup expired profiles', { error });
    throw new Error(`Failed to cleanup expired profiles: ${error}`);
  }
}

/**
 * Get profile engagement analytics
 */
export async function getProfileEngagement(profileId: string): Promise<{
  totalViews: number;
  uniqueViews: number;
  engagementRate: number;
  topCountry: string;
  conversionRate: number;
  averageSessionTime?: number;
  deviceBreakdown: Record<string, number>;
}> {
  const profile = await getPublicProfile(profileId);
  if (!profile) {
    throw new Error(`Public profile not found: ${profileId}`);
  }

  const analytics = getAnalyticsSummary(profile);

  const deviceBreakdown = {
    desktop: profile.deviceStats.desktop,
    mobile: profile.deviceStats.mobile,
    tablet: profile.deviceStats.tablet
  };

  return {
    totalViews: analytics.totalViews,
    uniqueViews: analytics.uniqueViews,
    engagementRate: analytics.engagementRate,
    topCountry: analytics.topCountry,
    conversionRate: analytics.conversionRate,
    deviceBreakdown
  };
}
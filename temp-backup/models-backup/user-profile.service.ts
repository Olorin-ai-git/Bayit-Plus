/**
 * UserProfile Firestore Service
 *
 * Firebase model service for managing UserProfile entities with comprehensive
 * CRUD operations, validation, and error handling.
 *
 * @fileoverview UserProfile service for Firebase Functions with caching and analytics
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
import { UserProfile, validateUserProfile, isUserProfile, SubscriptionTier, AccountStatus } from '../../../shared/types/user';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// Service Configuration
// ============================================================================

const COLLECTION_NAME = 'userProfiles';
const CACHE_TTL_SECONDS = 300; // 5 minutes
const BATCH_SIZE = 500;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: UserProfile;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(id: string): string {
  return `userProfile:${id}`;
}

function getCachedProfile(id: string): UserProfile | null {
  const key = getCacheKey(id);
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedProfile(profile: UserProfile): void {
  const key = getCacheKey(profile.id);
  const now = Date.now();

  cache.set(key, {
    data: profile,
    timestamp: now,
    expiresAt: now + (CACHE_TTL_SECONDS * 1000)
  });
}

function invalidateCache(id: string): void {
  const key = getCacheKey(id);
  cache.delete(key);
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * Create a new UserProfile in Firestore
 */
export async function createUserProfile(profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const newProfileRef = doc(profilesRef);

  const now = Timestamp.now();
  const profile: UserProfile = {
    ...profileData,
    id: newProfileRef.id,
    createdAt: now,
    updatedAt: now
  };

  // Validate profile data
  const validationErrors = validateUserProfile(profile);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('UserProfile validation failed', { errors: validationErrors, profileId: profile.id });
    throw new Error(errorMessage);
  }

  try {
    await setDoc(newProfileRef, profile);
    setCachedProfile(profile);

    logger.info('UserProfile created successfully', { profileId: profile.id, email: profile.email });
    return profile;
  } catch (error) {
    logger.error('Failed to create UserProfile', { error, profileId: profile.id });
    throw new Error(`Failed to create user profile: ${error}`);
  }
}

/**
 * Get UserProfile by ID
 */
export async function getUserProfile(id: string): Promise<UserProfile | null> {
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
      logger.debug('UserProfile not found', { profileId: id });
      return null;
    }

    const data = docSnapshot.data();
    if (!isUserProfile(data)) {
      logger.error('Invalid UserProfile data structure', { profileId: id, data });
      throw new Error('Invalid user profile data structure');
    }

    const profile = data as UserProfile;
    setCachedProfile(profile);

    return profile;
  } catch (error) {
    logger.error('Failed to get UserProfile', { error, profileId: id });
    throw new Error(`Failed to retrieve user profile: ${error}`);
  }
}

/**
 * Get UserProfile by email
 */
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const q = query(profilesRef, where('email', '==', email), firestoreLimit(1));

  try {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      logger.debug('UserProfile not found by email', { email });
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    if (!isUserProfile(data)) {
      logger.error('Invalid UserProfile data structure', { email, data });
      throw new Error('Invalid user profile data structure');
    }

    const profile = data as UserProfile;
    setCachedProfile(profile);

    return profile;
  } catch (error) {
    logger.error('Failed to get UserProfile by email', { error, email });
    throw new Error(`Failed to retrieve user profile by email: ${error}`);
  }
}

/**
 * Update UserProfile
 */
export async function updateUserProfile(
  id: string,
  updates: Partial<Omit<UserProfile, 'id' | 'createdAt'>>
): Promise<UserProfile> {
  // Get existing profile
  const existingProfile = await getUserProfile(id);
  if (!existingProfile) {
    throw new Error(`User profile not found: ${id}`);
  }

  const updatedProfile: UserProfile = {
    ...existingProfile,
    ...updates,
    updatedAt: Timestamp.now()
  };

  // Validate updated profile
  const validationErrors = validateUserProfile(updatedProfile);
  if (validationErrors.length > 0) {
    const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
    logger.error('UserProfile update validation failed', { errors: validationErrors, profileId: id });
    throw new Error(errorMessage);
  }

  const db = getFirestore();
  const profileRef = doc(db, COLLECTION_NAME, id);

  try {
    await updateDoc(profileRef, updates as any);

    // Update cache
    setCachedProfile(updatedProfile);

    logger.info('UserProfile updated successfully', { profileId: id, updatedFields: Object.keys(updates) });
    return updatedProfile;
  } catch (error) {
    logger.error('Failed to update UserProfile', { error, profileId: id });
    throw new Error(`Failed to update user profile: ${error}`);
  }
}

/**
 * Delete UserProfile (soft delete)
 */
export async function deleteUserProfile(id: string): Promise<boolean> {
  try {
    // Perform soft delete by updating status
    await updateUserProfile(id, {
      status: AccountStatus.DELETED,
      updatedAt: Timestamp.now()
    });

    // Remove from cache
    invalidateCache(id);

    logger.info('UserProfile soft deleted', { profileId: id });
    return true;
  } catch (error) {
    logger.error('Failed to delete UserProfile', { error, profileId: id });
    throw new Error(`Failed to delete user profile: ${error}`);
  }
}

/**
 * Hard delete UserProfile (permanent)
 */
export async function hardDeleteUserProfile(id: string): Promise<boolean> {
  const db = getFirestore();
  const profileRef = doc(db, COLLECTION_NAME, id);

  try {
    await deleteDoc(profileRef);

    // Remove from cache
    invalidateCache(id);

    logger.warn('UserProfile hard deleted', { profileId: id });
    return true;
  } catch (error) {
    logger.error('Failed to hard delete UserProfile', { error, profileId: id });
    throw new Error(`Failed to hard delete user profile: ${error}`);
  }
}

// ============================================================================
// Query Operations
// ============================================================================

export interface UserProfileQueryOptions {
  status?: AccountStatus;
  subscriptionTier?: SubscriptionTier;
  startAfterDoc?: DocumentSnapshot;
  limit?: number;
  orderByField?: 'createdAt' | 'updatedAt' | 'lastLoginAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Query UserProfiles with pagination
 */
export async function queryUserProfiles(options: UserProfileQueryOptions = {}): Promise<{
  profiles: UserProfile[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);

  let q = query(profilesRef);

  // Apply filters
  if (options.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options.subscriptionTier) {
    q = query(q, where('subscription.tier', '==', options.subscriptionTier));
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

    const profiles: UserProfile[] = [];
    for (const doc of docs) {
      const data = doc.data();
      if (isUserProfile(data)) {
        profiles.push(data as UserProfile);
      } else {
        logger.warn('Invalid UserProfile data in query result', { docId: doc.id });
      }
    }

    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    return {
      profiles,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logger.error('Failed to query UserProfiles', { error, options });
    throw new Error(`Failed to query user profiles: ${error}`);
  }
}

/**
 * Get active users count
 */
export async function getActiveUsersCount(): Promise<number> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const q = query(profilesRef, where('status', '==', AccountStatus.ACTIVE));

  try {
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    logger.error('Failed to get active users count', { error });
    throw new Error(`Failed to get active users count: ${error}`);
  }
}

/**
 * Get users by subscription tier
 */
export async function getUsersBySubscriptionTier(tier: SubscriptionTier): Promise<UserProfile[]> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const q = query(
    profilesRef,
    where('subscription.tier', '==', tier),
    where('status', '==', AccountStatus.ACTIVE)
  );

  try {
    const snapshot = await getDocs(q);
    const profiles: UserProfile[] = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isUserProfile(data)) {
        profiles.push(data as UserProfile);
      }
    });

    return profiles;
  } catch (error) {
    logger.error('Failed to get users by subscription tier', { error, tier });
    throw new Error(`Failed to get users by subscription tier: ${error}`);
  }
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Update user subscription
 */
export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserProfile['subscription']>
): Promise<UserProfile> {
  const existingProfile = await getUserProfile(userId);
  if (!existingProfile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  const updatedSubscription = {
    ...existingProfile.subscription,
    ...subscriptionData,
    updatedAt: Timestamp.now()
  };

  return updateUserProfile(userId, {
    subscription: updatedSubscription
  });
}

/**
 * Update user credits
 */
export async function updateUserCredits(userId: string, creditDelta: number): Promise<UserProfile> {
  const db = getFirestore();

  return runTransaction(db, async (transaction) => {
    const profileRef = doc(db, COLLECTION_NAME, userId);
    const profileDoc = await transaction.get(profileRef);

    if (!profileDoc.exists()) {
      throw new Error(`User profile not found: ${userId}`);
    }

    const profileData = profileDoc.data() as UserProfile;
    const newCredits = Math.max(0, profileData.credits + creditDelta);

    transaction.update(profileRef, {
      credits: newCredits,
      updatedAt: Timestamp.now()
    });

    // Update cached version
    const updatedProfile = {
      ...profileData,
      credits: newCredits,
      updatedAt: Timestamp.now()
    };
    setCachedProfile(updatedProfile);

    logger.info('User credits updated', { userId, oldCredits: profileData.credits, newCredits, delta: creditDelta });
    return updatedProfile;
  });
}

// ============================================================================
// Analytics and Insights
// ============================================================================

/**
 * Update user analytics data
 */
export async function updateUserAnalytics(
  userId: string,
  analyticsUpdate: Partial<UserProfile['analytics']>
): Promise<UserProfile> {
  const existingProfile = await getUserProfile(userId);
  if (!existingProfile) {
    throw new Error(`User profile not found: ${userId}`);
  }

  const updatedAnalytics = {
    ...existingProfile.analytics,
    ...analyticsUpdate
  };

  return updateUserProfile(userId, {
    analytics: updatedAnalytics,
    lastLoginAt: Timestamp.now()
  });
}

/**
 * Get subscription tier distribution
 */
export async function getSubscriptionTierDistribution(): Promise<Record<SubscriptionTier, number>> {
  const db = getFirestore();
  const profilesRef = collection(db, COLLECTION_NAME);
  const q = query(profilesRef, where('status', '==', AccountStatus.ACTIVE));

  try {
    const snapshot = await getDocs(q);
    const distribution: Record<SubscriptionTier, number> = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 0,
      [SubscriptionTier.PREMIUM]: 0,
      [SubscriptionTier.ENTERPRISE]: 0
    };

    snapshot.docs.forEach(doc => {
      const data = doc.data() as UserProfile;
      const tier = data.subscription?.tier || SubscriptionTier.FREE;
      distribution[tier]++;
    });

    return distribution;
  } catch (error) {
    logger.error('Failed to get subscription tier distribution', { error });
    throw new Error(`Failed to get subscription tier distribution: ${error}`);
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch create UserProfiles
 */
export async function batchCreateUserProfiles(
  profilesData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<UserProfile[]> {
  const db = getFirestore();
  const batch = db.batch();
  const profiles: UserProfile[] = [];

  const now = Timestamp.now();

  for (const profileData of profilesData) {
    const profilesRef = collection(db, COLLECTION_NAME);
    const newProfileRef = doc(profilesRef);

    const profile: UserProfile = {
      ...profileData,
      id: newProfileRef.id,
      createdAt: now,
      updatedAt: now
    };

    // Validate each profile
    const validationErrors = validateUserProfile(profile);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed for profile ${profile.email}: ${validationErrors.join(', ')}`);
    }

    batch.set(newProfileRef, profile);
    profiles.push(profile);

    // Cache the profile
    setCachedProfile(profile);
  }

  try {
    await batch.commit();
    logger.info('Batch created UserProfiles', { count: profiles.length });
    return profiles;
  } catch (error) {
    logger.error('Failed to batch create UserProfiles', { error, count: profilesData.length });
    throw new Error(`Failed to batch create user profiles: ${error}`);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if user exists by email
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const profile = await getUserProfileByEmail(email);
    return profile !== null;
  } catch (error) {
    logger.error('Failed to check if user exists by email', { error, email });
    return false;
  }
}

/**
 * Clear all cached profiles (for testing/debugging)
 */
export function clearProfileCache(): void {
  cache.clear();
  logger.debug('UserProfile cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys())
  };
}
/**
 * Authentication Service
 * 
 * Core authentication service providing user management, session handling,
 * and integration with Firebase Authentication and Google OAuth.
  */

// NOTE: This service uses client-side Firebase Auth (firebase/auth)
// It should be moved to the frontend package or refactored to use firebase-admin
// Temporarily using type placeholders to allow backend compilation

// import {
//   Auth,
//   User as FirebaseUser,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut as firebaseSignOut,
//   onAuthStateChanged,
//   GoogleAuthProvider,
//   signInWithRedirect,
//   getRedirectResult,
//   updateProfile,
//   sendEmailVerification,
//   sendPasswordResetEmail,
//   type UserCredential,
//   type Unsubscribe
// } from 'firebase/auth';

// Type placeholders for compilation
type Auth = any;
type FirebaseUser = any;
type UserCredential = any;
type Unsubscribe = any;
const signInWithEmailAndPassword = (...args: any[]): any => null;
const createUserWithEmailAndPassword = (...args: any[]): any => null;
const firebaseSignOut = (...args: any[]): any => null;
const onAuthStateChanged = (...args: any[]): any => null;
const GoogleAuthProvider = class {} as any;
const signInWithRedirect = (...args: any[]): any => null;
const getRedirectResult = (...args: any[]): any => null;
const updateProfile = (...args: any[]): any => null;
const sendEmailVerification = (...args: any[]): any => null;
const sendPasswordResetEmail = (...args: any[]): any => null;

import type {
  AuthState,
  AuthConfig,
  AuthCredentials,
  AuthenticatedUser,
  UserProfile,
  AuthEvents,
  AuthValidationResult,
  AuthTokenInfo,
  AuthError
} from '../types';

import { TokenService } from './token.service';
import { SessionService } from './session.service';
// Premium and Calendar services are provided by higher layer modules
// Auth module only depends on @cvplus/core (Layer 1 dependency rules)
import { createAuthError } from '../utils/errors';
import { validateEmail, validatePassword } from '../utils/validation';
import { requireAuthentication, updateLastLogin } from '../utils/auth-helpers';
import { logger } from '../utils/logger';
import { AUTH_EVENTS, GOOGLE_AUTH_SCOPES, GOOGLE_CALENDAR_SCOPES } from '../constants/auth.constants';

export class AuthService {
  private static instance: AuthService | null = null;
  private auth: Auth | null = null;
  private config: AuthConfig | null = null;
  private state: AuthState;
  private listeners: Partial<AuthEvents> = {};
  private unsubscribeAuth: Unsubscribe | null = null;
  private tokenService: TokenService | null = null;
  private sessionService: SessionService | null = null;
  // Premium and calendar services removed to comply with Layer 1 dependency rules
  // These services will be injected by higher layer modules when needed

  // Private constructor for singleton pattern
  private constructor() {
    this.state = this.initializeState();
  }

  // ============================================================================
  // SINGLETON PATTERN
  // ============================================================================
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  public async initialize(auth: Auth, config: AuthConfig): Promise<void> {
    try {
      this.auth = auth;
      this.config = config;

      // Initialize dependent services (only Layer 1 services)
      this.tokenService = new TokenService(config);
      this.sessionService = new SessionService(config.session || {});

      // Set up auth state listener
      this.setupAuthStateListener();

      // Handle redirect result for OAuth
      await this.handleRedirectResult();

      this.state.isInitialized = true;
      this.state.initializationTime = Date.now();

      logger.info('AuthService initialized successfully');
    } catch (error) {
      const authError = createAuthError(
        'auth/initialization-failed',
        'Failed to initialize authentication service',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      this.state.error = authError;
      this.emitEvent('onAuthError', authError);
      
      throw authError;
    }
  }

  private initializeState(): AuthState {
    return {
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      user: null,
      firebaseUser: null,
      profile: null,
      session: {
        isAuthenticated: false,
        isLoading: false,
        session: null,
        currentSession: null,
        isActive: false,
        lastActivity: null,
        sessions: new Map(),
        syncTimer: null,
        tokens: { accessToken: null, refreshToken: null },
        error: null,
        lastSyncAt: 0
      },
      permissions: {
        'cv:create': true,
        'cv:read': true,
        'cv:update': true,
        'cv:delete': true,
        'cv:share': false,
        'cv:export': true,
        'templates:view': true,
        'templates:use': true,
        'templates:create': false,
        'templates:manage': false,
        'features:basic': true,
        'features:premium': false,
        'features:web_portal': false,
        'features:ai_chat': false,
        'features:podcast': false,
        'features:video': false,
        'features:analytics': false,
        'media:generate': false,
        'media:upload': true,
        'media:manage': false,
        'analytics:view': false,
        'analytics:export': false,
        'analytics:manage': false,
        'admin:users': false,
        'admin:roles': false,
        'admin:permissions': false,
        'admin:system': false,
        'admin:billing': false
      },
      error: null,
      lastUpdated: Date.now()
    };
  }

  // ============================================================================
  // AUTH STATE MANAGEMENT
  // ============================================================================

  private setupAuthStateListener(): void {
    if (!this.auth) throw new Error('Auth not initialized');

    this.unsubscribeAuth = onAuthStateChanged(
      this.auth,
      async (firebaseUser) => {
        await this.handleAuthStateChange(firebaseUser);
      },
      (error) => {
        logger.error('Auth state change error:', error);
        const authError = createAuthError(
          'auth/unknown-error',
          'Authentication state change error',
          { originalError: error }
        );
        this.updateState({ error: authError });
        this.emitEvent('onAuthError', authError);
      }
    );
  }

  private async handleAuthStateChange(firebaseUser: FirebaseUser | null): Promise<void> {
    this.state.isLoading = true;
    this.state.firebaseUser = firebaseUser;

    if (firebaseUser) {
      try {
        // Create authenticated user object
        const authenticatedUser = await this.createAuthenticatedUser(firebaseUser);
        
        // Initialize session
        if (this.sessionService) {
          await this.sessionService.initializeSession(authenticatedUser);
        }

        // Load user profile
        const profile = await this.loadUserProfile(authenticatedUser.uid);

        // Load premium status - delegated to higher layer modules
        // Premium service is now provided by @cvplus/premium module
        // if (this.premiumService) {
        //   const premium = await this.premiumService.loadPremiumStatus(authenticatedUser.uid);
        //   this.state.premium = premium;
        // }

        // Update permissions based on premium status
        this.updatePermissions();

        // Update state
        this.updateState({
          isAuthenticated: true,
          isLoading: false,
          user: authenticatedUser,
          profile,
          error: null
        });

        this.emitEvent('onSignIn', authenticatedUser);
        this.emitEvent('onAuthStateChanged', authenticatedUser);

        logger.info('User authenticated successfully', {
          uid: authenticatedUser.uid,
          email: authenticatedUser.email,
          provider: authenticatedUser.providerId
        });

      } catch (error) {
        logger.error('Failed to handle auth state change:', error);
        const authError = createAuthError(
          'auth/initialization-failed',
          'Failed to initialize user session',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );

        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          profile: null,
          error: authError
        });

        this.emitEvent('onAuthError', authError);
      }
    } else {
      // User signed out
      await this.handleSignOut();
    }
  }

  private async createAuthenticatedUser(firebaseUser: FirebaseUser): Promise<AuthenticatedUser> {
    // Check calendar permissions - delegated to higher layer modules
    // Calendar service is now provided by @cvplus/calendar or @cvplus/core module
    const hasCalendarPermissions = false; // Default value, will be provided by external services
    const calendarTokens = undefined; // Calendar tokens managed by higher layer modules

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      emailVerified: firebaseUser.emailVerified,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      providerId: firebaseUser.providerData[0]?.providerId || 'unknown',
      createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()).getTime(),
      lastLoginAt: new Date(firebaseUser.metadata.lastSignInTime || Date.now()).getTime(),
      firebaseUser,
      hasCalendarPermissions,
      calendarTokens
    };
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  public async signIn(credentials: AuthCredentials): Promise<AuthenticatedUser> {
    if (!this.auth) throw new Error('Auth not initialized');

    try {
      this.clearError();
      
      if (credentials.provider === 'email') {
        if (!credentials.password) {
          throw createAuthError('auth/invalid-credential', 'Password is required for email authentication');
        }

        if (!validateEmail(credentials.email)) {
          throw createAuthError('auth/invalid-email', 'Invalid email format');
        }

        if (!validatePassword(credentials.password)) {
          throw createAuthError('auth/weak-password', 'Password does not meet requirements');
        }

        const result = await signInWithEmailAndPassword(this.auth, credentials.email, credentials.password);
        return await this.createAuthenticatedUser(result.user);
      } else {
        throw createAuthError('auth/operation-not-allowed', `Provider ${credentials.provider} not supported`);
      }
    } catch (error) {
      const authError = this.handleFirebaseError(error);
      this.updateState({ error: authError });
      throw authError;
    }
  }

  public async signUp(credentials: AuthCredentials): Promise<AuthenticatedUser> {
    if (!this.auth || !this.config) throw new Error('Auth not initialized');

    try {
      this.clearError();

      if (credentials.provider === 'email') {
        if (!credentials.password) {
          throw createAuthError('auth/invalid-credential', 'Password is required for email signup');
        }

        if (!validateEmail(credentials.email)) {
          throw createAuthError('auth/invalid-email', 'Invalid email format');
        }

        if (!validatePassword(credentials.password)) {
          throw createAuthError('auth/weak-password', 'Password does not meet requirements');
        }

        const result = await createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password);
        
        // Send email verification if required
        if (this.config.security.requireEmailVerification) {
          await sendEmailVerification(result.user);
        }

        // Update display name if provided
        if (credentials.additionalData?.displayName) {
          await updateProfile(result.user, {
            displayName: credentials.additionalData.displayName
          });
        }

        const authenticatedUser = await this.createAuthenticatedUser(result.user);

        // Create user profile
        await this.createUserProfile(authenticatedUser, credentials.additionalData);

        return authenticatedUser;
      } else {
        throw createAuthError('auth/operation-not-allowed', `Provider ${credentials.provider} not supported`);
      }
    } catch (error) {
      const authError = this.handleFirebaseError(error);
      this.updateState({ error: authError });
      throw authError;
    }
  }

  public async signInWithGoogle(): Promise<AuthenticatedUser> {
    if (!this.auth || !this.config) throw new Error('Auth not initialized');

    try {
      this.clearError();

      if (!this.config.providers?.google?.enabled) {
        throw createAuthError('auth/operation-not-allowed', 'Google authentication is disabled');
      }

      const provider = new GoogleAuthProvider();
      
      // Add standard OAuth scopes
      GOOGLE_AUTH_SCOPES.forEach(scope => provider.addScope(scope));
      
      // Add calendar scopes if integration is enabled
      if (this.config.features?.enableCalendarIntegration) {
        GOOGLE_CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
      }

      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline',
        ...(this.config.providers?.google?.customParameters || {})
      });

      if (this.config.providers?.google?.hostedDomain) {
        provider.setCustomParameters({
          hd: this.config.providers.google.hostedDomain
        });
      }

      // Use redirect flow for better mobile support
      await signInWithRedirect(this.auth, provider);
      
      // Note: The actual result will be handled by handleRedirectResult
      // This method will complete when the redirect returns
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(createAuthError('auth/timeout', 'Google sign-in timed out'));
        }, 60000); // 1 minute timeout

        const unsubscribe = onAuthStateChanged(this.auth!, (user) => {
          if (user) {
            clearTimeout(timeout);
            unsubscribe();
            this.createAuthenticatedUser(user).then(resolve).catch(reject);
          }
        });
      });

    } catch (error) {
      const authError = this.handleFirebaseError(error);
      this.updateState({ error: authError });
      throw authError;
    }
  }

  public async signOut(): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');

    try {
      this.clearError();
      
      // Clear all services
      if (this.sessionService) {
        await this.sessionService.endSession();
      }
      
      if (this.tokenService) {
        this.tokenService.clearTokenCache();
      }

      // Sign out from Firebase
      await firebaseSignOut(this.auth);

      await this.handleSignOut();

    } catch (error) {
      const authError = this.handleFirebaseError(error);
      this.updateState({ error: authError });
      throw authError;
    }
  }

  private async handleSignOut(): Promise<void> {
    // Clear state
    this.updateState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      firebaseUser: null,
      profile: null,
      // Premium removed - handled by @cvplus/premium module
      permissions: this.initializeState().permissions,
      error: null
    });

    // Clear session state
    if (this.sessionService) {
      this.sessionService.clearSession();
    }

    this.emitEvent('onSignOut');
    this.emitEvent('onAuthStateChanged', null);

    logger.info('User signed out successfully');
  }

  public async resetPassword(email: string): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');

    try {
      this.clearError();
      await sendPasswordResetEmail(this.auth, email);
      logger.info('Password reset email sent successfully', { email });
    } catch (error) {
      const authError = this.handleFirebaseError(error);
      this.updateState({ error: authError });
      throw authError;
    }
  }

  // ============================================================================
  // REDIRECT RESULT HANDLING
  // ============================================================================

  private async handleRedirectResult(): Promise<void> {
    if (!this.auth) return;

    try {
      const result = await Promise.race([
        getRedirectResult(this.auth),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getRedirectResult timeout')), 5000)
        )
      ]) as UserCredential | null;

      if (result && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        
        // Store calendar tokens if available - delegated to higher layer modules
        // Calendar token storage is now handled by @cvplus/calendar or external services
        // if (credential?.accessToken && this.calendarService) {
        //   await this.calendarService.storeGoogleTokens(result.user.uid, credential.accessToken);
        // }

        logger.info('Google OAuth redirect handled successfully', {
          uid: result.user.uid,
          email: result.user.email,
          hasCalendarToken: !!credential?.accessToken
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'getRedirectResult timeout') {
        logger.debug('getRedirectResult timed out - likely no redirect occurred');
      } else {
        logger.error('Error handling redirect result:', error);
      }
    }
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  private async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      // Import Firestore functions dynamically - we'll use the Firestore instance from config
      const { doc, getDoc, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance from the same app as auth
      const db = getFirestore(this.auth!.app);
      
      const userDoc = doc(db, 'users', uid);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        logger.debug('User profile loaded from Firestore', { uid });
        
        return {
          uid,
          email: data.email,
          emailVerified: data.emailVerified || false,
          displayName: data.displayName,
          photoURL: data.photoURL,
          providerId: data.providerId || 'firebase',
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || Date.now(),
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          timezone: data.timezone,
          locale: data.locale,
          preferences: data.preferences || this.getDefaultPreferences(),
          metadata: data.metadata || this.getDefaultMetadata()
        };
      }
      
      logger.debug('No user profile found in Firestore', { uid });
      return null;
    } catch (error) {
      logger.error('Failed to load user profile:', error);
      return null;
    }
  }

  private async createUserProfile(user: AuthenticatedUser, additionalData?: Record<string, any>): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      providerId: user.providerId,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      firstName: additionalData?.firstName,
      lastName: additionalData?.lastName,
      phoneNumber: additionalData?.phoneNumber,
      timezone: additionalData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: additionalData?.locale || navigator.language,
      preferences: {
        theme: 'light',
        language: navigator.language.split('-')[0] || 'en',
        notifications: {
          email: true,
          push: false,
          marketing: false
        },
        privacy: {
          profileVisibility: 'private',
          analyticsOptOut: false
        }
      },
      metadata: {
        lastActiveAt: Date.now(),
        loginCount: 1,
        signUpSource: additionalData?.source || 'direct',
        referralCode: additionalData?.referralCode,
        experimentGroups: [],
        customFields: additionalData?.customFields || {}
      }
    };

    // Save profile to Firestore
    try {
      await this.saveUserProfile(profile);
      logger.info('User profile created and saved', { uid: user.uid });
    } catch (error) {
      logger.error('Failed to save user profile to Firestore:', error);
      // Don't throw error - profile creation succeeded locally
    }

    return profile;
  }

  private async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      // Import Firestore functions dynamically
      const { doc, setDoc, serverTimestamp, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance from the same app as auth
      const db = getFirestore(this.auth!.app);
      
      const userDoc = doc(db, 'users', profile.uid);
      
      // Prepare profile data for Firestore with server timestamp
      const profileData = {
        ...profile,
        lastUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userDoc, profileData, { merge: true });
      logger.debug('User profile saved to Firestore', { uid: profile.uid });
    } catch (error) {
      logger.error('Failed to save user profile:', error);
      throw error;
    }
  }

  public async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.state.user) {
      throw createAuthError('auth/user-not-found', 'No authenticated user');
    }

    try {
      // Update Firebase profile if display name or photo changed
      if (this.auth?.currentUser && (updates.displayName !== undefined || updates.photoURL !== undefined)) {
        await updateProfile(this.auth.currentUser, {
          displayName: updates.displayName || null,
          photoURL: updates.photoURL || null
        });
      }

      // Update local profile state
      const updatedProfile = {
        ...this.state.profile,
        ...updates,
        metadata: {
          ...this.state.profile?.metadata,
          ...updates.metadata,
          lastActiveAt: Date.now()
        }
      } as UserProfile;

      this.updateState({ profile: updatedProfile });
      this.emitEvent('onProfileUpdated', updatedProfile);

      logger.info('Profile updated successfully', { uid: this.state.user.uid });
      return updatedProfile;

    } catch (error) {
      const authError = this.handleFirebaseError(error);
      throw authError;
    }
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  private updatePermissions(): void {
    // Update permissions based on user roles
    // Premium-based permissions are handled by @cvplus/premium module
    const permissions = { ...this.initializeState().permissions };

    // Check for admin roles (would be loaded from user profile/roles)
    // if (this.state.profile?.roles?.includes('admin')) {
    //   Object.keys(permissions).forEach(key => {
    //     permissions[key as keyof typeof permissions] = true;
    //   });
    // }

    this.state.permissions = permissions;
  }

  public hasPermission(permission: keyof typeof this.state.permissions): boolean {
    return this.state.permissions[permission] || false;
  }

  // ============================================================================
  // CALENDAR INTEGRATION - DEPRECATED (moved to higher layer modules)
  // ============================================================================

  public async requestCalendarPermissions(): Promise<void> {
    // Calendar integration moved to @cvplus/calendar or external services
    // Auth module should not handle calendar-specific functionality
    throw createAuthError(
      'auth/operation-not-allowed',
      'Calendar permissions are now managed by higher layer modules'
    );
  }

  public hasCalendarPermissions(): boolean {
    // Calendar permissions checking delegated to higher layer modules
    return false; // Default value, actual check should be done externally
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  public async refreshSession(): Promise<void> {
    if (!this.sessionService || !this.state.user) {
      throw createAuthError('auth/session-expired', 'No active session to refresh');
    }

    try {
      await this.sessionService.refreshSession();
      this.updateState({ session: this.sessionService.getSessionState() });
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  public async validateSession(): Promise<boolean> {
    if (!this.sessionService) return false;
    
    try {
      const isValid = await this.sessionService.validateSession();
      this.updateState({ session: this.sessionService.getSessionState() });
      return isValid;
    } catch (error) {
      logger.error('Session validation failed:', error);
      return false;
    }
  }

  // ============================================================================
  // PREMIUM INTEGRATION
  // ============================================================================

  public async refreshPremiumStatus(): Promise<void> {
    // Premium status refresh delegated to @cvplus/premium module
    // Auth module should not handle premium-specific functionality
    throw createAuthError(
      'auth/operation-not-allowed',
      'Premium status management is now handled by higher layer modules'
    );
  }

  public checkFeatureAccess(feature: string): boolean {
    // Feature access checking delegated to @cvplus/premium module
    // Auth module should not handle premium feature logic (Layer 1 dependency rules)
    throw createAuthError(
      'auth/operation-not-allowed',
      'Feature access checking is now handled by higher layer modules'
    );
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  public async getAuthToken(forceRefresh = false): Promise<string | null> {
    if (!this.tokenService || !this.state.firebaseUser) return null;
    
    try {
      return await this.tokenService.getAuthToken(this.state.firebaseUser, forceRefresh);
    } catch (error) {
      logger.error('Failed to get auth token:', error);
      return null;
    }
  }

  public async validateToken(token: string): Promise<AuthValidationResult> {
    if (!this.tokenService) {
      return {
        isValid: false,
        user: null,
        error: createAuthError('auth/invalid-configuration', 'Token service not initialized')
      };
    }

    try {
      return await this.tokenService.validateToken(token);
    } catch (error) {
      return {
        isValid: false,
        user: null,
        error: this.handleFirebaseError(error)
      };
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleFirebaseError(error: any): AuthError {
    if (error?.code && error?.message) {
      // Firebase error
      return createAuthError(
        error.code,
        this.getFriendlyErrorMessage(error.code),
        { originalError: error }
      );
    } else if (error instanceof Error) {
      return createAuthError(
        'auth/unknown-error',
        error.message,
        { originalError: error }
      );
    } else {
      return createAuthError(
        'auth/unknown-error',
        'An unknown authentication error occurred'
      );
    }
  }

  private getFriendlyErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/popup-blocked': 'Authentication was blocked. Please try again.',
      'auth/operation-not-allowed': 'This authentication method is not enabled.'
    };

    return messages[errorCode] || 'An error occurred during authentication. Please try again.';
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private updateState(updates: Partial<AuthState>): void {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: Date.now()
    };
  }

  public getState(): AuthState {
    return { ...this.state };
  }

  public clearError(): void {
    this.updateState({ error: null });
  }

  public getLastError(): AuthError | null {
    return this.state.error;
  }

  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================

  public addEventListener<K extends keyof AuthEvents>(event: K, listener: AuthEvents[K]): void {
    this.listeners[event] = listener;
  }

  public removeEventListener<K extends keyof AuthEvents>(event: K): void {
    delete this.listeners[event];
  }

  private emitEvent<K extends keyof AuthEvents>(event: K, ...args: Parameters<NonNullable<AuthEvents[K]>>): void {
    const listener = this.listeners[event];
    if (listener) {
      try {
        (listener as any)(...args);
      } catch (error) {
        logger.error(`Error in ${event} listener:`, error);
      }
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  public destroy(): void {
    // Unsubscribe from auth state changes
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }

    // Clear all listeners
    this.listeners = {};

    // Destroy dependent services
    if (this.sessionService) {
      this.sessionService.destroy();
    }

    // Reset instance
    AuthService.instance = null;

    logger.info('AuthService destroyed');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  public isLoading(): boolean {
    return this.state.isLoading;
  }

  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  public getCurrentUser(): AuthenticatedUser | null {
    return this.state.user;
  }

  public getUserProfile(): UserProfile | null {
    return this.state.profile;
  }

  public getPremiumStatus(): never {
    // Premium status management delegated to @cvplus/premium module
    throw createAuthError(
      'auth/operation-not-allowed',
      'Premium status is now handled by higher layer modules'
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getDefaultPreferences(): UserProfile['preferences'] {
    return {
      theme: 'system' as const,
      language: navigator.language || 'en',
      notifications: {
        email: true,
        push: false,
        marketing: false
      },
      privacy: {
        profileVisibility: 'private' as const,
        analyticsOptOut: false
      }
    };
  }

  private getDefaultMetadata(): UserProfile['metadata'] {
    return {
      lastActiveAt: Date.now(),
      loginCount: 1,
      signUpSource: 'web',
      referralCode: undefined,
      experimentGroups: []
    };
  }
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

export const initializeAuth = (auth: Auth, config: AuthConfig): Promise<AuthService> => {
  const authService = AuthService.getInstance();
  return authService.initialize(auth, config).then(() => authService);
};

export default AuthService;
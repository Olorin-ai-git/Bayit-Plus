/**
 * Avatar State Manager
 * Manages avatar visual state and animations
 */

import type {
  AvatarState,
  AvatarStateUpdate,
  AvatarStateListener,
  AvatarEmotion,
  AvatarAnimation,
  AvatarEmotionMapping
} from './types';

export class AvatarStateManager {
  private state: AvatarState;
  private listeners: Set<AvatarStateListener> = new Set();

  constructor(initialState?: Partial<AvatarState>) {
    this.state = {
      isVisible: initialState?.isVisible ?? false,
      isActive: initialState?.isActive ?? false,
      currentEmotion: initialState?.currentEmotion ?? 'neutral',
      currentAnimation: initialState?.currentAnimation ?? 'idle',
      isSpeaking: initialState?.isSpeaking ?? false,
      isListening: initialState?.isListening ?? false,
      position: initialState?.position,
      scale: initialState?.scale ?? 1.0,
      opacity: initialState?.opacity ?? 1.0
    };
  }

  /**
   * Get current state
   */
  getState(): AvatarState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(update: AvatarStateUpdate): void {
    const previousState = { ...this.state };

    this.state = {
      ...this.state,
      ...update
    };

    // Automatically set animation based on activity
    if (update.isSpeaking === true) {
      this.state.currentAnimation = 'talking';
    } else if (update.isListening === true) {
      this.state.currentAnimation = 'listening';
    } else if (update.isSpeaking === false && update.isListening === false) {
      this.state.currentAnimation = 'idle';
    }

    // Notify listeners only if state actually changed
    if (JSON.stringify(previousState) !== JSON.stringify(this.state)) {
      this.notifyListeners();
    }
  }

  /**
   * Show avatar
   */
  show(): void {
    this.updateState({ isVisible: true, isActive: true });
  }

  /**
   * Hide avatar
   */
  hide(): void {
    this.updateState({
      isVisible: false,
      isActive: false,
      isSpeaking: false,
      isListening: false
    });
  }

  /**
   * Set emotion
   */
  setEmotion(emotion: AvatarEmotion): void {
    this.updateState({ currentEmotion: emotion });
  }

  /**
   * Set emotion from frustration level
   */
  setEmotionFromFrustration(frustrationLevel: number): void {
    const emotion = this.mapFrustrationToEmotion(frustrationLevel);
    this.setEmotion(emotion);
  }

  /**
   * Set animation
   */
  setAnimation(animation: AvatarAnimation): void {
    this.updateState({ currentAnimation: animation });
  }

  /**
   * Start speaking
   */
  startSpeaking(): void {
    this.updateState({
      isSpeaking: true,
      isListening: false,
      currentAnimation: 'talking'
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    this.updateState({
      isSpeaking: false,
      currentAnimation: 'idle'
    });
  }

  /**
   * Start listening
   */
  startListening(): void {
    this.updateState({
      isListening: true,
      isSpeaking: false,
      currentAnimation: 'listening'
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.updateState({
      isListening: false,
      currentAnimation: 'idle'
    });
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.state = {
      isVisible: false,
      isActive: false,
      currentEmotion: 'neutral',
      currentAnimation: 'idle',
      isSpeaking: false,
      isListening: false,
      scale: 1.0,
      opacity: 1.0
    };
    this.notifyListeners();
  }

  /**
   * Add state listener
   */
  addListener(listener: AvatarStateListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove state listener
   */
  removeListener(listener: AvatarStateListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Notify listeners of state change
   */
  private notifyListeners(): void {
    const currentState = { ...this.state };
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }

  /**
   * Map frustration level to emotion
   */
  private mapFrustrationToEmotion(frustrationLevel: number): AvatarEmotion {
    const mappings: AvatarEmotionMapping[] = [
      { frustrationLevel: 0.8, emotion: 'apologetic' },
      { frustrationLevel: 0.6, emotion: 'empathetic' },
      { frustrationLevel: 0.4, emotion: 'thinking' },
      { frustrationLevel: 0.2, emotion: 'happy' },
      { frustrationLevel: 0.0, emotion: 'excited' }
    ];

    for (const mapping of mappings) {
      if (frustrationLevel >= mapping.frustrationLevel) {
        return mapping.emotion;
      }
    }

    return 'neutral';
  }
}

// Singleton instance
export const avatarStateManager = new AvatarStateManager();

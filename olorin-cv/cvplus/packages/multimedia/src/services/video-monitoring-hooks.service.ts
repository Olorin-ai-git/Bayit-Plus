/**
 * Video Monitoring Hooks Service
 * Provides monitoring and lifecycle hooks for video generation
  */

export interface VideoHookEvent {
  videoId: string;
  event: 'started' | 'progress' | 'completed' | 'failed';
  timestamp: Date;
  data?: any;
}

export interface VideoMonitoringConfig {
  enableHooks: boolean;
  progressInterval: number;
  timeoutMinutes: number;
  retryAttempts: number;
}

export class VideoMonitoringHooksService {
  private static hooks: Map<string, Function[]> = new Map();
  private static config: VideoMonitoringConfig = {
    enableHooks: true,
    progressInterval: 10000, // 10 seconds
    timeoutMinutes: 30,
    retryAttempts: 3
  };

  static onVideoStarted(videoId: string, callback: (event: VideoHookEvent) => void): void {
    this.addHook(videoId, 'started', callback);
  }

  static onVideoProgress(videoId: string, callback: (event: VideoHookEvent) => void): void {
    this.addHook(videoId, 'progress', callback);
  }

  static onVideoCompleted(videoId: string, callback: (event: VideoHookEvent) => void): void {
    this.addHook(videoId, 'completed', callback);
  }

  static onVideoFailed(videoId: string, callback: (event: VideoHookEvent) => void): void {
    this.addHook(videoId, 'failed', callback);
  }

  static triggerHook(event: VideoHookEvent): void {
    const hooks = this.hooks.get(`${event.videoId}:${event.event}`) || [];
    hooks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Hook execution failed:', error);
      }
    });
  }

  private static addHook(videoId: string, eventType: string, callback: Function): void {
    const key = `${videoId}:${eventType}`;
    const hooks = this.hooks.get(key) || [];
    hooks.push(callback);
    this.hooks.set(key, hooks);
  }

  static removeHooks(videoId: string): void {
    const keysToRemove = Array.from(this.hooks.keys()).filter(key =>
      key.startsWith(`${videoId}:`)
    );
    keysToRemove.forEach(key => this.hooks.delete(key));
  }
}

export default VideoMonitoringHooksService;
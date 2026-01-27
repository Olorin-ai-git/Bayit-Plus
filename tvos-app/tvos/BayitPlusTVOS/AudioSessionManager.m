/**
 * AudioSessionManager Bridge
 * Exports Swift AudioSessionManager to React Native
 *
 * Updated for React Native 0.76 TurboModule Architecture
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AudioSessionManager, NSObject)

// Audio session configuration
RCT_EXTERN_METHOD(configureAudioSession:(NSString *)mode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setAudioCategory:(NSString *)category
                  options:(NSArray *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(enableBackgroundAudio:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(duckAudioForVoice:(BOOL)enabled
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Now Playing Info Center
RCT_EXTERN_METHOD(updateNowPlayingInfo:(NSDictionary *)metadata
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearNowPlayingInfo:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Remote Command Center
RCT_EXTERN_METHOD(setupRemoteCommandHandlers:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end

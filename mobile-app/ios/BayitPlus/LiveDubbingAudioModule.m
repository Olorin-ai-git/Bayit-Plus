/**
 * LiveDubbingAudioModule Bridge
 * Exports Swift LiveDubbingAudioModule to React Native
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveDubbingAudioModule, NSObject)

// Play base64-encoded audio
RCT_EXTERN_METHOD(playAudio:(NSString *)base64Audio
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Volume control
RCT_EXTERN_METHOD(setDubbedVolume:(double)volume
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setOriginalVolume:(double)volume
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Playback control
RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cleanup:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Status
RCT_EXTERN_METHOD(isPlaying:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end

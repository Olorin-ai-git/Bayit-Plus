/**
 * TTSModule Bridge
 * Exports Swift TTSModule to React Native
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TTSModule, NSObject)

// TTS methods
RCT_EXTERN_METHOD(speak:(NSString *)text
                  language:(NSString *)language
                  rate:(double)rate
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pause:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resume:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isSpeaking:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAvailableVoices:(NSString *)language
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end

/**
 * AudioCaptureModule.m - Objective-C Bridge for React Native TurboModule
 *
 * This file exposes the Swift AudioCaptureModule to React Native
 * through the RCT_EXTERN_MODULE and RCT_EXTERN_METHOD macros.
 *
 * Updated for React Native 0.76 New Architecture
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Import Swift generated header to expose Swift classes to Objective-C
#import "BayitPlusTVOS-Swift.h"

@interface RCT_EXTERN_MODULE(AudioCaptureModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startListening:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopListening:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAudioLevel:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearBuffer:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isCurrentlyListening:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Event emitter methods required for TurboModule
RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(double)count)

// Required for TurboModule support
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end

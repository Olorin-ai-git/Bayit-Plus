/**
 * SiriModule Bridge
 * Exports Swift SiriModule to React Native
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SiriModule, NSObject)

// Intent donation methods
RCT_EXTERN_METHOD(donatePlayIntent:(NSString *)contentId
                  contentTitle:(NSString *)contentTitle
                  contentType:(NSString *)contentType
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(donateSearchIntent:(NSString *)query
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(donateResumeIntent:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(donateWidgetIntent:(NSString *)widgetType
                  channelId:(NSString *)channelId
                  channelName:(NSString *)channelName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Shortcut management
RCT_EXTERN_METHOD(getSuggestedShortcuts:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteAllShortcuts:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end

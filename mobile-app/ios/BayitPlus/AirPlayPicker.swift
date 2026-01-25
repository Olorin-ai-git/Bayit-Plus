/**
 * AirPlayPicker.swift
 * Native iOS AirPlay picker view manager for React Native
 */

import AVKit
import UIKit

@objc(AirPlayPicker)
class AirPlayPicker: RCTViewManager {
  override func view() -> UIView! {
    let picker = AVRoutePickerView()
    picker.tintColor = UIColor.systemPurple
    picker.activeTintColor = UIColor.systemPurple
    picker.prioritizesVideoDevices = true
    return picker
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

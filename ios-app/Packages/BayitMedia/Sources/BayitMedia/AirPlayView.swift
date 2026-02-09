#if os(iOS)
import AVKit
import SwiftUI
import UIKit

/// SwiftUI wrapper for AVRoutePickerView (AirPlay 2 device picker).
///
/// Ported from mobile-app/ios/BayitPlus/AirPlayPicker.swift,
/// removing RCT bridge and converting to UIViewRepresentable.
///
/// Available on iOS only. tvOS manages AirPlay routing through the system.
public struct AirPlayView: UIViewRepresentable {

    private let tintColor: UIColor
    private let activeTintColor: UIColor
    private let prioritizesVideoDevices: Bool

    public init(
        tintColor: UIColor = .systemPurple,
        activeTintColor: UIColor = .systemPurple,
        prioritizesVideoDevices: Bool = true
    ) {
        self.tintColor = tintColor
        self.activeTintColor = activeTintColor
        self.prioritizesVideoDevices = prioritizesVideoDevices
    }

    public func makeUIView(context: Context) -> AVRoutePickerView {
        let picker = AVRoutePickerView()
        picker.tintColor = tintColor
        picker.activeTintColor = activeTintColor
        picker.prioritizesVideoDevices = prioritizesVideoDevices
        return picker
    }

    public func updateUIView(_ uiView: AVRoutePickerView, context: Context) {
        uiView.tintColor = tintColor
        uiView.activeTintColor = activeTintColor
    }
}
#endif

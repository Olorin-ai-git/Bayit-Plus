#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Navigation UI Extension (Layer 4)

    extension TVZehAniHubView {
        var tvZehAniNavigationUILayer: some View {
            VStack {
                Spacer()
                HStack(alignment: .bottom) {
                    TVZehAniSelectButton(localization: localization) {
                        if let card = focusedCard {
                            navigationTarget = card
                        }
                    }
                    .padding(.leading, 80)
                    Spacer()
                    VStack(spacing: 12) {
                        Text(localization.t("zehAni.hub.swipeHint"))
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(Color.white.opacity(0.5))
                        TVZehAniProgressIndicator(
                            count: ZehAniFeatureCard.allCases.count,
                            activeIndex: focusedCard?.cardIndex ?? 0
                        )
                    }
                    Spacer()
                    Color.clear
                        .frame(width: 180, height: 1)
                        .padding(.trailing, 80)
                }
                .padding(.bottom, 50)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    // MARK: - Select Button

    struct TVZehAniSelectButton: View {
        let localization: LocalizationManager
        let action: () -> Void

        @FocusState private var isFocused: Bool

        var body: some View {
            Button(action: action) {
                HStack(spacing: 10) {
                    Image(systemName: "appletv.fill")
                        .font(.system(size: 18))
                        .foregroundColor(DesignTokens.Primary.p400)
                    Text(localization.t("common.select"))
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(Color.white.opacity(0.1))
                        .overlay(
                            Capsule()
                                .stroke(Color.white.opacity(0.15), lineWidth: 1)
                        )
                )
            }
            .buttonStyle(.plain)
            .focused($isFocused)
        }
    }

    // MARK: - Progress Indicator

    struct TVZehAniProgressIndicator: View {
        let count: Int
        let activeIndex: Int

        var body: some View {
            HStack(spacing: 6) {
                ForEach(0 ..< count, id: \.self) { index in
                    Capsule()
                        .fill(
                            index == activeIndex
                                ? Color(hex: 0x3B82F6)
                                : Color.white.opacity(0.25)
                        )
                        .frame(
                            width: index == activeIndex ? 32 : 8,
                            height: 4
                        )
                        .animation(.easeInOut(duration: 0.3), value: activeIndex)
                }
            }
        }
    }
#endif

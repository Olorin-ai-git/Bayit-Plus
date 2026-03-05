import SwiftUI

/// Glass-styled modal matching the @bayit/glass GlassModal component
public struct GlassModal<Content: View>: View {
    @Binding var isPresented: Bool
    let content: () -> Content

    public init(
        isPresented: Binding<Bool>,
        @ViewBuilder content: @escaping () -> Content
    ) {
        _isPresented = isPresented
        self.content = content
    }

    public var body: some View {
        ZStack {
            if isPresented {
                Color.adaptive(
                    light: { PlatformColor.black.withAlphaComponent(0.35) },
                    dark: { PlatformColor.black.withAlphaComponent(0.75) }
                )
                .ignoresSafeArea()
                .onTapGesture { isPresented = false }
                .transition(.opacity)

                content()
                    .glassCard()
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .transition(.scale(scale: 0.9).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3, bounce: 0.15), value: isPresented)
    }
}

/// Glass-styled alert matching the @bayit/glass GlassAlert component
public struct GlassAlert: View {
    public enum AlertType {
        case info
        case success
        case warning
        case error

        var color: Color {
            switch self {
            case .info: return DesignTokens.Info.default
            case .success: return DesignTokens.Success.default
            case .warning: return DesignTokens.Warning.default
            case .error: return DesignTokens.ErrorColor.default
            }
        }

        var iconName: String {
            switch self {
            case .info: return "info.circle.fill"
            case .success: return "checkmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .error: return "xmark.circle.fill"
            }
        }
    }

    let type: AlertType
    let title: String
    let message: String?
    let dismissAction: (() -> Void)?

    public init(
        type: AlertType,
        title: String,
        message: String? = nil,
        dismissAction: (() -> Void)? = nil
    ) {
        self.type = type
        self.title = title
        self.message = message
        self.dismissAction = dismissAction
    }

    public var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: type.iconName)
                .font(.system(size: DesignTokens.FontSize.xl))
                .foregroundStyle(type.color)

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let message {
                    Text(message)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            Spacer()

            if let dismissAction {
                Button(action: dismissAction) {
                    Image(systemName: "xmark")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md)
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .stroke(type.color.opacity(0.3), lineWidth: 1)
        )
        .environment(\.layoutDirection, .leftToRight)
    }
}

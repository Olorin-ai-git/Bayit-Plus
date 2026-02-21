import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct SnapGridItem: View {
    @Environment(LocalizationManager.self) private var localization

    let snap: FamilySnap
    let onTap: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                CachedAsyncImage(url: URL(string: snap.imageUrl)) { phase in
                    if case let .success(image) = phase {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        Rectangle()
                            .fill(DesignTokens.Glass.bgStrong)
                    }
                }
                .frame(height: 180)
                .clipped()
                .cornerRadius(DesignTokens.Radius.sm)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t(snap.templateNameKey))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(snap.characterNames.joined(separator: ", "))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(DesignTokens.Spacing.sm)
        }
        .onTapGesture(perform: onTap)
    }
}

struct SnapDetailCard: View {
    @Environment(LocalizationManager.self) private var localization

    let snap: FamilySnap
    let onDismiss: () -> Void
    let onShare: () -> Void
    let onDownload: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                HStack {
                    Text(localization.t(snap.templateNameKey))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)

                    Spacer()

                    Button(action: onDismiss) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }

                CachedAsyncImage(url: URL(string: snap.imageUrl)) { phase in
                    if case let .success(image) = phase {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } else {
                        Rectangle()
                            .fill(DesignTokens.Glass.bgStrong)
                    }
                }
                .frame(maxHeight: 300)
                .cornerRadius(DesignTokens.Radius.lg)

                VStack(spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("snaps.characters"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)

                    Text(snap.characterNames.joined(separator: ", "))
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                }

                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassButton(localization.t("snaps.share"), variant: .primary, size: .large, action: onShare)
                    GlassButton(localization.t("snaps.download"), variant: .secondary, size: .large, action: onDownload)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
}

struct EmptySnapsView: View {
    @Environment(LocalizationManager.self) private var localization

    let onGenerate: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "photo.stack")
                    .font(.system(size: 48))
                    .foregroundColor(DesignTokens.Text.muted)

                Text(localization.t("snaps.empty_title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)

                Text(localization.t("snaps.empty_subtitle"))
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                GlassButton(localization.t("snaps.generate_first"), variant: .primary, size: .large, action: onGenerate)
                    .padding(.top, DesignTokens.Spacing.sm)
            }
            .padding(DesignTokens.Spacing.xl)
        }
        .padding(.top, DesignTokens.Spacing.xxl)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context _: Context) -> UIActivityViewController {
        return UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_: UIActivityViewController, context _: Context) {}
}

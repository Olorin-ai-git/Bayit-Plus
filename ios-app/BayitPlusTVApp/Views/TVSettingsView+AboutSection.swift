#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVSettingsView + Glass Row Components

    extension TVSettingsView {
        // MARK: - Glass Row Backgrounds

        var settingsRowBackground: some View {
            ZStack {
                Color.white.opacity(0.06)
                RoundedRectangle(cornerRadius: 16)
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }

        var settingsRowBorder: some View {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(
                    Color.white.opacity(0.12),
                    lineWidth: 1.5
                )
        }

        // MARK: - Glass Row Content

        func glassRowContent(
            title: String,
            icon: String? = nil,
            subtitle: String? = nil,
            detail: String?,
            showChevron: Bool = false
        ) -> some View {
            HStack(spacing: 16) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .frame(width: 36)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 22))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                if let detail {
                    Text(detail)
                        .font(.system(size: 24, weight: .regular))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(.horizontal, 28)
            .frame(minHeight: subtitle != nil ? 90 : 76)
            .background(settingsRowBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(settingsRowBorder)
        }

        // MARK: - Static Glass Row

        func settingsGlassRow(
            title: String,
            detail: String?
        ) -> some View {
            glassRowContent(
                title: title,
                detail: detail,
                showChevron: false
            )
        }

        // MARK: - Navigation Glass Row (with icon)

        func settingsGlassNavRow<Destination: View>(
            icon: String,
            title: String,
            subtitle: String? = nil,
            detail: String?,
            @ViewBuilder destination: () -> Destination
        ) -> some View {
            NavigationLink {
                destination()
                    .tvBreadcrumb(title, icon: icon)
            } label: {
                glassRowContent(
                    title: title,
                    icon: icon,
                    subtitle: subtitle,
                    detail: detail,
                    showChevron: true
                )
            }
            .tvCardStyle()
        }

        // MARK: - Navigation Glass Row (no icon)

        func settingsGlassNavRow<Destination: View>(
            title: String,
            subtitle: String? = nil,
            detail: String?,
            @ViewBuilder destination: () -> Destination
        ) -> some View {
            NavigationLink {
                destination()
            } label: {
                glassRowContent(
                    title: title,
                    subtitle: subtitle,
                    detail: detail,
                    showChevron: true
                )
            }
            .tvCardStyle()
        }

        // MARK: - Toggle Glass Row (custom pill switch)

        func settingsGlassToggleRow(
            title: String,
            subtitle: String? = nil,
            isOn: Binding<Bool>,
            onChange: @escaping (Bool) -> Void
        ) -> some View {
            Button {
                isOn.wrappedValue.toggle()
                onChange(isOn.wrappedValue)
            } label: {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.system(size: 28, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        if let subtitle {
                            Text(subtitle)
                                .font(.system(size: 22))
                                .foregroundStyle(DesignTokens.Text.muted)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    // Custom pill toggle switch
                    TVSettingsPillToggle(isOn: isOn.wrappedValue)
                }
                .padding(.horizontal, 28)
                .frame(minHeight: subtitle != nil ? 90 : 76)
                .background(settingsRowBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(settingsRowBorder)
            }
            .tvCardStyle()
        }
    }

    // MARK: - Custom Pill Toggle

    struct TVSettingsPillToggle: View {
        let isOn: Bool

        private let trackWidth: CGFloat = 68
        private let trackHeight: CGFloat = 38
        private let knobSize: CGFloat = 30
        private let knobPadding: CGFloat = 4

        var body: some View {
            ZStack(alignment: isOn ? .trailing : .leading) {
                Capsule()
                    .fill(
                        isOn
                            ? DesignTokens.Primary.p500
                            : Color.white.opacity(0.2)
                    )
                    .frame(width: trackWidth, height: trackHeight)

                Circle()
                    .fill(Color.white)
                    .frame(width: knobSize, height: knobSize)
                    .shadow(
                        color: Color.black.opacity(0.25),
                        radius: 2,
                        x: 0,
                        y: 1
                    )
                    .padding(.horizontal, knobPadding)
            }
            .animation(
                .spring(duration: 0.25, bounce: 0.15),
                value: isOn
            )
        }
    }
#endif

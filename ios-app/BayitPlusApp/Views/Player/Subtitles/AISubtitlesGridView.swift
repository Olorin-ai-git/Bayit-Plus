import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - AISubtitlesPickerView Grid Row Extensions

extension AISubtitlesPickerView {
    func modeOptionRow(_ option: HebrewModeOption) -> some View {
        let isAvailable = isModeAvailable(option.mode)
        let isSelected = option.mode == currentMode
        let canShowGenerateButton = !isAvailable && option.mode != .standard && isAdmin && hasHebrew

        return Button {
            if isAvailable {
                onModeSelect(option.mode)
                dismiss()
            }
        } label: {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: option.iconName)
                        .font(.system(size: 24))
                        .foregroundColor(isAvailable ? .white : .gray)
                        .frame(width: 40)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(option.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(isAvailable ? .white : .gray)

                        Text(option.description)
                            .font(.system(size: 13))
                            .foregroundColor(isAvailable ? DesignTokens.Text.muted : .gray)
                            .multilineTextAlignment(.leading)
                    }

                    Spacer()

                    if isSelected {
                        ZStack {
                            Circle()
                                .fill(option.isAI ? Color.purple : DesignTokens.Primary.p500)
                                .frame(width: 24, height: 24)

                            Image(systemName: option.isAI ? "sparkles" : "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                }

                Text(option.example)
                    .font(.system(size: 14, design: .monospaced))
                    .foregroundColor(.gray)
                    .environment(\.layoutDirection, .rightToLeft)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.leading, 52)

                if !isAvailable && option.mode != .standard {
                    if let generatableMode = option.mode.asGeneratable,
                       generatingMode == generatableMode
                    {
                        generationProgressView
                    } else if canShowGenerateButton, let generatableMode = option.mode.asGeneratable {
                        generateButton(for: generatableMode)
                    } else if !isAdmin {
                        unavailableBadge
                    }
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(isSelected ? Color.purple.opacity(0.2) : Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(isSelected ? Color.purple : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable && !canShowGenerateButton)
    }

    func generateButton(for mode: GeneratableHebrewMode) -> some View {
        Button {
            Task {
                await handleGenerateMode(mode)
            }
        } label: {
            Text(localization.t("common.generate"))
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .fill(Color.purple.opacity(0.8))
                )
        }
        .buttonStyle(.plain)
    }

    var generationProgressView: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                    .scaleEffect(0.8)

                Text(jobProgress > 0 ? "\(jobProgress)%" : localization.t("common.generating"))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(Color.purple.opacity(0.7))
            )

            Button {
                Task {
                    await handleCancelJob()
                }
            } label: {
                Text(isCancelling ? "..." : localization.t("common.cancel"))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .fill(Color.red.opacity(0.8))
                    )
            }
            .buttonStyle(.plain)
            .disabled(isCancelling)
        }
    }

    var unavailableBadge: some View {
        Text(localization.t("common.unavailable"))
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.red.opacity(0.9))
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.red.opacity(0.2))
            )
    }
}

import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Radio stations grid.
/// Reuses RadioViewModel from shared ViewModels.
struct TVRadioView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(TVAudioPlaybackManager.self) private var audioManager
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: RadioViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.stations.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.stations.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.refresh() }
                        }
                    } else {
                        stationsGrid(vm.stations)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = RadioViewModel(repository: repos.radio)
                }
                await viewModel?.loadStations()
            }
        }
    }

    private func stationsGrid(_ stations: [RadioStationItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("radio.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(stations) { station in
                    TVRadioStationItemCard(
                        station: station,
                        isActive: audioManager.activeContentId == station.id
                            && audioManager.isActive
                    ) {
                        audioManager.play(
                            contentId: station.id,
                            contentType: .radio
                        )
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0 ..< 8, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }
}

// MARK: - Radio Station Card

private struct TVRadioStationItemCard: View {
    let station: RadioStationItem
    let isActive: Bool
    let onSelect: () -> Void
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ZStack(alignment: .bottomTrailing) {
                    stationLogo
                        .frame(width: 120, height: 120)
                        .clipShape(Circle())

                    if isActive {
                        Image(systemName: "waveform")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.Primary.default)
                            .symbolEffect(.variableColor.iterative, isActive: isActive)
                    }
                }

                Text(station.name ?? "Station")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let genre = station.genre {
                    Text(genre)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isActive
                            ? DesignTokens.Primary.default
                            : (isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border),
                        lineWidth: (isActive || isFocused) ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }
        .buttonStyle(TVRadioButtonStyle())
    }

    private var stationLogo: some View {
        Group {
            if let urlStr = station.logo, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    if case let .success(img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        stationPlaceholder
                    }
                }
            } else {
                stationPlaceholder
            }
        }
    }

    private var stationPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.purpleLight
            Image(systemName: "radio")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}

private struct TVRadioButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Glass.purpleGlow.opacity(0.5) : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0, y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
    }
}

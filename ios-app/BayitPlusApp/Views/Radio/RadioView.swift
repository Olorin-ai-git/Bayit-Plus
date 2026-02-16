import BayitDesignSystem
import SwiftUI

/// Radio screen showing station cards with live status
struct RadioView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(AudioPlaybackManager.self) private var audioManager
    @State private var viewModel: RadioViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            PageHeader(icon: "radio.fill", title: "Radio")

            if let vm = viewModel {
                if vm.isLoading && vm.stations.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.stations.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    stationGrid(vm.stations)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = RadioViewModel(repository: repos.radio)
            }
            await viewModel?.loadStations()
        }
    }

    private func stationGrid(_ stations: [RadioStationItem]) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(stations) { station in
                let isActive = audioManager.activeContentId == station.id && audioManager.isActive
                StationCard(station: station, isActive: isActive) {
                    audioManager.play(contentId: station.id, contentType: .radio)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 120)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}

/// Individual radio station card
private struct StationCard: View {
    let station: RadioStationItem
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                stationLogo
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(station.name ?? "Station")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(1)

                    if let genre = station.genre {
                        Text(genre)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }

                    if let song = station.currentSong {
                        Text(song)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Primary.p400)
                            .lineLimit(1)
                    }
                }

                Spacer()

                if isActive {
                    Image(systemName: "waveform")
                        .font(.system(size: 16))
                        .foregroundColor(DesignTokens.Primary.default)
                        .symbolEffect(.variableColor.iterative, isActive: isActive)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard()
            .overlay {
                if isActive {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(DesignTokens.Primary.default.opacity(0.4), lineWidth: 1)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var stationLogo: some View {
        Group {
            if let urlStr = station.logo, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        logoPlaceholder
                    }
                }
            } else {
                logoPlaceholder
            }
        }
    }

    private var logoPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "radio")
                .font(.system(size: 24))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}

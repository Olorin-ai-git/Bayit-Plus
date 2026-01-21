import SwiftUI

/// Main menu screen with quick actions
struct MainMenuView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var showingQuickStats = false

    var body: some View {
        VStack(spacing: 32) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "waveform.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.white)

                Text("Omen")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("Ready to Translate")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.top, 80)

            Spacer()

            // Quick stats
            if coordinator.sessionHistoryManager.sessions.count > 0 {
                QuickStatsCard(
                    totalSessions: coordinator.sessionHistoryManager.sessions.count,
                    totalDuration: calculateTotalDuration()
                )
                .padding(.horizontal, 24)
            }

            // Main action button
            Button(action: {
                coordinator.startNewSession()
            }) {
                VStack(spacing: 12) {
                    Image(systemName: "mic.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.white)

                    Text("Start Session")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Text("Tap to begin real-time translation")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
                .background(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(30)
                .shadow(color: .blue.opacity(0.5), radius: 20, x: 0, y: 10)
            }
            .padding(.horizontal, 24)

            Spacer()

            // Quick actions
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                QuickActionButton(
                    icon: "gearshape.fill",
                    title: "Settings",
                    color: .orange
                ) {
                    coordinator.openSettings()
                }

                QuickActionButton(
                    icon: "clock.fill",
                    title: "History",
                    color: .green
                ) {
                    coordinator.openSessionHistory()
                }

                QuickActionButton(
                    icon: "antenna.radiowaves.left.and.right",
                    title: "Bluetooth",
                    color: .cyan
                ) {
                    coordinator.openBluetoothPairing()
                }

                QuickActionButton(
                    icon: "globe",
                    title: "Languages",
                    color: .pink
                ) {
                    coordinator.openLanguageSelection()
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 50)
        }
        .background(Color.black.ignoresSafeArea())
    }

    private func calculateTotalDuration() -> TimeInterval {
        coordinator.sessionHistoryManager.sessions.reduce(0) { $0 + $1.duration }
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title)
                    .foregroundColor(color)
                    .frame(width: 60, height: 60)
                    .background(color.opacity(0.2))
                    .cornerRadius(15)

                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(.ultraThinMaterial)
            .cornerRadius(20)
        }
    }
}

// MARK: - Quick Stats Card
struct QuickStatsCard: View {
    let totalSessions: Int
    let totalDuration: TimeInterval

    var formattedDuration: String {
        let hours = Int(totalDuration) / 3600
        let minutes = (Int(totalDuration) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    var body: some View {
        HStack(spacing: 20) {
            StatItem(
                icon: "chart.bar.fill",
                value: "\(totalSessions)",
                label: "Sessions"
            )

            Divider()
                .background(Color.white.opacity(0.3))
                .frame(height: 40)

            StatItem(
                icon: "clock.fill",
                value: formattedDuration,
                label: "Total Time"
            )
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(20)
    }
}

// MARK: - Stat Item
struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(.blue)

                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }
}

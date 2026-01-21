import SwiftUI

/// Session history view with playback and management
struct SessionHistoryView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var selectedSession: TranslationSession?
    @State private var showingDeleteConfirmation = false
    @State private var sessionToDelete: TranslationSession?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                header

                if coordinator.sessionHistoryManager.sessions.isEmpty {
                    emptyState
                } else {
                    // Sessions list
                    sessionsList
                }
            }
        }
        .sheet(item: $selectedSession) { session in
            SessionDetailView(session: session)
        }
        .alert("Delete Session", isPresented: $showingDeleteConfirmation) {
            Button("Cancel", role: .cancel) {
                sessionToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let session = sessionToDelete {
                    coordinator.sessionHistoryManager.deleteSession(session)
                }
                sessionToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this session? This action cannot be undone.")
        }
    }

    // MARK: - Header
    private var header: some View {
        VStack(spacing: 16) {
            HStack {
                Button(action: {
                    coordinator.navigate(to: .main)
                }) {
                    Image(systemName: "chevron.left.circle.fill")
                        .font(.title)
                        .foregroundColor(.white)
                }

                Spacer()

                Text("Session History")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Spacer()

                if !coordinator.sessionHistoryManager.sessions.isEmpty {
                    Menu {
                        Button(role: .destructive, action: {
                            coordinator.sessionHistoryManager.deleteAllSessions()
                        }) {
                            Label("Delete All", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.title)
                            .foregroundColor(.white)
                    }
                } else {
                    Color.clear
                        .frame(width: 40, height: 40)
                }
            }

            // Stats summary
            if !coordinator.sessionHistoryManager.sessions.isEmpty {
                statsSummary
            }
        }
        .padding()
    }

    // MARK: - Stats Summary
    private var statsSummary: some View {
        HStack(spacing: 20) {
            StatBadge(
                icon: "chart.bar.fill",
                value: "\(coordinator.sessionHistoryManager.sessions.count)",
                label: "Total"
            )

            StatBadge(
                icon: "clock.fill",
                value: totalDuration,
                label: "Time"
            )

            StatBadge(
                icon: "text.bubble.fill",
                value: "\(totalTranscripts)",
                label: "Transcripts"
            )
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }

    // MARK: - Sessions List
    private var sessionsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(coordinator.sessionHistoryManager.sessions) { session in
                    SessionCard(session: session)
                        .onTapGesture {
                            selectedSession = session
                        }
                        .contextMenu {
                            Button(action: {
                                selectedSession = session
                            }) {
                                Label("View Details", systemImage: "eye")
                            }

                            Button(role: .destructive, action: {
                                sessionToDelete = session
                                showingDeleteConfirmation = true
                            }) {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
            .padding()
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 80))
                .foregroundColor(.white.opacity(0.5))

            VStack(spacing: 8) {
                Text("No Sessions Yet")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text("Your translation sessions will appear here")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }

            Button(action: {
                coordinator.startNewSession()
            }) {
                HStack {
                    Image(systemName: "mic.circle.fill")
                    Text("Start Your First Session")
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(25)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Computed Properties
    private var totalDuration: String {
        let total = coordinator.sessionHistoryManager.sessions.reduce(0) { $0 + $1.duration }
        let hours = Int(total) / 3600
        let minutes = (Int(total) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }

    private var totalTranscripts: Int {
        coordinator.sessionHistoryManager.sessions.reduce(0) { $0 + $1.transcripts.count }
    }
}

// MARK: - Session Card
struct SessionCard: View {
    let session: TranslationSession

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: session.startTime)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(formattedDate)
                        .font(.headline)
                        .foregroundColor(.white)

                    HStack(spacing: 8) {
                        Label(session.originalLanguage, systemImage: "mic.fill")
                        Image(systemName: "arrow.right")
                        Label(session.targetLanguage, systemImage: "globe")
                    }
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.5))
            }

            Divider()
                .background(Color.white.opacity(0.2))

            // Stats
            HStack(spacing: 20) {
                SessionStat(
                    icon: "clock.fill",
                    value: session.formattedDuration
                )

                SessionStat(
                    icon: "text.bubble.fill",
                    value: "\(session.transcripts.count) items"
                )
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }
}

// MARK: - Session Stat
struct SessionStat: View {
    let icon: String
    let value: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.cyan)

            Text(value)
                .font(.caption)
                .foregroundColor(.white)
        }
    }
}

// MARK: - Stat Badge
struct StatBadge: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                    .foregroundColor(.blue)

                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Session Detail View
struct SessionDetailView: View {
    let session: TranslationSession
    @Environment(\.dismiss) var dismiss

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        return formatter.string(from: session.startTime)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Session info
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Session Details")
                                .font(.headline)
                                .foregroundColor(.white)

                            VStack(spacing: 8) {
                                DetailRow(label: "Date", value: formattedDate)
                                DetailRow(label: "Duration", value: session.formattedDuration)
                                DetailRow(label: "Languages", value: "\(session.originalLanguage) → \(session.targetLanguage)")
                                DetailRow(label: "Transcripts", value: "\(session.transcripts.count)")
                            }
                            .padding()
                            .background(.ultraThinMaterial)
                            .cornerRadius(16)
                        }

                        // Transcripts
                        if !session.transcripts.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Transcripts")
                                    .font(.headline)
                                    .foregroundColor(.white)

                                ForEach(session.transcripts) { transcript in
                                    TranscriptRow(transcript: transcript)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Session Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.blue)
                }
            }
        }
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.white.opacity(0.7))

            Spacer()

            Text(value)
                .foregroundColor(.white)
        }
        .font(.callout)
    }
}

// MARK: - Transcript Row
struct TranscriptRow: View {
    let transcript: TranscriptEntry

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: transcript.timestamp)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(formattedTime)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))

            VStack(alignment: .leading, spacing: 8) {
                TranscriptText(
                    icon: "mic.fill",
                    text: transcript.originalText,
                    color: .blue
                )

                TranscriptText(
                    icon: "globe",
                    text: transcript.translatedText,
                    color: .green
                )
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }
}

// MARK: - Transcript Text
struct TranscriptText: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)

            Text(text)
                .font(.body)
                .foregroundColor(.white)
        }
    }
}

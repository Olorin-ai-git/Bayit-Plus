import SwiftUI

/// Language selection view with voice preview
struct LanguageSelectionView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var selectedLanguage: TranslationLanguage
    @State private var isPlayingPreview = false

    init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        _selectedLanguage = State(initialValue: coordinator.settingsManager.targetLanguage)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                header

                // Instructions
                instructionsCard

                // Language list
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(TranslationLanguage.allCases) { language in
                            LanguageCard(
                                language: language,
                                isSelected: selectedLanguage == language,
                                isPlayingPreview: isPlayingPreview
                            ) {
                                selectLanguage(language)
                            } onPreview: {
                                playPreview(for: language)
                            }
                        }
                    }
                }

                // Save button
                saveButton
            }
            .padding()
        }
    }

    // MARK: - Header
    private var header: some View {
        HStack {
            Button(action: {
                coordinator.navigate(to: .settings)
            }) {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
            }

            Spacer()

            Text("Select Language")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Spacer()

            Color.clear
                .frame(width: 40, height: 40)
        }
    }

    // MARK: - Instructions Card
    private var instructionsCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "info.circle.fill")
                .foregroundColor(.blue)

            Text("Choose the language you want your speech translated into")
                .font(.callout)
                .foregroundColor(.white)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }

    // MARK: - Save Button
    private var saveButton: some View {
        Button(action: {
            coordinator.settingsManager.targetLanguage = selectedLanguage
            coordinator.navigate(to: .settings)
        }) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                Text("Save Selection")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(selectedLanguage != coordinator.settingsManager.targetLanguage ? Color.blue : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(16)
        }
        .disabled(selectedLanguage == coordinator.settingsManager.targetLanguage)
    }

    // MARK: - Actions
    private func selectLanguage(_ language: TranslationLanguage) {
        selectedLanguage = language
    }

    private func playPreview(for language: TranslationLanguage) {
        guard !isPlayingPreview else { return }

        isPlayingPreview = true

        let previewText = getPreviewText(for: language)

        Task {
            try? await coordinator.elevenLabsService.synthesize(
                text: previewText,
                voice: coordinator.settingsManager.selectedVoice.voiceId
            )

            // Reset after playback
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                isPlayingPreview = false
            }
        }
    }

    private func getPreviewText(for language: TranslationLanguage) -> String {
        switch language {
        case .spanish:
            return "Hola, bienvenido a Omen"
        case .french:
            return "Bonjour, bienvenue sur Omen"
        case .german:
            return "Hallo, willkommen bei Omen"
        case .japanese:
            return "こんにちは、Omenへようこそ"
        case .mandarin:
            return "你好，欢迎来到 Omen"
        }
    }
}

// MARK: - Language Card
struct LanguageCard: View {
    let language: TranslationLanguage
    let isSelected: Bool
    let isPlayingPreview: Bool
    let onSelect: () -> Void
    let onPreview: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            // Flag and language
            HStack(spacing: 12) {
                Text(language.flag)
                    .font(.system(size: 40))

                VStack(alignment: .leading, spacing: 4) {
                    Text(language.displayName)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(language.rawValue.uppercased())
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
            }

            Spacer()

            // Preview button
            Button(action: onPreview) {
                Image(systemName: isPlayingPreview ? "speaker.wave.3.fill" : "speaker.wave.2.fill")
                    .font(.title3)
                    .foregroundColor(.blue)
                    .frame(width: 44, height: 44)
                    .background(Color.blue.opacity(0.2))
                    .clipShape(Circle())
            }
            .disabled(isPlayingPreview)

            // Selection indicator
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.green)
            }
        }
        .padding()
        .background(isSelected ? Color.blue.opacity(0.2) : .ultraThinMaterial)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
        )
        .onTapGesture {
            onSelect()
        }
    }
}

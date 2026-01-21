import SwiftUI

/// Dual text view showing caption and translation
struct DualTextView: View {
    let caption: String
    let translation: String
    let targetLanguage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Caption Section
            VStack(alignment: .leading, spacing: 8) {
                Label("Original", systemImage: "captions.bubble")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                ScrollView {
                    Text(caption.isEmpty ? "Speak to see your words here..." : caption)
                        .font(.system(.body, design: .monospaced))
                        .foregroundColor(caption.isEmpty ? .secondary : .primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                }
                .frame(maxHeight: 100)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemBackground))
                        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                )
            }

            // Translation Section
            VStack(alignment: .leading, spacing: 8) {
                Label("Translation (\(targetLanguage))", systemImage: "character.bubble")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)

                ScrollView {
                    Text(translation.isEmpty ? "Translation will appear here..." : translation)
                        .font(.system(.body, design: .monospaced))
                        .foregroundColor(translation.isEmpty ? .secondary : .primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                }
                .frame(maxHeight: 100)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemBackground))
                        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                )
            }
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    VStack {
        DualTextView(
            caption: "Hello, how are you today?",
            translation: "Hola, ¿cómo estás hoy?",
            targetLanguage: "Spanish"
        )

        DualTextView(
            caption: "",
            translation: "",
            targetLanguage: "French"
        )
        .background(Color(.systemGroupedBackground))
    }
}

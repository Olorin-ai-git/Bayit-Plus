import SwiftUI

/// Multi-step onboarding flow
struct OnboardingView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var currentPage = 0

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            icon: "mic.circle.fill",
            title: "Real-Time Transcription",
            description: "Speak naturally and see your words transcribed instantly using OpenAI's advanced speech recognition.",
            color: .blue
        ),
        OnboardingPage(
            icon: "globe",
            title: "Instant Translation",
            description: "Your speech is automatically translated into Spanish, French, German, Japanese, or Mandarin in real-time.",
            color: .green
        ),
        OnboardingPage(
            icon: "speaker.wave.3.fill",
            title: "Text-to-Speech",
            description: "Hear translations spoken aloud with natural-sounding voices powered by ElevenLabs AI.",
            color: .purple
        ),
        OnboardingPage(
            icon: "antenna.radiowaves.left.and.right",
            title: "ESP32 Wearable",
            description: "Connect your ESP32 wearable display to see translations on the go via Bluetooth.",
            color: .orange
        ),
        OnboardingPage(
            icon: "hand.tap.fill",
            title: "Action Button Ready",
            description: "On iPhone 15/16 Pro, start sessions instantly with a press of the Action Button.",
            color: .cyan
        )
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Progress indicator
            HStack(spacing: 8) {
                ForEach(0..<pages.count, id: \.self) { index in
                    Capsule()
                        .fill(index == currentPage ? Color.white : Color.white.opacity(0.3))
                        .frame(width: index == currentPage ? 40 : 20, height: 4)
                        .animation(.easeInOut, value: currentPage)
                }
            }
            .padding(.top, 60)
            .padding(.bottom, 40)

            // Page content
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    OnboardingPageView(page: pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Navigation buttons
            HStack(spacing: 20) {
                if currentPage > 0 {
                    Button(action: {
                        withAnimation {
                            currentPage -= 1
                        }
                    }) {
                        Image(systemName: "chevron.left.circle.fill")
                            .font(.title)
                            .foregroundColor(.white)
                    }
                }

                Spacer()

                if currentPage < pages.count - 1 {
                    Button(action: {
                        withAnimation {
                            currentPage += 1
                        }
                    }) {
                        HStack {
                            Text("Next")
                                .fontWeight(.semibold)
                            Image(systemName: "chevron.right")
                        }
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(25)
                    }
                } else {
                    Button(action: {
                        coordinator.completeOnboarding()
                    }) {
                        HStack {
                            Text("Get Started")
                                .fontWeight(.semibold)
                            Image(systemName: "arrow.right.circle.fill")
                        }
                        .padding(.horizontal, 32)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(25)
                    }
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 50)
        }
        .background(Color.black.ignoresSafeArea())
    }
}

// MARK: - Onboarding Page View
struct OnboardingPageView: View {
    let page: OnboardingPage

    var body: some View {
        VStack(spacing: 32) {
            Image(systemName: page.icon)
                .font(.system(size: 100))
                .foregroundColor(page.color)
                .padding(.top, 60)

            VStack(spacing: 16) {
                Text(page.title)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(page.description)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .lineSpacing(6)
            }

            Spacer()
        }
    }
}

// MARK: - Onboarding Page Model
struct OnboardingPage {
    let icon: String
    let title: String
    let description: String
    let color: Color
}

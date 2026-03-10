import Foundation

// MARK: - Learn Hebrew

extension DiscoverFeatureCatalog {
    static let hebrewFeatures: [DiscoverFeature] = [
        DiscoverFeature(
            id: "phonetic_mirror",
            category: .learnHebrew,
            nameKey: "discover.feature.phonetic_mirror.name",
            taglineKey: "discover.feature.phonetic_mirror.tagline",
            descriptionKey: "discover.feature.phonetic_mirror.description",
            iconName: "mic.and.signal.meter",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "phonetic_mirror_microphone", type: .microphone, labelKey: "discover.prereq.microphone_required"),
                FeaturePrerequisite(id: "phonetic_mirror_avatar", type: .avatar, labelKey: "discover.prereq.avatar_required", fixRoute: "bayitplus://settings/avatar"),
            ],
            walkthroughSteps: makeSteps(featureId: "phonetic_mirror", actions: [.navigate, .tap, .observe, .tap]),
            deepLinkRoute: "bayitplus://zeh-ani"
        ),
        DiscoverFeature(
            id: "talk_back",
            category: .learnHebrew,
            nameKey: "discover.feature.talk_back.name",
            taglineKey: "discover.feature.talk_back.tagline",
            descriptionKey: "discover.feature.talk_back.description",
            iconName: "bubble.left.and.text.bubble.right",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "talk_back_microphone", type: .microphone, labelKey: "discover.prereq.microphone_required"),
                FeaturePrerequisite(id: "talk_back_avatar", type: .avatar, labelKey: "discover.prereq.avatar_required", fixRoute: "bayitplus://settings/avatar"),
            ],
            walkthroughSteps: makeSteps(featureId: "talk_back", actions: [.navigate, .tap, .observe, .tap]),
            deepLinkRoute: "bayitplus://zeh-ani"
        ),
        DiscoverFeature(
            id: "interactive_mission",
            category: .learnHebrew,
            nameKey: "discover.feature.interactive_mission.name",
            taglineKey: "discover.feature.interactive_mission.tagline",
            descriptionKey: "discover.feature.interactive_mission.description",
            iconName: "gamecontroller",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "interactive_mission_microphone", type: .microphone, labelKey: "discover.prereq.microphone_required"),
                FeaturePrerequisite(id: "interactive_mission_avatar", type: .avatar, labelKey: "discover.prereq.avatar_required", fixRoute: "bayitplus://settings/avatar"),
                FeaturePrerequisite(id: "interactive_mission_preference", type: .preference, labelKey: "discover.prereq.preference_required", fixRoute: "bayitplus://settings/consent"),
            ],
            walkthroughSteps: makeSteps(featureId: "interactive_mission", actions: [.navigate, .select, .tap, .observe]),
            deepLinkRoute: "bayitplus://missions"
        ),
        DiscoverFeature(
            id: "glossary",
            category: .learnHebrew,
            nameKey: "discover.feature.glossary.name",
            taglineKey: "discover.feature.glossary.tagline",
            descriptionKey: "discover.feature.glossary.description",
            iconName: "character.book.closed",
            platforms: bothPlatforms,
            prerequisites: [],
            walkthroughSteps: makeSteps(featureId: "glossary", actions: [.navigate, .type, .observe]),
            deepLinkRoute: "bayitplus://glossary"
        ),
    ]
}

// MARK: - Search & Discovery

extension DiscoverFeatureCatalog {
    static let searchFeatures: [DiscoverFeature] = [
        DiscoverFeature(
            id: "llm_search",
            category: .searchDiscovery,
            nameKey: "discover.feature.llm_search.name",
            taglineKey: "discover.feature.llm_search.tagline",
            descriptionKey: "discover.feature.llm_search.description",
            iconName: "sparkle.magnifyingglass",
            platforms: bothPlatforms,
            prerequisites: [],
            walkthroughSteps: makeSteps(featureId: "llm_search", actions: [.navigate, .type, .observe]),
            deepLinkRoute: "bayitplus://search"
        ),
        DiscoverFeature(
            id: "proactive_voice",
            category: .searchDiscovery,
            nameKey: "discover.feature.proactive_voice.name",
            taglineKey: "discover.feature.proactive_voice.tagline",
            descriptionKey: "discover.feature.proactive_voice.description",
            iconName: "waveform",
            platforms: iOSOnly,
            prerequisites: [
                FeaturePrerequisite(id: "proactive_voice_preference", type: .preference, labelKey: "discover.prereq.preference_required", fixRoute: "bayitplus://settings/voice"),
            ],
            walkthroughSteps: makeSteps(featureId: "proactive_voice", actions: [.navigate, .tap, .observe])
        ),
    ]
}

// MARK: - Chat Assistants

extension DiscoverFeatureCatalog {
    static let chatFeatures: [DiscoverFeature] = [
        DiscoverFeature(
            id: "chatbot",
            category: .chatAssistants,
            nameKey: "discover.feature.chatbot.name",
            taglineKey: "discover.feature.chatbot.tagline",
            descriptionKey: "discover.feature.chatbot.description",
            iconName: "bubble.left.and.bubble.right.fill",
            platforms: bothPlatforms,
            prerequisites: [],
            walkthroughSteps: makeSteps(featureId: "chatbot", actions: [.navigate, .type, .observe]),
            deepLinkRoute: "bayitplus://chatbot"
        ),
    ]
}

// MARK: - Step Builder

extension DiscoverFeatureCatalog {
    static func makeSteps(featureId: String, actions: [WalkthroughAction]) -> [WalkthroughStep] {
        actions.enumerated().map { index, action in
            let stepNumber = index + 1
            let prereqType: String? = action == .createAvatar ? "avatar" : nil
            return WalkthroughStep(
                id: "\(featureId)_step\(stepNumber)",
                instructionKey: "discover.walkthrough.\(featureId).step\(stepNumber)",
                targetAccessibilityId: "discover_\(featureId)_step\(stepNumber)",
                expectedAction: action,
                order: stepNumber,
                prerequisiteType: prereqType
            )
        }
    }
}

#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Household View

    /// tvOS Household Profiles screen — grid of circular profile slots with
    /// filled member cards and empty "+" placeholders up to maxProfiles.
    struct TVHouseholdView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: HouseholdViewModel?

        private let slotSize: CGFloat = 160
        private let avatarSize: CGFloat = 120

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                if let vm = viewModel {
                    if vm.isLoading && vm.household == nil {
                        loadingView
                    } else if let error = vm.error, vm.household == nil {
                        errorView(error, vm: vm)
                    } else if vm.noHousehold {
                        noHouseholdView(vm)
                    } else {
                        profileGridView(vm)
                    }
                }
            }
            .task {
                if viewModel == nil {
                    viewModel = HouseholdViewModel(repository: repos.household)
                }
                await viewModel?.load()
            }
        }

        // MARK: - Profile Grid

        private func profileGridView(_ vm: HouseholdViewModel) -> some View {
            VStack(spacing: 0) {
                Spacer()

                titleSection(vm)
                    .padding(.bottom, 56)

                slotsRow(vm)
                    .padding(.bottom, 56)

                addProfileButton(vm)
                    .padding(.horizontal, 120)

                Spacer()
                Spacer()
            }
            .frame(maxWidth: .infinity)
        }

        // MARK: - Title

        private func titleSection(_ vm: HouseholdViewModel) -> some View {
            VStack(spacing: 10) {
                Text(localization.t("household.profiles"))
                    .font(.system(size: 52, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(profileCountLine(vm))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        private func profileCountLine(_ vm: HouseholdViewModel) -> String {
            let familyName = vm.household?.name ?? localization.t("household.myHousehold")
            let current = vm.memberCount
            let max = vm.maxProfiles
            return localization.t(
                "household.profileCount",
                ["name": familyName, "current": "\(current)", "max": "\(max)"]
            )
        }

        // MARK: - Slots Row

        private func slotsRow(_ vm: HouseholdViewModel) -> some View {
            let members = vm.household?.members ?? []
            let maxSlots = max(vm.maxProfiles, members.count)
            return HStack(spacing: 28) {
                ForEach(0 ..< maxSlots, id: \.self) { index in
                    if index < members.count {
                        filledSlot(members[index], isOwner: vm.isOwner(members[index]))
                    } else {
                        emptySlot
                    }
                }
            }
        }

        // MARK: - Filled Slot

        private func filledSlot(_ member: HouseholdMember, isOwner: Bool) -> some View {
            VStack(spacing: 12) {
                ZStack(alignment: .bottom) {
                    avatarCircle(member, isOwner: isOwner)

                    if isOwner {
                        ownerBadge
                            .offset(y: 10)
                    }
                }
                .frame(width: slotSize, height: slotSize + (isOwner ? 10 : 0))

                Text(member.displayName ?? localization.t("household.unknown"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                    .frame(width: slotSize)
            }
            .accessibilityLabel(member.displayName ?? localization.t("household.unknown"))
        }

        private func avatarCircle(_ member: HouseholdMember, isOwner: Bool) -> some View {
            ZStack {
                Circle()
                    .fill(
                        isOwner
                            ? LinearGradient(
                                colors: [DesignTokens.Primary.p700, DesignTokens.Primary.p500],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            : LinearGradient(
                                colors: [DesignTokens.Glass.bg, DesignTokens.Glass.bg],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                    )
                    .frame(width: avatarSize, height: avatarSize)

                if let avatarStr = member.avatar, let url = URL(string: avatarStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: avatarSize, height: avatarSize)
                                .clipShape(Circle())
                        } else {
                            initialLabel(member)
                        }
                    }
                } else {
                    initialLabel(member)
                }
            }
            .clipShape(Circle())
            .overlay(
                Circle().strokeBorder(
                    isOwner
                        ? DesignTokens.Primary.p400.opacity(0.8)
                        : Color.white.opacity(0.12),
                    lineWidth: isOwner ? 3 : 1.5
                )
            )
        }

        private func initialLabel(_ member: HouseholdMember) -> some View {
            Text(String((member.displayName ?? "?").prefix(1)).uppercased())
                .font(.system(size: 44, weight: .bold))
                .foregroundStyle(.white)
        }

        private var ownerBadge: some View {
            Text(localization.t("household.owner"))
                .font(.system(size: 11, weight: .black))
                .foregroundStyle(.white)
                .kerning(1.2)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(DesignTokens.Primary.p500)
                .clipShape(Capsule())
        }

        // MARK: - Empty Slot

        private var emptySlot: some View {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .strokeBorder(
                            style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                        )
                        .foregroundStyle(Color.white.opacity(0.18))
                        .frame(width: avatarSize, height: avatarSize)

                    Image(systemName: "plus")
                        .font(.system(size: 32, weight: .medium))
                        .foregroundStyle(Color.white.opacity(0.25))
                }
                .frame(width: slotSize, height: slotSize)

                Color.clear.frame(height: TVDesignTokens.FontSize.base)
            }
            .accessibilityHidden(true)
        }

        // MARK: - Add Profile Button

        private func addProfileButton(_ vm: HouseholdViewModel) -> some View {
            Button { Task { await vm.inviteMember() } } label: {
                Text(localization.t("household.addProfile"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 72)
                    .background(
                        LinearGradient(
                            colors: [DesignTokens.Primary.p600, DesignTokens.Primary.p500],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .tvCardStyle()
        }

        // MARK: - Loading / Error / No Household

        private var loadingView: some View {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }

        private func errorView(_ message: String, vm: HouseholdViewModel) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.ErrorColor.e400)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                Button(localization.t("common.retry")) {
                    Task { await vm.load() }
                }
                .tvCardStyle()
            }
            .padding(60)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }

        private func noHouseholdView(_: HouseholdViewModel) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "house")
                    .font(.system(size: 64))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(localization.t("household.empty.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("household.empty.subtitle"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
#endif

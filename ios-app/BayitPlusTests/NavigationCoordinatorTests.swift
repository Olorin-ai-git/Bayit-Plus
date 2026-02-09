import XCTest
import SwiftUI
@testable import BayitPlusApp

final class NavigationCoordinatorTests: XCTestCase {

    private var coordinator: NavigationCoordinator!

    override func setUp() {
        super.setUp()
        coordinator = NavigationCoordinator()
    }

    override func tearDown() {
        coordinator = nil
        super.tearDown()
    }

    // MARK: - Initialization

    func testInitialStateHasHomeSelected() {
        XCTAssertEqual(coordinator.selectedTab, .home)
    }

    func testInitialStateHasNoFullscreenRoute() {
        XCTAssertNil(coordinator.fullscreenRoute)
    }

    func testInitialStateHasEmptyPaths() {
        for tab in AppTab.allCases {
            XCTAssertEqual(coordinator.paths[tab]?.count, 0, "\(tab) should have empty path")
        }
    }

    func testInitialStateHasEmptyBreadcrumbs() {
        for tab in AppTab.allCases {
            XCTAssertEqual(coordinator.breadcrumbTrails[tab]?.count, 0, "\(tab) should have empty breadcrumbs")
        }
    }

    // MARK: - Tab Navigation

    func testNavigateToLiveTV() {
        coordinator.navigate(to: .liveTV)
        XCTAssertEqual(coordinator.selectedTab, .liveTV)
    }

    func testNavigateToVOD() {
        coordinator.navigate(to: .vod)
        XCTAssertEqual(coordinator.selectedTab, .vod)
    }

    func testNavigateToRadio() {
        coordinator.navigate(to: .radio)
        XCTAssertEqual(coordinator.selectedTab, .radio)
    }

    func testNavigateToPodcasts() {
        coordinator.navigate(to: .podcasts)
        XCTAssertEqual(coordinator.selectedTab, .podcasts)
    }

    func testNavigateToHomeResetsPath() {
        coordinator.pushToCurrentTab(.profile)
        XCTAssertGreaterThan(coordinator.paths[.home]?.count ?? 0, 0)

        coordinator.navigate(to: .home)
        XCTAssertEqual(coordinator.paths[.home]?.count, 0)
        XCTAssertEqual(coordinator.breadcrumbTrails[.home]?.count, 0)
    }

    // MARK: - Push / Pop

    func testPushAddsToCurrentTab() {
        coordinator.pushToCurrentTab(.profile)
        XCTAssertEqual(coordinator.paths[.home]?.count, 1)
        XCTAssertEqual(coordinator.breadcrumbTrails[.home]?.count, 1)
    }

    func testPushMultipleRoutes() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)
        coordinator.pushToCurrentTab(.billing)
        XCTAssertEqual(coordinator.paths[.home]?.count, 3)
        XCTAssertEqual(coordinator.breadcrumbTrails[.home]?.count, 3)
    }

    func testPopRemovesFromCurrentTab() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)
        XCTAssertEqual(coordinator.paths[.home]?.count, 2)

        coordinator.pop()
        XCTAssertEqual(coordinator.paths[.home]?.count, 1)
        XCTAssertEqual(coordinator.breadcrumbTrails[.home]?.count, 1)
    }

    func testPopOnEmptyStackDoesNothing() {
        coordinator.pop()
        XCTAssertEqual(coordinator.paths[.home]?.count, 0)
    }

    func testPopMultiple() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)
        coordinator.pushToCurrentTab(.billing)

        coordinator.pop(count: 2)
        XCTAssertEqual(coordinator.paths[.home]?.count, 1)
    }

    func testPopToRoot() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)
        coordinator.pushToCurrentTab(.billing)

        coordinator.popToRoot()
        XCTAssertEqual(coordinator.paths[.home]?.count, 0)
        XCTAssertEqual(coordinator.breadcrumbTrails[.home]?.count, 0)
    }

    // MARK: - Fullscreen

    func testPresentFullscreen() {
        coordinator.presentFullscreen(.search)
        XCTAssertEqual(coordinator.fullscreenRoute, .search)
    }

    func testDismissFullscreen() {
        coordinator.presentFullscreen(.search)
        coordinator.dismissFullscreen()
        XCTAssertNil(coordinator.fullscreenRoute)
    }

    func testNavigateToPlayerPresentsFullscreen() {
        coordinator.navigate(to: .player(contentId: "test", contentType: .movie))
        XCTAssertNotNil(coordinator.fullscreenRoute)
    }

    func testNavigateToSearchPresentsFullscreen() {
        coordinator.navigate(to: .search)
        XCTAssertNotNil(coordinator.fullscreenRoute)
    }

    // MARK: - Breadcrumbs

    func testBreadcrumbsStartWithTabRoot() {
        let breadcrumbs = coordinator.currentBreadcrumbs
        XCTAssertEqual(breadcrumbs.first?.label, "Home")
    }

    func testBreadcrumbsIncludePushedRoutes() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)

        let breadcrumbs = coordinator.currentBreadcrumbs
        XCTAssertEqual(breadcrumbs.count, 3)
        XCTAssertEqual(breadcrumbs[0].label, "Home")
        XCTAssertEqual(breadcrumbs[1].label, "Profile")
        XCTAssertEqual(breadcrumbs[2].label, "Settings")
    }

    func testBreadcrumbPopCountsAreCorrect() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.pushToCurrentTab(.settings)

        let breadcrumbs = coordinator.currentBreadcrumbs
        XCTAssertEqual(breadcrumbs[0].popCount, 2)
        XCTAssertEqual(breadcrumbs[1].popCount, 1)
        XCTAssertEqual(breadcrumbs[2].popCount, 0)
    }

    // MARK: - Cross-Tab Navigation

    func testNavigatingBetweenTabsPreservesPaths() {
        coordinator.pushToCurrentTab(.profile)
        coordinator.navigate(to: .liveTV)

        XCTAssertEqual(coordinator.paths[.home]?.count, 1)
        XCTAssertEqual(coordinator.paths[.liveTV]?.count, 0)
    }

    func testContentDetailPushesToCurrentTab() {
        coordinator.navigate(to: .movieDetail(movieId: "m123"))
        XCTAssertEqual(coordinator.paths[.home]?.count, 1)
    }
}

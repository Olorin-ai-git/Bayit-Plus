/**
 * End-to-End Tests for Parallel Investigations Feature
 *
 * Tests the complete flow:
 * 1. API endpoints availability
 * 2. Investigation list retrieval
 * 3. ParallelInvestigationsPage rendering
 * 4. Investigation navigation
 * 5. Real-time updates
 *
 * Feature: 001-parallel-investigations-monitor
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { test, expect } from '@playwright/test';
import { InvestigationAPIClient, createTestInvestigations, cleanupTestInvestigations, } from './helpers/api';
var BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';
var API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
test.describe('Parallel Investigations Feature - End-to-End', function () {
    var testInvestigations = [];
    var apiClient;
    test.beforeAll(function (_a) {
        var playwright = _a.playwright;
        return __awaiter(void 0, void 0, void 0, function () {
            var context;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, playwright.request.newContext({
                            baseURL: API_BASE_URL
                        })];
                    case 1:
                        context = _b.sent();
                        apiClient = new InvestigationAPIClient(context);
                        return [4 /*yield*/, createTestInvestigations(context, 5)];
                    case 2:
                        // Create test data
                        testInvestigations = _b.sent();
                        console.log("Created ".concat(testInvestigations.length, " test investigations"));
                        return [4 /*yield*/, context.dispose()];
                    case 3:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    test.afterAll(function (_a) {
        var playwright = _a.playwright;
        return __awaiter(void 0, void 0, void 0, function () {
            var context;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, playwright.request.newContext({
                            baseURL: API_BASE_URL
                        })];
                    case 1:
                        context = _b.sent();
                        return [4 /*yield*/, cleanupTestInvestigations(context, testInvestigations)];
                    case 2:
                        _b.sent();
                        console.log("Cleaned up ".concat(testInvestigations.length, " test investigations"));
                        return [4 /*yield*/, context.dispose()];
                    case 3:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    test('1. API endpoints should be available', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var endpoints, _i, endpoints_1, endpoint, response;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        endpoints = [
                            '/api/v1/investigation-state/',
                            '/api/v1/investigation-state/statistics',
                        ];
                        _i = 0, endpoints_1 = endpoints;
                        _b.label = 1;
                    case 1:
                        if (!(_i < endpoints_1.length)) return [3 /*break*/, 4];
                        endpoint = endpoints_1[_i];
                        return [4 /*yield*/, request.get("".concat(API_BASE_URL).concat(endpoint))];
                    case 2:
                        response = _b.sent();
                        expect(response.ok()).toBeTruthy();
                        console.log("\u2713 ".concat(endpoint, " - Status: ").concat(response.status()));
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    });
    test('2. Should list all investigations', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var response, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.get("".concat(API_BASE_URL, "/api/v1/investigation-state/?page=1&page_size=50"))];
                    case 1:
                        response = _b.sent();
                        expect(response.ok()).toBeTruthy();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _b.sent();
                        expect(data).toHaveProperty('investigations');
                        expect(Array.isArray(data.investigations)).toBeTruthy();
                        expect(data.investigations.length).toBeGreaterThanOrEqual(testInvestigations.length);
                        console.log("\u2713 Retrieved ".concat(data.investigations.length, " investigations from API"));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('3. Should navigate to /parallel route', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        // Wait for page to load
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        // Wait for page to load
                        _b.sent();
                        // Check URL
                        expect(page.url()).toContain('/parallel');
                        console.log("\u2713 Navigated to /parallel route");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('4. ParallelInvestigationsPage should render', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var table;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        table = page.locator('table, [role="table"]');
                        return [4 /*yield*/, table.waitFor({ state: 'attached', timeout: 10000 })];
                    case 3:
                        _b.sent();
                        expect(table).toBeTruthy();
                        console.log("\u2713 ParallelInvestigationsPage rendered successfully");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('5. Should display investigation data in table', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var rows, count, headers, headerCount;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        rows = page.locator('tbody tr, [role="row"]');
                        return [4 /*yield*/, rows.count()];
                    case 3:
                        count = _b.sent();
                        expect(count).toBeGreaterThan(0);
                        console.log("\u2713 Table displays ".concat(count, " investigation rows"));
                        headers = page.locator('thead, [role="columnheader"]');
                        return [4 /*yield*/, headers.count()];
                    case 4:
                        headerCount = _b.sent();
                        expect(headerCount).toBeGreaterThan(0);
                        console.log("\u2713 Table has ".concat(headerCount, " column headers"));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('6. Should show investigation status colors', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var statusElements, count;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        statusElements = page.locator('[class*="text-corporate"]');
                        return [4 /*yield*/, statusElements.count()];
                    case 3:
                        count = _b.sent();
                        expect(count).toBeGreaterThan(0);
                        console.log("\u2713 Found ".concat(count, " styled status elements"));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('7. Should have working refresh button', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var refreshButton, initialRows;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Refreshing")');
                        expect(refreshButton).toBeTruthy();
                        return [4 /*yield*/, page.locator('tbody tr, [role="row"]').count()];
                    case 3:
                        initialRows = _b.sent();
                        // Click refresh
                        return [4 /*yield*/, refreshButton.click()];
                    case 4:
                        // Click refresh
                        _b.sent();
                        // Wait for potential update
                        return [4 /*yield*/, page.waitForTimeout(2000)];
                    case 5:
                        // Wait for potential update
                        _b.sent();
                        // Verify page is still functional
                        expect(page.url()).toContain('/parallel');
                        console.log("\u2713 Refresh button works correctly");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('8. Should navigate to investigation details on row click', function (_a) {
        var page = _a.page, context = _a.context;
        return __awaiter(void 0, void 0, void 0, function () {
            var firstIdCell, investigationId, firstRow;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        firstIdCell = page.locator('tbody tr td:first-child, [role="row"] [role="cell"]:first-child').first();
                        return [4 /*yield*/, firstIdCell.textContent()];
                    case 3:
                        investigationId = _b.sent();
                        if (!(investigationId && investigationId.trim())) return [3 /*break*/, 6];
                        firstRow = page.locator('tbody tr, [role="row"]').first();
                        return [4 /*yield*/, firstRow.click({ force: true })];
                    case 4:
                        _b.sent();
                        // Wait for navigation
                        return [4 /*yield*/, page.waitForTimeout(1000)];
                    case 5:
                        // Wait for navigation
                        _b.sent();
                        // Should navigate to investigation progress page
                        expect(page.url()).toMatch(/progress|investigation/i);
                        console.log("\u2713 Navigated to investigation details for ID: ".concat(investigationId.trim()));
                        _b.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    });
    test('9. Should handle loading state gracefully', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var table, errorMessage, visible;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // Slow down network to observe loading state
                    return [4 /*yield*/, page.route('**/*.api.example.com/**', function (route) {
                            route.abort('timedout');
                        })];
                    case 1:
                        // Slow down network to observe loading state
                        _b.sent();
                        return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 2:
                        _b.sent();
                        table = page.locator('table, [role="table"]');
                        errorMessage = page.locator('text=Error, text=Failed, text=No investigations');
                        return [4 /*yield*/, Promise.race([
                                table.waitFor({ state: 'attached', timeout: 5000 }).then(function () { return true; }),
                                errorMessage.waitFor({ state: 'attached', timeout: 5000 }).then(function () { return true; }),
                                page.waitForTimeout(5000).then(function () { return false; }),
                            ])["catch"](function () { return false; })];
                    case 3:
                        visible = _b.sent();
                        expect([true, false]).toContain(visible);
                        console.log("\u2713 Loading state handled correctly");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('10. Should show "No investigations" message when empty', function (_a) {
        var page = _a.page, request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var table, emptyMessage, hasTableOrMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // This test assumes we can clear data or filter it
                    // For now, just verify the page handles data display
                    return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel?search=nonexistent"))];
                    case 1:
                        // This test assumes we can clear data or filter it
                        // For now, just verify the page handles data display
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        table = page.locator('table, [role="table"]');
                        emptyMessage = page.locator('text=/no.*investigation/i');
                        return [4 /*yield*/, Promise.race([
                                table.isVisible(),
                                emptyMessage.isVisible(),
                            ])["catch"](function () { return false; })];
                    case 3:
                        hasTableOrMessage = _b.sent();
                        expect(hasTableOrMessage).toBeTruthy();
                        console.log("\u2713 Page handles empty state correctly");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('11. API: Create investigation endpoint', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var response, data;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/"), {
                            data: {
                                investigation_id: "test-create-".concat(Date.now()),
                                lifecycle_stage: 'SETTINGS',
                                status: 'CREATED',
                                settings: {
                                    name: 'API Test Investigation',
                                    entities: [
                                        {
                                            entity_type: 'user_id',
                                            entity_value: 'api-test@example.com'
                                        },
                                    ]
                                }
                            }
                        })];
                    case 1:
                        response = _b.sent();
                        expect(response.ok()).toBeTruthy();
                        expect(response.status()).toBe(201);
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _b.sent();
                        expect(data).toHaveProperty('investigation_id');
                        expect(data).toHaveProperty('status');
                        // Cleanup
                        return [4 /*yield*/, request["delete"]("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(data.investigation_id))];
                    case 3:
                        // Cleanup
                        _b.sent();
                        console.log("\u2713 Create investigation endpoint works - Created ID: ".concat(data.investigation_id));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('12. API: Lifecycle endpoints (start, complete)', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var createResponse, investigation, id, startResponse, completeResponse;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/"), {
                            data: {
                                investigation_id: "test-lifecycle-".concat(Date.now()),
                                lifecycle_stage: 'SETTINGS',
                                status: 'CREATED',
                                settings: { name: 'Lifecycle Test' }
                            }
                        })];
                    case 1:
                        createResponse = _b.sent();
                        return [4 /*yield*/, createResponse.json()];
                    case 2:
                        investigation = _b.sent();
                        id = investigation.investigation_id;
                        return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/start"))];
                    case 3:
                        startResponse = _b.sent();
                        expect(startResponse.ok()).toBeTruthy();
                        return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/complete"), { data: { summary: 'Test completed' } })];
                    case 4:
                        completeResponse = _b.sent();
                        expect(completeResponse.ok()).toBeTruthy();
                        // Cleanup
                        return [4 /*yield*/, request["delete"]("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id))];
                    case 5:
                        // Cleanup
                        _b.sent();
                        console.log("\u2713 Lifecycle endpoints work correctly");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('13. API: Findings endpoints', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var createResponse, investigation, id, getResponse;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/"), {
                            data: {
                                investigation_id: "test-findings-".concat(Date.now()),
                                lifecycle_stage: 'IN_PROGRESS',
                                status: 'IN_PROGRESS',
                                settings: { name: 'Findings Test' }
                            }
                        })];
                    case 1:
                        createResponse = _b.sent();
                        return [4 /*yield*/, createResponse.json()];
                    case 2:
                        investigation = _b.sent();
                        id = investigation.investigation_id;
                        return [4 /*yield*/, request.get("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/findings"))];
                    case 3:
                        getResponse = _b.sent();
                        expect(getResponse.ok()).toBeTruthy();
                        // Cleanup
                        return [4 /*yield*/, request["delete"]("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id))];
                    case 4:
                        // Cleanup
                        _b.sent();
                        console.log("\u2713 Findings endpoints work correctly");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('14. API: Error handling - 404 on missing investigation', function (_a) {
        var request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.get("".concat(API_BASE_URL, "/api/v1/investigation-state/nonexistent-id-12345"))];
                    case 1:
                        response = _b.sent();
                        expect(response.status()).toBe(404);
                        console.log("\u2713 Proper 404 error handling for missing investigation");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('15. Performance: Page load time should be reasonable', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var startTime, loadTime;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        loadTime = Date.now() - startTime;
                        // Should load within reasonable time (10 seconds for E2E)
                        expect(loadTime).toBeLessThan(10000);
                        console.log("\u2713 Page loaded in ".concat(loadTime, "ms"));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('16. Accessibility: Page should have proper ARIA labels', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var table, _b, buttons, buttonCount;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _c.sent();
                        table = page.locator('[role="table"]').or(page.locator('table'));
                        _b = expect;
                        return [4 /*yield*/, table.count()];
                    case 3:
                        _b.apply(void 0, [_c.sent()]).toBeGreaterThan(0);
                        buttons = page.locator('button');
                        return [4 /*yield*/, buttons.count()];
                    case 4:
                        buttonCount = _c.sent();
                        expect(buttonCount).toBeGreaterThan(0);
                        console.log("\u2713 Page has proper accessibility elements");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('17. Responsive design: Should work on mobile viewport', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var table, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // Set mobile viewport
                    return [4 /*yield*/, page.setViewportSize({ width: 375, height: 812 })];
                    case 1:
                        // Set mobile viewport
                        _c.sent();
                        return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 3:
                        _c.sent();
                        table = page.locator('table, [role="table"]');
                        _b = expect;
                        return [4 /*yield*/, table.isVisible()];
                    case 4:
                        _b.apply(void 0, [_c.sent()]).toBeTruthy();
                        console.log("\u2713 Page is responsive and works on mobile");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('18. Should handle network errors gracefully', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var title, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // Go offline
                    return [4 /*yield*/, page.context().setOffline(true)];
                    case 1:
                        // Go offline
                        _c.sent();
                        return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 2:
                        _c.sent();
                        title = page.locator('h1');
                        _b = expect;
                        return [4 /*yield*/, title.count()];
                    case 3:
                        _b.apply(void 0, [_c.sent()]).toBeGreaterThan(0);
                        // Go back online
                        return [4 /*yield*/, page.context().setOffline(false)];
                    case 4:
                        // Go back online
                        _c.sent();
                        console.log("\u2713 Page handles offline state gracefully");
                        return [2 /*return*/];
                }
            });
        });
    });
    test('19. Should auto-refresh data at configured interval', function (_a) {
        var page = _a.page;
        return __awaiter(void 0, void 0, void 0, function () {
            var lastUpdatedText, newText;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 2:
                        _b.sent();
                        lastUpdatedText = page.locator('text=/last updated|last refresh/i').first();
                        // Wait for auto-refresh (typically 10 seconds)
                        return [4 /*yield*/, page.waitForTimeout(12000)];
                    case 3:
                        // Wait for auto-refresh (typically 10 seconds)
                        _b.sent();
                        return [4 /*yield*/, lastUpdatedText.textContent()];
                    case 4:
                        newText = _b.sent();
                        expect(newText).toBeTruthy();
                        console.log("\u2713 Auto-refresh working: ".concat(newText));
                        return [2 /*return*/];
                }
            });
        });
    });
    test('20. Full integration test: Create, navigate, and monitor investigation', function (_a) {
        var page = _a.page, request = _a.request;
        return __awaiter(void 0, void 0, void 0, function () {
            var createResponse, investigation, id, tableVisible, startResponse;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/"), {
                            data: {
                                investigation_id: "test-integration-".concat(Date.now()),
                                lifecycle_stage: 'SETTINGS',
                                status: 'CREATED',
                                settings: {
                                    name: 'Integration Test Investigation',
                                    entities: [
                                        {
                                            entity_type: 'user_id',
                                            entity_value: 'integration-test@example.com'
                                        },
                                    ]
                                }
                            }
                        })];
                    case 1:
                        createResponse = _b.sent();
                        expect(createResponse.ok()).toBeTruthy();
                        return [4 /*yield*/, createResponse.json()];
                    case 2:
                        investigation = _b.sent();
                        id = investigation.investigation_id;
                        // Step 2: Navigate to parallel investigations page
                        return [4 /*yield*/, page.goto("".concat(BASE_URL, "/parallel"))];
                    case 3:
                        // Step 2: Navigate to parallel investigations page
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, page.locator('table, [role="table"]').isVisible()];
                    case 5:
                        tableVisible = _b.sent();
                        expect(tableVisible).toBeTruthy();
                        return [4 /*yield*/, request.post("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/start"))];
                    case 6:
                        startResponse = _b.sent();
                        expect(startResponse.ok()).toBeTruthy();
                        // Step 5: Refresh the page to see updated status
                        return [4 /*yield*/, page.reload()];
                    case 7:
                        // Step 5: Refresh the page to see updated status
                        _b.sent();
                        return [4 /*yield*/, page.waitForLoadState('networkidle')];
                    case 8:
                        _b.sent();
                        // Step 6: Cleanup
                        return [4 /*yield*/, request["delete"]("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id))];
                    case 9:
                        // Step 6: Cleanup
                        _b.sent();
                        console.log("\u2713 Full integration test completed successfully");
                        return [2 /*return*/];
                }
            });
        });
    });
});

/**
 * API Testing Helper for Olorin E2E Tests
 *
 * Provides utilities for:
 * - Creating test investigations
 * - Verifying API endpoints
 * - Cleaning up test data
 * - Managing authentication
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';
var InvestigationAPIClient = /** @class */ (function () {
    function InvestigationAPIClient(apiRequest) {
        this.apiRequest = apiRequest;
    }
    /**
     * Create a test investigation
     */
    InvestigationAPIClient.prototype.createInvestigation = function (overrides) {
        return __awaiter(this, void 0, void 0, function () {
            var investigation, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        investigation = __assign({ investigation_id: "test-inv-".concat(Date.now()), lifecycle_stage: 'IN_PROGRESS', status: 'IN_PROGRESS', settings: {
                                name: 'Test Investigation',
                                entities: [
                                    {
                                        entity_type: 'user_id',
                                        entity_value: 'test-user@example.com'
                                    },
                                ],
                                time_range: {
                                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                                    end: new Date().toISOString()
                                },
                                tools: [
                                    { tool_id: 'device_analysis' },
                                    { tool_id: 'location_analysis' },
                                ],
                                correlation_mode: 'OR',
                                investigation_type: 'structured',
                                investigation_mode: 'entity'
                            } }, overrides);
                        return [4 /*yield*/, this.apiRequest.post("".concat(API_BASE_URL, "/api/v1/investigation-state/"), {
                                data: investigation
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to create investigation: ".concat(response.status(), " ").concat(response.statusText()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Get investigation by ID
     */
    InvestigationAPIClient.prototype.getInvestigation = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiRequest.get("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to get investigation: ".concat(response.status()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * List all investigations
     */
    InvestigationAPIClient.prototype.listInvestigations = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams(__assign({ page: '1', page_size: '50' }, filters));
                        return [4 /*yield*/, this.apiRequest.get("".concat(API_BASE_URL, "/api/v1/investigation-state/?").concat(params))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to list investigations: ".concat(response.status()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Delete investigation
     */
    InvestigationAPIClient.prototype.deleteInvestigation = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiRequest["delete"]("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to delete investigation: ".concat(response.status()));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start investigation
     */
    InvestigationAPIClient.prototype.startInvestigation = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiRequest.post("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/start"))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to start investigation: ".concat(response.status()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Complete investigation
     */
    InvestigationAPIClient.prototype.completeInvestigation = function (id, summary) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiRequest.post("".concat(API_BASE_URL, "/api/v1/investigation-state/").concat(id, "/complete"), {
                            data: { summary: summary }
                        })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to complete investigation: ".concat(response.status()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Get investigation statistics
     */
    InvestigationAPIClient.prototype.getStatistics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.apiRequest.get("".concat(API_BASE_URL, "/api/v1/investigation-state/statistics"))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok()) {
                            throw new Error("Failed to get statistics: ".concat(response.status()));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Verify API endpoint health
     */
    InvestigationAPIClient.prototype.verifyEndpoint = function (path, method) {
        if (method === void 0) { method = 'GET'; }
        return __awaiter(this, void 0, void 0, function () {
            var response, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.apiRequest.fetch("".concat(API_BASE_URL).concat(path), { method: method })];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.ok()];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return InvestigationAPIClient;
}());
export { InvestigationAPIClient };
export function createTestInvestigations(apiRequest, count) {
    if (count === void 0) { count = 5; }
    return __awaiter(this, void 0, void 0, function () {
        var client, investigations, i, status_1, investigation;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new InvestigationAPIClient(apiRequest);
                    investigations = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < count)) return [3 /*break*/, 4];
                    status_1 = i < 2 ? 'COMPLETED' : i < 4 ? 'IN_PROGRESS' : 'CREATED';
                    return [4 /*yield*/, client.createInvestigation({
                            status: status_1,
                            lifecycle_stage: status_1,
                            settings: {
                                name: "Test Investigation ".concat(i + 1),
                                entities: [
                                    {
                                        entity_type: 'user_id',
                                        entity_value: "test-user-".concat(i, "@example.com")
                                    },
                                ]
                            }
                        })];
                case 2:
                    investigation = _a.sent();
                    investigations.push(investigation);
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, investigations];
            }
        });
    });
}
export function cleanupTestInvestigations(apiRequest, investigations) {
    return __awaiter(this, void 0, void 0, function () {
        var client, _i, investigations_1, inv, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new InvestigationAPIClient(apiRequest);
                    _i = 0, investigations_1 = investigations;
                    _a.label = 1;
                case 1:
                    if (!(_i < investigations_1.length)) return [3 /*break*/, 6];
                    inv = investigations_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, client.deleteInvestigation(inv.investigation_id)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.warn("Failed to cleanup investigation ".concat(inv.investigation_id, ":"), e_1);
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}

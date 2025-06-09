import {
  AppInfo,
  ClientMode,
  CustomerInteraction,
  Environment,
  Sandbox,
  SandboxActions,
  SandboxAnalytics,
  SandboxAppContext,
  SandboxAuthorization,
  SandboxContext,
  SandboxExperiments,
  SandboxFeatureFlags,
  SandboxGenOS,
  SandboxLogger,
  SandboxNavigation,
  SandboxPerformance,
  SandboxPluginConfig,
  SandboxPreferences,
  SandboxPubsub,
  SandboxVariability,
  SandboxWidgets,
} from '@appfabric/sandbox-spec';
import { anyString, anything, instance, mock, when } from 'ts-mockito';

/* eslint-disable import/no-mutable-exports */
export let mockSandbox: Sandbox;

// High level sandbox APIs that need to be mocked
export let mockActions: SandboxActions;
export let mockAnalytics: SandboxAnalytics;
export let mockAppContext: SandboxAppContext;
export let mockExperiments: SandboxExperiments;
export let mockFeatureFlags: SandboxFeatureFlags;
export let mockLogger: SandboxLogger;
export let mockNavigation: SandboxNavigation;
export let mockPerformance: SandboxPerformance;
export let mockPubsub: SandboxPubsub;
export let mockSandboxContext: SandboxContext;
export let mockWidgets: SandboxWidgets;
export let mockAuthorization: SandboxAuthorization;
export let mockPluginConfig: SandboxPluginConfig;
export let mockGenos: SandboxGenOS;
export let mockPreferences: SandboxPreferences;
export let mockVariability: SandboxVariability;
export let mockAppInfo: AppInfo;

// Mock returned objects that we may want to check later
export let mockCustomerInteraction: CustomerInteraction;
let customerInteraction: CustomerInteraction;

/* eslint-enable import/no-mutable-exports */
beforeEach(() => {
  // Initialize all mocks
  mockActions = mock<SandboxActions>();
  mockAnalytics = mock<SandboxAnalytics>();
  mockAppContext = mock<SandboxAppContext>();
  mockExperiments = mock<SandboxExperiments>();
  mockFeatureFlags = mock<SandboxFeatureFlags>();
  mockLogger = mock<SandboxLogger>();
  mockNavigation = mock<SandboxNavigation>();
  mockPerformance = mock<SandboxPerformance>();
  mockPubsub = mock<SandboxPubsub>();
  mockSandboxContext = mock<SandboxContext>();
  mockWidgets = mock<SandboxWidgets>();
  mockAuthorization = mock<SandboxAuthorization>();
  mockPluginConfig = mock<SandboxPluginConfig>();
  mockGenos = mock<SandboxGenOS>();
  mockPreferences = mock<SandboxPreferences>();
  mockVariability = mock<SandboxVariability>();
  mockAppInfo = mock<AppInfo>();
  mockSandbox = mock<Sandbox>();

  // Set up customer interaction mock
  mockCustomerInteraction = mock<CustomerInteraction>();
  customerInteraction = instance(mockCustomerInteraction);
  when(mockPerformance.createCustomerInteraction(anyString())).thenReturn(
    customerInteraction,
  );
  when(mockPerformance.getCustomerInteraction(anyString())).thenReturn(
    customerInteraction,
  );

  // Set up app context mock
  when(mockAppContext.getEnvironment()).thenReturn(Environment.E2E);
  when(mockAppContext.getPlatformInfo()).thenReturn({
    clientMode: ClientMode.WEB,
  });
  when(mockAppContext.getAppInfo()).thenReturn(instance(mockAppInfo));

  // Set up logger mock with all required methods
  when(mockLogger.log(anyString())).thenReturn();
  when(mockLogger.error(anyString())).thenReturn();
  when(mockLogger.warn(anyString())).thenReturn();
  when(mockLogger.info(anyString())).thenReturn();
  when(mockLogger.debug(anyString())).thenReturn();
  when(mockLogger.fatal(anyString())).thenReturn();
  when(
    mockLogger.logException(anyString(), anything(), anything()),
  ).thenReturn();
  when(mockLogger.isLevelDebug()).thenReturn(true);
  when(mockLogger.isLevelLog()).thenReturn(true);
  when(mockLogger.isLevelInfo()).thenReturn(true);
  when(mockLogger.isLevelWarn()).thenReturn(true);
  when(mockLogger.isLevelError()).thenReturn(true);
  when(mockLogger.isLevelFatal()).thenReturn(true);
  when(mockLogger.on(anyString(), anything(), anything())).thenReturn();
  when(mockLogger.off(anyString(), anything())).thenReturn();

  // Set up sandbox mock with all required properties
  when(mockSandbox.actions).thenReturn(instance(mockActions));
  when(mockSandbox.analytics).thenReturn(instance(mockAnalytics));
  when(mockSandbox.appContext).thenReturn(instance(mockAppContext));
  when(mockSandbox.experiments).thenReturn(instance(mockExperiments));
  when(mockSandbox.featureFlags).thenReturn(instance(mockFeatureFlags));
  when(mockSandbox.logger).thenReturn(instance(mockLogger));
  when(mockSandbox.navigation).thenReturn(instance(mockNavigation));
  when(mockSandbox.performance).thenReturn(instance(mockPerformance));
  when(mockSandbox.pubsub).thenReturn(instance(mockPubsub));
  when(mockSandbox.sandboxContext).thenReturn(instance(mockSandboxContext));
  when(mockSandbox.widgets).thenReturn(instance(mockWidgets));
  when(mockSandbox.authorization).thenReturn(instance(mockAuthorization));
  when(mockSandbox.pluginConfig).thenReturn(instance(mockPluginConfig));
  when(mockSandbox.genos).thenReturn(instance(mockGenos));
  when(mockSandbox.preferences).thenReturn(instance(mockPreferences));
  when(mockSandbox.variability).thenReturn(instance(mockVariability));
});

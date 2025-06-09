import { useSandboxContext } from '@appfabric/providers';
import { Sandbox } from '@appfabric/sandbox-spec';

/**
 * Provides consumers with access to sandbox
 *
 * @return {Object} sandbox
 */
export default (): Sandbox => useSandboxContext() as unknown as Sandbox;

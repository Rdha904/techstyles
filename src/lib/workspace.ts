export const DEFAULT_WORKSPACE_ID = "default";

/**
 * Resolves the workspace for the current request. There is no authentication
 * yet, so every request uses the default workspace. Once sign-in exists, derive
 * the id from the session here; no route needs to change.
 */
export async function currentWorkspaceId(): Promise<string> {
  return DEFAULT_WORKSPACE_ID;
}

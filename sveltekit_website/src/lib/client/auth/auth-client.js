import { createAuthClient } from "better-auth/svelte";

// Better Auth uses the current origin by default. Keeping the client same-origin
// avoids sending login requests to a stale URL when moving between environments.
export const authClient = createAuthClient();

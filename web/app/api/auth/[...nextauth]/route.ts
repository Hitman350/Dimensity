// NextAuth v5 App Router route handler.
// Re-exports GET and POST from the auth config.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

// Wraps the app in NextAuth's SessionProvider for client-side session access via useSession().

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

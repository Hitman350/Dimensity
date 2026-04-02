import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { verifyMessage } from "viem";
import { prisma } from "@/lib/prisma";

// NextAuth v5 config with SIWE credentials provider.
// JWT-only — no database sessions. Session data comes from the token.
// SIWE verification is inlined (no self-calling fetch to /api/auth/verify).

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "SIWE",
      credentials: {
        message: { type: "text" },
        signature: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.message || !credentials?.signature) return null;

        try {
          const messageFields = JSON.parse(credentials.message as string);
          const signature = credentials.signature as string;

          // Reconstruct SiweMessage from JSON fields
          const siweMessage = new SiweMessage(messageFields);
          const preparedMessage = siweMessage.prepareMessage();

          // Verify signature using viem (not siwe's internal ethers - which has recovery issues)
          const isValid = await verifyMessage({
            address: messageFields.address as `0x${string}`,
            message: preparedMessage,
            signature: signature as `0x${string}`,
          });

          if (!isValid) {
            console.error("[Auth] Signature verification failed");
            return null;
          }

          const fields = siweMessage;

          // Validate nonce — must exist, not expired, not already used
          const nonce = await prisma.nonce.findUnique({
            where: { value: fields.nonce },
          });

          if (!nonce || nonce.used || new Date() > nonce.expires_at) {
            console.error("[Auth] Invalid, used, or expired nonce");
            return null;
          }

          // Mark nonce as used
          await prisma.nonce.update({
            where: { value: fields.nonce },
            data: { used: true },
          });

          const address = fields.address.toLowerCase();

          // Find or create user by wallet address
          const existingWallet = await prisma.wallet.findFirst({
            where: { address },
          });

          let userId: string;

          if (existingWallet) {
            userId = existingWallet.user_id;
          } else {
            // First-time user — create user + wallet
            const user = await prisma.user.create({
              data: {
                wallets: {
                  create: {
                    address,
                    nickname: "Main Wallet",
                    is_active: true,
                  },
                },
              },
            });
            userId = user.id;
          }

          return {
            id: userId,
            name: address, // address stored in name field for JWT
          };
        } catch (err) {
          console.error("[SIWE Auth Error]", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.address = user.name; // wallet address
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).userId = token.userId;
        (session.user as unknown as Record<string, unknown>).address = token.address;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // redirect to home — ConnectWallet handles the UI
  },
});

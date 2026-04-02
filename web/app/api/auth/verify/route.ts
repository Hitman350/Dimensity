import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { prisma } from "@/lib/prisma";

// Verify a SIWE signature, validate the nonce, create/find user + wallet, return user data.

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    // Parse and verify SIWE message
    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    // Validate nonce — must exist, not expired, not already used
    const nonce = await prisma.nonce.findUnique({
      where: { value: fields.nonce },
    });

    if (!nonce) {
      return NextResponse.json(
        { error: "Invalid nonce" },
        { status: 401 }
      );
    }

    if (nonce.used) {
      return NextResponse.json(
        { error: "Nonce already used — possible replay attack" },
        { status: 401 }
      );
    }

    if (new Date() > nonce.expires_at) {
      return NextResponse.json(
        { error: "Nonce expired — please try again" },
        { status: 401 }
      );
    }

    // Mark nonce as used (single-use)
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
    let walletId: string;

    if (existingWallet) {
      userId = existingWallet.user_id;
      walletId = existingWallet.id;
    } else {
      // First-time user — create user + wallet in one transaction
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
        include: { wallets: true },
      });
      userId = user.id;
      walletId = user.wallets[0].id;
    }

    // Return user data for NextAuth session
    return NextResponse.json({
      id: userId,
      address,
      walletId,
    });
  } catch (error) {
    console.error("[SIWE Verify Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 401 }
    );
  }
}

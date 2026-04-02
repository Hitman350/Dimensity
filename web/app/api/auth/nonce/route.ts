import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Generate a random nonce, store it with 5-minute expiry, return it.
// Called before every sign-in attempt.

export async function GET() {
  try {
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.nonce.create({
      data: {
        value: nonce,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("[Nonce Error]", error);
    return NextResponse.json(
      { error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}

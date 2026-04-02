import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiweMessage } from "siwe";

// GET /api/wallets — list all wallets for authenticated user
// POST /api/wallets — add a new wallet (requires SIWE signature from that wallet)

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).userId as string;

  const wallets = await prisma.wallet.findMany({
    where: { user_id: userId },
    select: {
      address: true,
      nickname: true,
      chain: true,
      is_active: true,
      added_at: true,
    },
    orderBy: { added_at: "asc" },
  });

  return NextResponse.json({ wallets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).userId as string;

  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: "SIWE message and signature required to prove wallet ownership" },
        { status: 400 }
      );
    }

    // Verify SIWE signature to confirm ownership of the address being added
    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });
    const address = fields.address.toLowerCase();

    // Check for duplicate
    const existing = await prisma.wallet.findUnique({
      where: { user_id_address: { user_id: userId, address } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Wallet already added to your account" },
        { status: 409 }
      );
    }

    const wallet = await prisma.wallet.create({
      data: {
        user_id: userId,
        address,
        nickname: null,
        is_active: false,
      },
    });

    return NextResponse.json({
      wallet: {
        address: wallet.address,
        nickname: wallet.nickname,
        chain: wallet.chain,
        is_active: wallet.is_active,
      },
    });
  } catch (error) {
    console.error("[Add Wallet Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add wallet" },
      { status: 500 }
    );
  }
}

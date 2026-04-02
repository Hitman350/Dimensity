import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiweMessage } from "siwe";

// PATCH /api/wallets/[address] — update nickname or switch active wallet
// DELETE /api/wallets/[address] — remove wallet (blocks if last one)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).userId as string;
  const { address } = await params;
  const normalizedAddress = address.toLowerCase();

  try {
    const body = await req.json();
    const { nickname, is_active } = body as {
      nickname?: string;
      is_active?: boolean;
    };

    // Verify wallet belongs to this user
    const wallet = await prisma.wallet.findUnique({
      where: {
        user_id_address: { user_id: userId, address: normalizedAddress },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    // If switching active wallet, deactivate all others first
    if (is_active === true) {
      await prisma.$transaction([
        prisma.wallet.updateMany({
          where: { user_id: userId },
          data: { is_active: false },
        }),
        prisma.wallet.update({
          where: { id: wallet.id },
          data: { is_active: true, ...(nickname !== undefined ? { nickname } : {}) },
        }),
      ]);
    } else if (nickname !== undefined) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { nickname },
      });
    }

    // Return updated wallet
    const updated = await prisma.wallet.findUnique({
      where: { id: wallet.id },
      select: {
        address: true,
        nickname: true,
        chain: true,
        is_active: true,
      },
    });

    return NextResponse.json({ wallet: updated });
  } catch (error) {
    console.error("[Update Wallet Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update wallet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).userId as string;
  const { address } = await params;
  const normalizedAddress = address.toLowerCase();

  try {
    const { message, signature } = await req.json();

    // Re-SIWE required — prove you still own this wallet before deleting
    if (!message || !signature) {
      return NextResponse.json(
        { error: "SIWE signature required to prove wallet ownership before deletion" },
        { status: 400 }
      );
    }

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    if (fields.address.toLowerCase() !== normalizedAddress) {
      return NextResponse.json(
        { error: "Signature address does not match wallet being removed" },
        { status: 403 }
      );
    }

    // Check wallet count — can't remove the last one
    const walletCount = await prisma.wallet.count({
      where: { user_id: userId },
    });

    if (walletCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove your last wallet" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        user_id_address: { user_id: userId, address: normalizedAddress },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    const wasActive = wallet.is_active;

    await prisma.wallet.delete({ where: { id: wallet.id } });

    // If deleted wallet was active, make the first remaining wallet active
    if (wasActive) {
      const firstWallet = await prisma.wallet.findFirst({
        where: { user_id: userId },
        orderBy: { added_at: "asc" },
      });
      if (firstWallet) {
        await prisma.wallet.update({
          where: { id: firstWallet.id },
          data: { is_active: true },
        });
      }
    }

    return NextResponse.json({ deleted: normalizedAddress });
  } catch (error) {
    console.error("[Delete Wallet Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete wallet" },
      { status: 500 }
    );
  }
}


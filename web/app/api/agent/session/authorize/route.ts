import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pendingSessions } from "@/lib/sessionCache";
import { createPublicClient, http, getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toEmptyECDSASigner } from "@zerodev/permissions/signers";
import { constants } from "@zerodev/sdk";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serializedPermission, smartAccountAddress, sessionKeyAddress } = body;

        if (!serializedPermission || !smartAccountAddress || !sessionKeyAddress) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Authenticate SIWE user
        const session = await auth();
        const userId = (session?.user as any)?.userId;
        const eoaAddress = (session?.user as any)?.address;
        
        if (!userId || !eoaAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Verify wallet belongs to user and is active
        const activeWallet = await prisma.wallet.findFirst({
            where: { user_id: userId, address: eoaAddress, is_active: true }
        });

        if (!activeWallet) {
            return NextResponse.json({ error: "No active wallet found" }, { status: 403 });
        }

        // 5. Verify the submitted session key belongs to the prepared session
        const pendingSession = pendingSessions[userId];
        if (!pendingSession) {
            return NextResponse.json({ error: "No pending session" }, { status: 404 });
        }

        if (pendingSession.address.toLowerCase() !== sessionKeyAddress.toLowerCase()) {
            return NextResponse.json({ error: "Session key mismatch" }, { status: 403 });
        }

        // 6. Verify session has not expired
        if (Date.now() > pendingSession.expiresAt) {
            delete pendingSessions[userId];
            return NextResponse.json({ error: "Pending session expired" }, { status: 400 });
        }

        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(process.env.BASE_SEPOLIA_RPC_URL),
        });

        // 4. Verify the submitted permission belongs to that Smart Account
        // Try to deserialize it to ensure it is valid
        let permissionAccount;
        try {
            const emptySigner = await toEmptyECDSASigner(sessionKeyAddress as `0x${string}`);
            permissionAccount = await deserializePermissionAccount(
                publicClient,
                constants.getEntryPoint('0.7'),
                constants.KERNEL_V3_1,
                serializedPermission,
                emptySigner
            );
        } catch (err) {
            console.error("Invalid permission payload", err);
            return NextResponse.json({ error: "Invalid serialized permission" }, { status: 400 });
        }

        if (permissionAccount.address.toLowerCase() !== smartAccountAddress.toLowerCase()) {
            return NextResponse.json({ error: "Permission does not match smart account" }, { status: 403 });
        }

        // Calculate expiresAt for the DB (assuming 24h as per spec)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Finalize AgentSession in DB
        const agentSession = await prisma.agentSession.create({
            data: {
                user_id: userId,
                sessionKeyAddress: pendingSession.address,
                encryptedPrivateKey: pendingSession.encryptedPrivateKey,
                serializedPermission,
                smartAccountAddress: getAddress(smartAccountAddress),
                expiresAt,
                status: "ACTIVE",
            }
        });

        // Clean up pending session
        delete pendingSessions[userId];

        return NextResponse.json({
            success: true,
            sessionId: agentSession.id
        });

    } catch (error: any) {
        console.error("Session authorize error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

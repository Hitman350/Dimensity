import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, revokeAll } = body;

        if (!sessionId && !revokeAll) {
            return NextResponse.json({ error: "Missing sessionId or revokeAll flag" }, { status: 400 });
        }

        const session = await auth();
        const userId = (session?.user as any)?.userId;
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (revokeAll) {
            // Mark all as revoked and destroy key material
            await prisma.agentSession.updateMany({
                where: { user_id: userId, status: "ACTIVE" },
                data: { status: "REVOKED", encryptedPrivateKey: "" }
            });
        } else {
            // Find the agent session
            const agentSession = await prisma.agentSession.findUnique({
                where: { id: sessionId }
            });

            if (!agentSession) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 });
            }

            if (agentSession.user_id !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            // Mark as revoked and destroy key material
            await prisma.agentSession.update({
                where: { id: sessionId },
                data: { status: "REVOKED", encryptedPrivateKey: "" }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Session revoke error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

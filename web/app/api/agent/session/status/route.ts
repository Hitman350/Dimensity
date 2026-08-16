import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        const userId = (session?.user as any)?.userId;
        
        if (!userId) {
            return NextResponse.json({ isActive: false });
        }

        const agentSession = await prisma.agentSession.findFirst({
            where: { user_id: userId, status: "ACTIVE" },
            orderBy: { created_at: "desc" }
        });

        if (!agentSession || new Date() > agentSession.expiresAt) {
            return NextResponse.json({ isActive: false });
        }

        return NextResponse.json({
            isActive: true,
            smartAccountAddress: agentSession.smartAccountAddress
        });
    } catch (error: any) {
        console.error("Session status error:", error);
        return NextResponse.json({ isActive: false });
    }
}

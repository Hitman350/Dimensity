import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";

// Encrypt the private key before storing it in temporary cache
function encrypt(text: string): string {
    const key = process.env.SESSION_ENCRYPTION_KEY;
    if (!key) throw new Error("SESSION_ENCRYPTION_KEY is not set");
    
    // Create a 256-bit key from the hex string
    const keyBuffer = Buffer.from(key, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    return `${iv.toString("hex")}:${encrypted}`;
}

import { pendingSessions } from "@/lib/sessionCache";

export async function POST() {
    try {
        const session = await auth();
        const userId = (session?.user as any)?.userId;
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate the ephemeral session key
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        
        // Encrypt the private key securely
        const encryptedPrivateKey = encrypt(privateKey);
        
        // Store in temporary cache (expires in 10 minutes)
        pendingSessions[userId] = {
            encryptedPrivateKey,
            address: account.address,
            expiresAt: Date.now() + 10 * 60 * 1000,
        };

        // Return ONLY the public session key address
        return NextResponse.json({
            sessionKeyAddress: account.address
        });
        
    } catch (error: any) {
        console.error("Session prepare error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

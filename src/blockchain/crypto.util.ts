import crypto from "crypto";

export function decrypt(encryptedText: string): string {
    const key = process.env.SESSION_ENCRYPTION_KEY;
    if (!key) throw new Error("SESSION_ENCRYPTION_KEY is not set");
    
    const textParts = encryptedText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedData = Buffer.from(textParts.join(":"), "hex");
    
    const keyBuffer = Buffer.from(key, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
}

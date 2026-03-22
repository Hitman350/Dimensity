import type { Signer } from "./types.js";
import { LocalSigner } from "./LocalSigner.js";
import { KernelSigner } from "./KernelSigner.js";

export function createSigner(): Signer {
  const signerType = process.env.SIGNER_TYPE || "local";

  switch (signerType) {
    case "local": {
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          "PRIVATE_KEY environment variable is required for local signer"
        );
      }
      return new LocalSigner(privateKey);
    }
    case "kernel":
      return new KernelSigner();
    default:
      throw new Error(
        `Unknown SIGNER_TYPE: ${signerType}. Use 'local' or 'kernel'.`
      );
  }
}

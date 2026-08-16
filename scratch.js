import { toEmptyECDSASigner } from "@zerodev/permissions/signers";
const emptySessionSigner = toEmptyECDSASigner("0xd5c03f394bfdf7...");
console.log(emptySessionSigner.getSignerData);
console.log(typeof emptySessionSigner.getSignerData);

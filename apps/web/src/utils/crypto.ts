import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = process.env.WP_ENCRYPTION_KEY || process.env.NEWRON_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
if (!KEY || KEY.length < 32) {
  // not throwing here to avoid breaking in environments that don't need encryption for demo
}

export function encrypt(text: string) {
  if (!KEY) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, "utf-8").slice(0, 32), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string) {
  if (!KEY) return payload;
  try {
    const [ivHex, tagHex, encryptedHex] = payload.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, "utf-8").slice(0, 32), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf-8");
  } catch (err) {
    console.warn("Decryption failed, returning original payload");
    return payload;
  }
}

import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OTP_EXPIRY_MINUTES = 15;
export const OTP_RESEND_COOLDOWN_SECONDS = 120;
export const OTP_MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getOtpSecret() {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error("Missing OTP_SECRET");
  }
  return secret;
}

export function generateOtpCode() {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

export function hashOtp(email: string, code: string) {
  return createHmac("sha256", getOtpSecret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export function verifyOtpHash(email: string, code: string, storedHash: string) {
  const incomingHash = hashOtp(email, code);

  const incomingBuffer = Buffer.from(incomingHash, "utf8");
  const storedBuffer = Buffer.from(storedHash, "utf8");

  if (incomingBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, storedBuffer);
}
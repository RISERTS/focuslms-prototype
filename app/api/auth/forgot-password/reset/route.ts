import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  OTP_MAX_ATTEMPTS,
  verifyOtpHash,
} from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      otp?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const email = normalizeEmail(body.email || "");
    const otp = (body.otp || "").trim();
    const newPassword = body.newPassword || "";
    const confirmPassword = body.confirmPassword || "";

    if (!email || !otp || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "OTP must be a 6-digit code." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const now = new Date();

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        invalidatedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        codeHash: true,
        expiresAt: true,
        failedAttempts: true,
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    if (otpRecord.expiresAt < now) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          invalidatedAt: now,
        },
      });

      return NextResponse.json(
        { error: "OTP has expired." },
        { status: 400 }
      );
    }

    if (otpRecord.failedAttempts >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          invalidatedAt: now,
        },
      });

      return NextResponse.json(
        { error: "OTP can no longer be used. Request a new one." },
        { status: 400 }
      );
    }

    const isValidOtp = verifyOtpHash(email, otp, otpRecord.codeHash);

    if (!isValidOtp) {
      const nextAttempts = otpRecord.failedAttempts + 1;

      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          failedAttempts: {
            increment: 1,
          },
          invalidatedAt: nextAttempts >= OTP_MAX_ATTEMPTS ? now : null,
        },
      });

      return NextResponse.json(
        {
          error:
            nextAttempts >= OTP_MAX_ATTEMPTS
              ? "Too many incorrect attempts. Request a new OTP."
              : "Invalid or expired OTP.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      }),
      prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: {
          consumedAt: now,
          invalidatedAt: now,
        },
      }),
      prisma.passwordResetOtp.updateMany({
        where: {
          userId: user.id,
          id: {
            not: otpRecord.id,
          },
          consumedAt: null,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Password changed successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
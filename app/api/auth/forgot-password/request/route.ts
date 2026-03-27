import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetOtpEmail } from "@/lib/mail";
import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "If an account exists for that email, an OTP has been sent.";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
    };

    const email = normalizeEmail(body.email || "");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const now = new Date();
    const fallbackResendAvailableAt = new Date(
      now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000
    );

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        message: GENERIC_MESSAGE,
        resendAvailableAt: fallbackResendAvailableAt.toISOString(),
      });
    }

    const latestOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        lastSentAt: true,
      },
    });

    if (latestOtp) {
      const resendAvailableAt = new Date(
        latestOtp.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000
      );

      if (resendAvailableAt > now) {
        return NextResponse.json({
          message: GENERIC_MESSAGE,
          resendAvailableAt: resendAvailableAt.toISOString(),
        });
      }
    }

    await prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });

    const otp = generateOtpCode();
    const codeHash = hashOtp(email, otp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const createdOtp = await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
        lastSentAt: now,
      },
      select: {
        id: true,
      },
    });

    try {
      await sendPasswordResetOtpEmail({
        to: user.email,
        name: user.name,
        otp,
      });
    } catch (mailError) {
      console.error("Send OTP email error:", mailError);

      await prisma.passwordResetOtp.update({
        where: { id: createdOtp.id },
        data: {
          invalidatedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: "Unable to send OTP right now. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: GENERIC_MESSAGE,
      resendAvailableAt: fallbackResendAvailableAt.toISOString(),
    });
  } catch (error) {
    console.error("Forgot password request error:", error);
    return NextResponse.json(
      { error: "Failed to process forgot password request." },
      { status: 500 }
    );
  }
}
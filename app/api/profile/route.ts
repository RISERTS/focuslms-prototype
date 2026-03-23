import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: {
      name: string;
      passwordHash?: string;
    } = {
      name: body.name.trim(),
    };

    const wantsPasswordChange =
      !!body.currentPassword || !!body.newPassword || !!body.confirmPassword;

    if (wantsPasswordChange) {
      if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
        return NextResponse.json(
          { error: "Complete all password fields." },
          { status: 400 }
        );
      }

      const passwordMatches = await compare(
        body.currentPassword,
        user.passwordHash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }

      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 }
        );
      }

      if (body.newPassword !== body.confirmPassword) {
        return NextResponse.json(
          { error: "New passwords do not match." },
          { status: 400 }
        );
      }

      updateData.passwordHash = await hash(body.newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";
import InstructorShell from "@/components/instructor/InstructorShell";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const content = (
    <ProfileForm
      initialName={user.name ?? ""}
      email={user.email}
      role={user.role}
    />
  );

  if (session.role === "INSTRUCTOR") {
    return (
      <InstructorShell
        title="Profile Settings"
        description="Update your account name and password."
        sessionEmail={user.email}
      >
        {content}
      </InstructorShell>
    );
  }

  return (
    <StudentShell
      title="Profile Settings"
      description="Update your account name and password."
      sessionEmail={user.email}
    >
      {content}
    </StudentShell>
  );
}
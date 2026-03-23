import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import StudentShell from "@/components/student/StudentShell";
import InstructorShell from "@/components/instructor/InstructorShell";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const content = (
    <ProfileForm
      initialName={session.name ?? ""}
      email={session.email}
      role={session.role}
    />
  );

  if (session.role === "INSTRUCTOR") {
    return (
      <InstructorShell
        title="Profile Settings"
        description="Update your display name and password."
        sessionEmail={session.email}
      >
        {content}
      </InstructorShell>
    );
  }

  return (
    <StudentShell
      title="Profile Settings"
      description="Update your display name and password."
      sessionEmail={session.email}
    >
      {content}
    </StudentShell>
  );
}
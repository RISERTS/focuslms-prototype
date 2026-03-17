import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import LogOnMount from "@/components/LogOnMount";

export default async function InstructorDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "INSTRUCTOR") {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <LogOnMount actionType="VIEW_DASHBOARD" />

      <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
      <p className="mt-2">Welcome, {session.email}</p>

      <div className="mt-6 space-y-2">
        <Link href="/instructor/courses" className="block underline">
          My Courses
        </Link>
        <Link href="/instructor/courses/create" className="block underline">
          Create Course
        </Link>
      </div>

      <form action="/api/logout" method="post" className="mt-6">
        <button className="rounded bg-black px-4 py-2 text-white">
          Logout
        </button>
      </form>
    </main>
  );
}
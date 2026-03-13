import { prisma } from "@/lib/prisma";

export default async function TestDbPage() {
  const userCount = await prisma.user.count();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Database Test</h1>
      <p className="mt-2">User count: {userCount}</p>
    </main>
  );
}
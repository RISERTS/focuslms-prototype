export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">FocusLMS Prototype</h1>
      <p className="mt-4">
        Analytics-Driven, Rule-Based Adaptive Assessment for Personalized Learning
      </p>

      <div className="mt-8 space-y-2">
        <a href="/register" className="block underline">Register</a>
        <a href="/login" className="block underline">Login</a>
        <a href="/student/dashboard" className="block underline">Student Dashboard</a>
        <a href="/instructor/dashboard" className="block underline">Instructor Dashboard</a>
        <a href="/test-db" className="block underline">Test Database</a>
      </div>
    </main>
  );
}
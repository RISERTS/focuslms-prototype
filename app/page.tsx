import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900">
      <section className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-m font-semibold uppercase tracking-[0.25em] text-gray-500">
              FocusLMS
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Register
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1.3fr_0.7fr] lg:py-3">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
            Analytics-Driven Learning
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            A focused LMS with adaptive assessment and learning analytics
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600">
            FocusLMS is a web-based learning management system designed to help
            students stay engaged while giving instructors better control over
            quizzes, materials, analytics, and rule-based adaptive assessment.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Get Started
            </Link>

            <Link
              href="/student/courses"
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Browse Courses
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold">Adaptive</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Rule-based progression using correctness and response time.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold">Focused</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Clean interface built to reduce distractions during learning.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-2xl font-bold">Insightful</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Engagement logs, quiz attempts, and BEI-based monitoring.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="rounded-2xl bg-black p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
                System Modules
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold">Courses and Materials</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Create courses, enroll students, and organize lesson
                    resources.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold">Quiz Management</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Build quizzes manually or generate question drafts for
                    instructor review.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold">Analytics Dashboard</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Monitor scores, completion, materials opened, interactions,
                    and BEI.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold">Adaptive Assessment</p>
                  <p className="mt-1 text-sm text-gray-300">
                    Deliver the next question based on student performance and
                    timing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
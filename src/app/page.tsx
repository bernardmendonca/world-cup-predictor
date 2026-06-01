import { redirect } from "next/navigation";
import { isTestMode, getTestGroupSlug, ensureTestData } from "@/lib/test-mode/test-mode";

export const dynamic = "force-dynamic";

export default async function Home() {
  // In test mode, ensure test data exists and show a link to test group
  if (isTestMode()) {
    await ensureTestData();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">World Cup Predictor 2026</h1>
      <p className="text-lg text-gray-600 mb-8">
        Predict match scores and compete with friends
      </p>

      {isTestMode() && (
        <a
          href={`/${getTestGroupSlug()}`}
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Go to Test Group →
        </a>
      )}

      <form action={handleGroupSubmit} className="flex flex-col items-center gap-4">
        <label htmlFor="groupSlug" className="text-sm text-gray-500">
          Enter your group slug to get started
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="groupSlug"
            name="groupSlug"
            placeholder="my-group"
            pattern="[a-z0-9][a-z0-9-]{1,28}[a-z0-9]"
            required
            className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Join
          </button>
        </div>
      </form>
    </main>
  );
}

async function handleGroupSubmit(formData: FormData) {
  "use server";
  const slug = formData.get("groupSlug") as string;
  if (slug) {
    redirect(`/${slug}`);
  }
}

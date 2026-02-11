import { AppShell } from "@/components/app-shell";

export default function RemovalRequestPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">Request Removal</h1>
        <p className="mt-2 text-sm text-neutral-gray">
          If you appear in a photo on mogged.chat and would like it removed,
          please provide the details below and we&apos;ll process your request
          promptly.
        </p>

        <form
          action="mailto:removal@mogged.chat"
          method="POST"
          encType="text/plain"
          className="mt-8 space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Your Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Person Page URL or Name
            </label>
            <input
              type="text"
              name="person"
              required
              className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
              placeholder="https://mogged.chat/p/... or person name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Reason for Removal
            </label>
            <textarea
              name="reason"
              rows={4}
              className="w-full rounded-lg border border-neutral-gray/30 px-3 py-2.5 text-sm focus:border-green-primary focus:outline-none focus:ring-1 focus:ring-green-primary"
              placeholder="Please explain why this entry should be removed..."
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-green-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-light"
          >
            Submit Request
          </button>
        </form>
      </div>
    </AppShell>
  );
}

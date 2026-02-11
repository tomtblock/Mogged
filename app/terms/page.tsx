import { AppShell } from "@/components/app-shell";

export default function TermsPage() {
  return (
    <AppShell>
      <div className="prose mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-sm text-neutral-gray">
          Last updated: February 2026
        </p>

        <h2 className="mt-8 text-lg font-semibold">1. Acceptance of Terms</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          By accessing or using mogged.chat (&ldquo;the Service&rdquo;), you agree to be bound
          by these Terms of Service. If you do not agree, do not use the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold">2. Eligibility</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          You must be at least 18 years old to use the Service. By creating an
          account, you confirm that you are 18 or older.
        </p>

        <h2 className="mt-8 text-lg font-semibold">3. Subscription</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          Access to voting and private games requires a monthly subscription of
          $5/month, billed through Stripe. You can cancel at any time through
          your account settings; access continues until the end of the billing
          period.
        </p>

        <h2 className="mt-8 text-lg font-semibold">4. User Conduct</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          You agree not to upload content that is NSFW, hateful, harassing,
          depicts minors, or violates any law. We reserve the right to remove
          content and terminate accounts at our discretion.
        </p>

        <h2 className="mt-8 text-lg font-semibold">5. Content Ownership</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          When uploading photos, you represent that you own or have permission
          to use them. Seed content is sourced under Creative Commons or fair use
          with attribution.
        </p>

        <h2 className="mt-8 text-lg font-semibold">6. Removal Requests</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          If you appear in a photo on the Service and wish to have it removed,
          please visit our{" "}
          <a href="/removal-request" className="text-green-primary underline">
            removal request page
          </a>
          .
        </p>

        <h2 className="mt-8 text-lg font-semibold">7. Limitation of Liability</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          The Service is provided &ldquo;as is&rdquo; without warranty. We are not liable for
          any damages arising from your use of the Service.
        </p>

        <h2 className="mt-8 text-lg font-semibold">8. Changes to Terms</h2>
        <p className="mt-2 text-sm leading-relaxed text-text/80">
          We may update these terms at any time. Continued use constitutes
          acceptance of the updated terms.
        </p>
      </div>
    </AppShell>
  );
}

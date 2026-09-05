import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Quantum Therapy collects, uses and protects your information.",
};

type Section = { heading: string; body: string[] };

const SECTIONS: Section[] = [
  {
    heading: "1. Who we are",
    body: [
      "Quantum Therapy is operated by Better Branding LLC, 8376 Davis Blvd #229, NRH, TX 76182 (\"Better Branding,\" \"we,\" \"us\"). This policy explains what information we collect through the Quantum Therapy app and website at quantumtherapy.app, how we use it, and the choices you have.",
      "If you have questions about this policy or want to exercise any of the rights described below, contact us at hello@thebetterbranding.com.",
    ],
  },
  {
    heading: "2. Information we collect",
    body: [
      "Account information. When you create an account, we collect your email address, and, if you sign in with Google, your name and profile photo.",
      "Session records. When you play a protocol or tone while signed in, we store the frequencies played, the duration, the ambient preset selected, and the date and time of the session, so your monthly usage and history can be tracked.",
      "Billing data. If you subscribe to a paid plan, our payment processor, Stripe, collects and stores your payment method and billing details directly. We receive and store your Stripe customer ID, subscription tier and status, and renewal date, but we never see or store your full card number.",
      "Device and usage information. We may collect basic technical information such as browser type, device type and general usage patterns to keep the app working correctly and to understand aggregate usage.",
    ],
  },
  {
    heading: "3. How we use your information",
    body: [
      "We use the information above to operate the app, including creating and authenticating your account, letting you resume where you left off, enforcing free-tier session limits, processing payments and renewals, and providing customer support.",
      "We also use it to sync a record of your account, plan and usage to our customer relationship management system, GoHighLevel, so our team can respond to support requests and understand how the product is used. We do not sell your personal information to third parties.",
    ],
  },
  {
    heading: "4. Third-party service providers",
    body: [
      "We rely on a small number of vetted service providers to run Quantum Therapy, each of which processes data only as needed to provide their service to us:",
      "Supabase, our database and authentication provider, stores your account, profile and session records.",
      "Stripe, our payment processor, handles subscription billing and stores your payment method and billing history.",
      "GoHighLevel, our customer relationship management platform, stores a copy of your contact and subscription details so our team can support you.",
      "Vercel, our hosting provider, serves the application and may log basic request metadata for reliability and security purposes.",
      "Each provider is contractually restricted from using your information for any purpose other than providing services to us.",
    ],
  },
  {
    heading: "5. Data retention",
    body: [
      "We retain account and session data for as long as your account remains active, so your history and usage limits work correctly. If you close your account or request deletion, we delete or anonymize your personal information within 30 days, except where we are required to retain limited records (such as billing history) to comply with tax, accounting or legal obligations.",
    ],
  },
  {
    heading: "6. Your rights",
    body: [
      "You can access, correct or update your account information at any time from your profile page. You may request a copy of the personal information we hold about you, and you may request that we delete your account and associated data, by emailing hello@thebetterbranding.com.",
      "We will verify your request and respond within a reasonable time, generally within 30 days. Deleting your account will cancel any active subscription and remove your session history, favorites and profile information from our systems, subject to the retention exceptions described above.",
    ],
  },
  {
    heading: "7. Children's privacy",
    body: [
      "Quantum Therapy is not directed to children under 16, and we do not knowingly collect personal information from children under 16. If you believe a child has provided us with personal information, contact us and we will delete it.",
    ],
  },
  {
    heading: "8. Security",
    body: [
      "We use industry-standard safeguards, including encryption in transit and access controls on our databases, to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "9. Changes to this policy",
    body: [
      "We may update this policy from time to time. If we make material changes, we will update the effective date below and, where appropriate, notify you directly. Continued use of Quantum Therapy after a change means you accept the updated policy.",
    ],
  },
  {
    heading: "10. Contact us",
    body: [
      "Better Branding LLC, 8376 Davis Blvd #229, NRH, TX 76182. Email hello@thebetterbranding.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="px-5 pt-3 pb-6">
      <PageHeader eyebrow="Legal" title="Privacy Policy" backHref="/profile" backLabel="Profile" />
      <p className="rise mt-4 text-[0.75rem] text-ink-faint" style={{ animationDelay: "0.04s" }}>
        Effective date: January 1, 2026
      </p>

      <div className="mt-6 space-y-4">
        {SECTIONS.map((section, i) => (
          <section
            key={section.heading}
            className="rise glass p-5"
            style={{ animationDelay: `${0.06 + i * 0.03}s` }}
          >
            <h2 className="t-display text-[1.05rem] tracking-normal text-ink">{section.heading}</h2>
            <div className="mt-3 space-y-2.5">
              {section.body.map((p, j) => (
                <p key={j} className="text-[0.82rem] leading-relaxed text-ink-mute">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

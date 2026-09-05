import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Quantum Therapy.",
};

type Section = { heading: string; body: string[]; emphasis?: boolean };

const SECTIONS: Section[] = [
  {
    heading: "1. Acceptance of terms",
    body: [
      "These Terms of Service (\"Terms\") govern your use of Quantum Therapy, an app and website operated by Better Branding LLC, 8376 Davis Blvd #229, NRH, TX 76182 (\"Better Branding,\" \"we,\" \"us\"). By creating an account or using Quantum Therapy, you agree to these Terms. If you do not agree, do not use the app.",
    ],
  },
  {
    heading: "2. Medical disclaimer",
    emphasis: true,
    body: [
      "Quantum Therapy is an experimental and educational tool. It presents frequency information drawn from the public-domain Consolidated Annotated Frequency List and generates audio tones for you to listen to. Nothing in the app has been evaluated or approved by the FDA or any other medical authority, and nothing in the app is, or should be treated as, medical advice, diagnosis or treatment.",
      "Quantum Therapy is not a substitute for professional medical care. Always consult a qualified physician or other healthcare provider with any questions about a medical condition, and never disregard professional medical advice or delay seeking it because of anything you read or hear in this app.",
    ],
  },
  {
    heading: "3. Assumption of risk",
    body: [
      "You understand that Rife frequency theory is not accepted by mainstream medicine and that the effects of listening to binaural or isochronic audio at any given frequency are not scientifically established for treating any medical condition. You voluntarily assume all risk associated with using the app, including any audio playback at any frequency, duration or volume.",
    ],
  },
  {
    heading: "4. Contraindications",
    body: [
      "Do not use Quantum Therapy, or consult your doctor before use, if any of the following apply to you:",
      "You have epilepsy or another seizure disorder. Rhythmic audio and light patterns have been associated with seizures in susceptible individuals.",
      "You have a pacemaker, cochlear implant or any other implanted electronic medical device.",
      "You are pregnant.",
      "You are operating a vehicle or machinery. Never use headphones or otherwise engage with the app while driving or operating equipment.",
    ],
  },
  {
    heading: "5. Accounts and eligibility",
    body: [
      "You must be at least 16 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us immediately at hello@thebetterbranding.com if you suspect unauthorized use.",
    ],
  },
  {
    heading: "6. Subscriptions, billing and cancellation",
    body: [
      "Free accounts include a limited number of sessions per month. Paid plans (Pro and Premium) are billed monthly or yearly in advance through Stripe and renew automatically until canceled.",
      "You may cancel at any time from your profile's billing management page. Cancellation stops future renewals, but we do not provide refunds or credits for partial billing periods. You retain access to paid features through the end of the period you already paid for.",
      "We may change subscription pricing prospectively. If we do, we will provide notice before the change applies to your next renewal.",
    ],
  },
  {
    heading: "7. Acceptable use",
    body: [
      "You agree not to reverse engineer, scrape or resell the app or its underlying frequency database, attempt to bypass session limits or paywalls, or use the app in any way that violates applicable law.",
    ],
  },
  {
    heading: "8. Intellectual property",
    body: [
      "The Quantum Therapy app, its design, software and compiled frequency database are owned by Better Branding LLC or its licensors and are protected by intellectual property law. The underlying Rife frequency list is drawn from public-domain sources. You may use the app for personal, non-commercial purposes under these Terms.",
    ],
  },
  {
    heading: "9. Disclaimer of warranties",
    body: [
      "Quantum Therapy is provided \"as is\" and \"as available,\" without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose and non-infringement. We do not warrant that the app will be uninterrupted, error-free or that any frequency, protocol or tone will produce any particular effect.",
    ],
  },
  {
    heading: "10. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Better Branding LLC and its officers, employees and contractors will not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of health, data or profits, arising out of or related to your use of Quantum Therapy, even if advised of the possibility of such damages. Our total liability for any claim arising from these Terms or the app is limited to the amount you paid us in the twelve months preceding the claim.",
    ],
  },
  {
    heading: "11. Indemnification",
    body: [
      "You agree to indemnify and hold harmless Better Branding LLC from any claim, damage or expense, including reasonable attorneys' fees, arising from your use of the app or your violation of these Terms.",
    ],
  },
  {
    heading: "12. Governing law",
    body: [
      "These Terms are governed by the laws of the State of Texas, without regard to conflict of law principles. Any dispute arising from these Terms or the app will be resolved exclusively in the state or federal courts located in Tarrant County, Texas.",
    ],
  },
  {
    heading: "13. Changes to these terms",
    body: [
      "We may update these Terms from time to time. If we make material changes, we will update the effective date below and, where appropriate, notify you directly. Continued use of Quantum Therapy after a change means you accept the updated Terms.",
    ],
  },
  {
    heading: "14. Contact us",
    body: ["Better Branding LLC, 8376 Davis Blvd #229, NRH, TX 76182. Email hello@thebetterbranding.com."],
  },
];

export default function TermsPage() {
  return (
    <div className="px-5 pt-3 pb-6">
      <PageHeader eyebrow="Legal" title="Terms of Service" backHref="/profile" backLabel="Profile" />
      <p className="rise mt-4 text-[0.75rem] text-ink-faint" style={{ animationDelay: "0.04s" }}>
        Effective date: January 1, 2026
      </p>

      <div className="mt-6 space-y-4">
        {SECTIONS.map((section, i) => (
          <section
            key={section.heading}
            className={
              section.emphasis
                ? "rise glass rim p-5"
                : "rise glass p-5"
            }
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

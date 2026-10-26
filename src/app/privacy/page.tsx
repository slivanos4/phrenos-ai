import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { site } from "@/data/site-content";
import { ANALYTICS_COOKIES_ENABLED } from "@/lib/site/consent";

const pageTitle = "Privacy and cookies";
const pageDescription =
  "How Phrenos.ai collects, uses and protects your personal information, and how we use cookies.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "26 October 2026";

const h2 = "mt-12 font-serif text-2xl text-[#e0c078] sm:text-3xl";
const p = "mt-4 text-base leading-relaxed text-ivory/85";
const li = "mt-2 text-base leading-relaxed text-ivory/85";
const th = "border-b border-[#d4af5a]/30 px-3 py-2 text-left text-xs font-semibold tracking-[0.14em] text-sage uppercase";
const td = "border-b border-ivory/10 px-3 py-3 align-top text-sm leading-relaxed text-ivory/85";

export default function PrivacyPage() {
  return (
    <section className="bg-forest pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">Privacy</p>
        <h1 className="mt-4 font-serif text-4xl tracking-tight text-[#f0d9a0] sm:text-5xl">Privacy and cookies</h1>
        <p className="mt-4 text-sm text-sage">Last updated {UPDATED}</p>

        <p className={p}>
          This page explains what personal information {site.name} collects through this website, why, who it is shared
          with, how long it is kept and what your rights are. We try to keep it plain and short, and to collect only
          what we need.
        </p>

        <h2 className={h2}>Who we are</h2>
        <p className={p}>
          {site.name} is an independent AI consultancy run by Sophia Livanos, and is the controller of the personal
          information described here. You can contact us about anything on this page at{" "}
          <a href={`mailto:${site.email}`} className="text-[#e0c078] underline-offset-4 hover:underline">
            {site.email}
          </a>
          .
        </p>

        <h2 className={h2}>What we collect, and why</h2>
        <ul className="mt-4 list-disc pl-5">
          <li className={li}>
            <strong className="text-[#e0c078]">Contact form.</strong> Your name, work email, organisation, role and
            message. We use these to reply to you and to discuss working together. We rely on our legitimate interest
            in responding to enquiries, and on taking steps you ask for before entering a contract.
          </li>
          <li className={li}>
            <strong className="text-[#e0c078]">AI readiness check.</strong> Your answers and score, and your email
            address if you unlock the full result. We use them to show and email you your result, and we may follow up
            about it if it looks useful. We rely on your consent and on our legitimate interest in following up.
          </li>
          <li className={li}>
            <strong className="text-[#e0c078]">Cheat sheet.</strong> Your email address, so that we can give you the
            download and email you a link. We rely on your consent.
          </li>
          <li className={li}>
            <strong className="text-[#e0c078]">The AI Updates briefing.</strong> Your email address and where you
            signed up, so that we can send you new articles and occasional resources. We only add you if you ask, using
            the sign-up form or the box on our other forms. Every email has an unsubscribe link. We rely on your
            consent.
          </li>
          <li className={li}>
            <strong className="text-[#e0c078]">Article reactions.</strong> If you press the thumbs up or down on an
            article, we store that reaction with a random code kept in your browser. It does not identify you.
          </li>
          {ANALYTICS_COOKIES_ENABLED ? (
            <li className={li}>
              <strong className="text-[#e0c078]">Analytics, only if you accept.</strong> Pages viewed, clicks, device and
              browser, approximate location and, through Microsoft Clarity, anonymised recordings and heatmaps of how
              people use pages. We use these to improve the site, and rely on your consent. Vercel Web Analytics also
              counts visits without using cookies.
            </li>
          ) : (
            <li className={li}>
              <strong className="text-[#e0c078]">Visit counts.</strong> We count visits with Vercel Web Analytics, which
              does not use cookies and does not identify you. We do not currently use analytics cookies.
            </li>
          )}
        </ul>
        <p className={p}>
          We do not sell your information, and we do not use it to make automated decisions about you.
        </p>

        <h2 className={h2}>Who we share it with</h2>
        <p className={p}>
          We use a small number of trusted providers to run the site. They only handle your information to provide their
          service to us:
        </p>
        <ul className="mt-4 list-disc pl-5">
          <li className={li}>Vercel, which hosts the website.</li>
          <li className={li}>Supabase, which stores enquiries, sign-ups and subscribers in our database.</li>
          <li className={li}>Resend, which sends our emails.</li>
          <li className={li}>Web3Forms, which delivers form notifications to us.</li>
          {ANALYTICS_COOKIES_ENABLED ? (
            <li className={li}>Google (Analytics) and Microsoft (Clarity), only if you accept analytics cookies.</li>
          ) : null}
        </ul>
        <p className={p}>
          Some of these providers are based in, or process information in, countries outside the UK, including the
          United States. Where that happens we rely on approved safeguards such as the UK addendum to the standard
          contractual clauses, or an adequacy decision.
        </p>

        <h2 className={h2}>How long we keep it</h2>
        <ul className="mt-4 list-disc pl-5">
          <li className={li}>Enquiries and readiness or cheat sheet sign-ups: for as long as we need them to deal with your request, and then for up to 24 months.</li>
          <li className={li}>Briefing subscribers: until you unsubscribe. We then keep a minimal record so that we do not email you again.</li>
          <li className={li}>Article reactions: for as long as the article is published.</li>
        </ul>

        <h2 className={h2}>Cookies and similar technologies</h2>
        {ANALYTICS_COOKIES_ENABLED ? (
          <p className={p}>
            Essential items work without your consent. Analytics cookies are only set if you choose{" "}
            <strong className="text-[#e0c078]">Accept</strong> on the banner. You can change your mind at any time:{" "}
            <CookieSettingsButton className="text-[#e0c078] underline underline-offset-4 hover:text-[#f0d9a0]" />.
          </p>
        ) : (
          <p className={p}>
            This site only uses the essential items below, which work without your consent. We do not use advertising or
            analytics cookies.
          </p>
        )}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Purpose</th>
                <th className={th}>Lasts</th>
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_COOKIES_ENABLED ? (
                <tr>
                  <td className={td}>phrenos-cookie-consent (stored in your browser)</td>
                  <td className={td}>Remembers your cookie choice. Essential.</td>
                  <td className={td}>Until you clear it</td>
                </tr>
              ) : null}
              <tr>
                <td className={td}>phrenos_brief_access</td>
                <td className={td}>Lets you download the cheat sheet after you have given your email. Essential.</td>
                <td className={td}>30 days</td>
              </tr>
              <tr>
                <td className={td}>phrenos-visitor-key and article reaction (stored in your browser)</td>
                <td className={td}>Stops the same browser reacting to an article twice. Essential.</td>
                <td className={td}>Until you clear it</td>
              </tr>
              {ANALYTICS_COOKIES_ENABLED ? (
                <>
                  <tr>
                    <td className={td}>_ga, _ga_*</td>
                    <td className={td}>Google Analytics: tells visits apart and measures how the site is used. Analytics, only with consent.</td>
                    <td className={td}>Up to 2 years</td>
                  </tr>
                  <tr>
                    <td className={td}>_clck, _clsk, CLID, MUID</td>
                    <td className={td}>Microsoft Clarity: anonymised recordings and heatmaps. Analytics, only with consent.</td>
                    <td className={td}>Up to 1 year</td>
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </div>

        <h2 className={h2}>Your rights</h2>
        <p className={p}>
          Under UK data protection law you can ask to see the information we hold about you, have it corrected or
          deleted, restrict or object to how we use it, receive a copy you can move elsewhere, and withdraw your consent
          at any time. To use any of these rights, email{" "}
          <a href={`mailto:${site.email}`} className="text-[#e0c078] underline-offset-4 hover:underline">
            {site.email}
          </a>
          . If you are unhappy with how we have handled your information, you can complain to the Information
          Commissioner&rsquo;s Office at{" "}
          <a
            href="https://ico.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e0c078] underline-offset-4 hover:underline"
          >
            ico.org.uk
          </a>
          , though we would always like the chance to put things right first.
        </p>

        <h2 className={h2}>Changes to this page</h2>
        <p className={p}>
          If we change how we use your information we will update this page and the date at the top.
        </p>

        <p className="mt-12 text-sm text-sage">
          <Link href="/contact" className="text-[#e0c078] underline-offset-4 hover:underline">
            Questions? Get in touch.
          </Link>
        </p>
      </div>
    </section>
  );
}

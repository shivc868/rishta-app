import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/nav';
import { Card } from '@/components/ui';

/**
 * Public business page. Static, no sign-in, no client state.
 *
 * It exists so that anyone — a visitor, a payment gateway, or a platform
 * reviewing the business (Meta business verification) — can see who runs
 * Rishta, how to reach them, and what happens to the data. Keep the legal
 * name and address identical to the Udyam registration certificate.
 */

export const metadata: Metadata = {
  title: 'About Rishta · Shiv Kumar Technologies',
  description:
    'Rishta is a trust-first matrimonial register built and operated by Shiv Kumar Technologies, Kangra, Himachal Pradesh. Contact details, privacy policy and terms.',
};

const BUSINESS = {
  legalName: 'Shiv Kumar Technologies',
  product: 'Rishta',
  udyam: 'UDYAM-HP-04-0051162',
  addressLines: ['Rey, Fatehpur', 'Kangra, Himachal Pradesh 176058', 'India'],
  phone: '+91 98056 19625',
  email: 'shivc8658@gmail.com',
  updated: '20 October 2026',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-14">
      <header className="mb-8 flex items-center gap-4">
        <BrandMark size="md" />
        <div>
          <h1 className="display text-2xl leading-tight">About Rishta</h1>
          <p className="hindi text-sm text-ink-3">रिश्ता रजिस्टर के बारे में</p>
        </div>
      </header>

      <div className="space-y-5">
        <Card as="section" className="p-6">
          <h2 className="text-lg font-bold">What Rishta is</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Rishta is a matrimonial register for families looking for a match within their
            community. Families create a profile, browse other profiles, and send a request when
            they are interested. Photos and phone numbers stay private until both families agree
            to connect. There are no public listings and no advertising.
          </p>
        </Card>

        <Card as="section" className="p-6">
          <h2 className="text-lg font-bold">Who runs it</h2>
          <dl className="mt-3 grid gap-3 text-[15px] sm:grid-cols-[9rem_1fr]">
            <dt className="font-semibold text-ink-3">Business</dt>
            <dd>
              {BUSINESS.legalName}
              <span className="block text-sm text-ink-3">
                Registered MSME (Micro, Services) · {BUSINESS.udyam}
              </span>
            </dd>
            <dt className="font-semibold text-ink-3">Product</dt>
            <dd>{BUSINESS.product}</dd>
            <dt className="font-semibold text-ink-3">Address</dt>
            <dd>
              {BUSINESS.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
            <dt className="font-semibold text-ink-3">Phone</dt>
            <dd className="code">{BUSINESS.phone}</dd>
            <dt className="font-semibold text-ink-3">Email</dt>
            <dd>
              <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-stamp underline">
                {BUSINESS.email}
              </a>
            </dd>
          </dl>
        </Card>

        <Card as="section" className="scroll-mt-6 p-6">
          <h2 className="text-lg font-bold">Privacy policy</h2>
          <p className="mt-1 text-sm text-ink-3">Last updated {BUSINESS.updated}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">What we collect.</strong> Your mobile number (to sign
              you in), the profile details you choose to enter, photos you upload, and the requests
              you send or accept inside the app.
            </li>
            <li>
              <strong className="text-ink">One-time codes.</strong> When you sign in we send a
              6-digit code to your mobile number as a WhatsApp message. We use the WhatsApp
              Business Platform for delivery only; we do not read your WhatsApp chats.
            </li>
            <li>
              <strong className="text-ink">Who sees what.</strong> Your photos and phone number
              are hidden from other families until you both accept a connection. Your profile is
              never shown outside the app or to search engines.
            </li>
            <li>
              <strong className="text-ink">No selling of data.</strong> We do not sell, rent, or
              share your personal information with advertisers or data brokers.
            </li>
            <li>
              <strong className="text-ink">Storage.</strong> Data is stored with our hosting and
              database providers in encrypted form and is accessible only to the people who
              operate Rishta.
            </li>
            <li>
              <strong className="text-ink">Your choices.</strong> You can edit or hide your
              profile at any time from Settings. To delete your account and all its data, email us
              from the address above or write to {BUSINESS.email}; deletion is completed within 7
              days.
            </li>
          </ul>
        </Card>

        <Card as="section" className="scroll-mt-6 p-6">
          <h2 className="text-lg font-bold">Terms of use</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
            <li>Rishta is for adults seeking marriage, for themselves or on behalf of family.</li>
            <li>Profiles must be truthful. Misleading profiles are removed without notice.</li>
            <li>Use the contact details you receive only for the purpose of a marriage proposal.</li>
            <li>We may suspend accounts that harass other members or misuse the service.</li>
          </ul>
        </Card>

        <Card as="section" className="p-6">
          <h2 className="text-lg font-bold">Contact</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Questions, complaints, or data requests: email{' '}
            <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-stamp underline">
              {BUSINESS.email}
            </a>{' '}
            or call <span className="code">{BUSINESS.phone}</span> (Mon–Sat, 10am–6pm IST).
          </p>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-ink-3">
        <Link href="/login" className="font-semibold text-stamp underline">
          Back to sign in
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        © {new Date().getFullYear()} {BUSINESS.legalName}
      </p>
    </main>
  );
}

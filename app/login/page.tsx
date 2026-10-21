'use client'

import {Suspense, useEffect, useRef, useState} from 'react'
import Link from 'next/link'
import {useRouter, useSearchParams} from 'next/navigation'
import * as api from '@/lib/api'
import {ApiError} from '@/lib/api'
import * as auth from '@/lib/auth'
import {BrandMark} from '@/components/nav'
import {GaneshMark, GoldRule, Invocation} from '@/components/ornaments'
import {Button} from '@/components/ui'
import {useSession} from '@/components/providers'

/**
 * Sign-in is Google only for now. The WhatsApp OTP flow (lib/auth sendOtp /
 * verifyOtp and the Supabase hook) is built and stays wired; it returns to
 * this screen once the Meta business verification clears.
 */

/** Only same-origin paths may be used as a post-login destination. */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const {ready, isSignedIn, activeProfile, refresh} = useSession()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const cameBackWithError = params.get('error') === 'oauth'
  const demo = auth.authMode() === 'demo'

  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(
    cameBackWithError ? 'Google sign-in did not finish. Try again.' : null,
  )

  // Already signed in? Don't make them do it twice.
  useEffect(() => {
    if (ready && isSignedIn) router.replace(next ?? (activeProfile ? '/browse' : '/onboarding'))
  }, [ready, isSignedIn, activeProfile, router, next])

  // Coming back from Google: the callback route set the Supabase cookie, but the
  // register screens still read the mock store — mirror the user into it.
  const bridged = useRef(false)
  useEffect(() => {
    if (!ready || isSignedIn || demo || bridged.current) return
    bridged.current = true
    setGoogleBusy(true)
    auth
      .completeOAuthSignIn()
      .then((signedIn) => (signedIn ? refresh() : undefined))
      .catch(() => setGoogleError('Google sign-in did not finish. Try again.'))
      .finally(() => setGoogleBusy(false))
  }, [ready, isSignedIn, demo, refresh])

  async function continueWithGoogle() {
    setGoogleError(null)
    setGoogleBusy(true)
    try {
      const result = await auth.signInWithGoogle(next)
      if (result === 'redirecting') return // the browser is leaving for Google
      await refresh()
      if (next) {
        router.replace(next)
        return
      }
      const profiles = await api.getMyProfiles()
      router.replace(profiles.length ? '/browse' : '/onboarding')
    } catch (err) {
      setGoogleError(
        err instanceof ApiError ? err.message : 'Google sign-in did not finish. Try again.',
      )
      setGoogleBusy(false)
    }
  }

  return (
    <main className="foil relative min-h-dvh overflow-hidden">
      {/* The jaali printed over the foil, and a soft light from the top. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(40rem 24rem at 50% 0%, rgb(255 255 255 / 0.35), transparent 70%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cpath d='M28 2 L54 28 L28 54 L2 28 Z' fill='none' stroke='%23fff6d0' stroke-opacity='0.28' stroke-width='1'/%3E%3Ccircle cx='28' cy='28' r='1.6' fill='%23fff6d0' fill-opacity='0.4'/%3E%3C/svg%3E\")",
          backgroundSize: 'auto, 56px 56px',
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 pb-16 pt-6">
      <div
        className="mb-6 text-center"
        style={{animation: 'rishta-pop-in 400ms var(--ease-out-soft)'}}
      >
        {/* The head of a wedding card: Ganesha, the invocation, then the name,
            printed in deep maroon on the gold. */}
        <div className="mx-auto w-fit text-[#7a1437] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
          <GaneshMark size={88} />
        </div>
        <Invocation className="mt-1 text-[#7a1437]!" />
        <GoldRule className="mx-auto mt-4 w-48 text-[#7a1437]! [&>span]:via-[#7a1437]/60 [&>span]:to-[#7a1437]/60" />
        <div className="mx-auto mt-5 flex items-center justify-center gap-3">
          <BrandMark size="md" />
          <h1 className="display text-left text-3xl leading-none text-[#3b0d1f]">
            Rishta
            <span className="hindi block text-[#7a1437]">रिश्ता रजिस्टर</span>
          </h1>
        </div>
      </div>

      {/* A gold-glass panel on the foil, with the printed double frame.
          Translucent so the jaali shows through, the way text on a card sits
          on the paper rather than on a pasted white label. */}
      <section
        aria-labelledby="signin-title"
        className="relative rounded-2xl bg-[rgb(255_250_230_/_0.55)] p-6 shadow-[var(--shadow-e3)] ring-1 ring-[#fff0b8]/80 backdrop-blur-md"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-1.5 rounded-[6px] border border-[#b87400]/55"
        />
        <h2 id="signin-title" className="text-center text-lg font-bold leading-tight text-[#3b0d1f]">
          Sign in to the register
        </h2>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          loading={googleBusy}
          onClick={continueWithGoogle}
          icon={<GoogleMark />}
          className="mt-4 bg-[#fffdf5] text-[#2a1a12] ring-[#d9a520] hover:bg-white"
        >
          Continue with Google
        </Button>
        {googleError && (
          <p role="alert" className="mt-3 text-center text-sm font-semibold text-oxide">
            {googleError}
          </p>
        )}
        {demo && (
          <p className="mt-3 text-center text-xs text-[#5a1a33]">
            Demo: signs in as {auth.DEMO_GOOGLE_EMAIL}
          </p>
        )}
      </section>

      <p className="absolute inset-x-0 bottom-5 text-center text-xs text-[#5a1a33]">
        Run by Shiv Kumar Technologies ·{' '}
        <Link href="/about" className="font-semibold text-[#3b0d1f] underline">
          About &amp; privacy
        </Link>
      </p>
      </div>
    </main>
  )
}

/** Google's four-colour "G", inline so it needs no asset request. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

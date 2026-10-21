'use client';

/**
 * Matches — every profile on the other side, nothing hidden, with the exact
 * ones on top: first 2-way matches (both families' preferences fit), then
 * profiles that fit this family's preferences, then the rest. Preferences
 * come from Settings, or the defaults derived from the biodata. The same
 * screen holds the Saved list behind the segmented switch.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, HeartHandshake, NotebookPen, Sparkles, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { BrowseCard, ShortlistView } from '@/types';
import { STAGE_LABELS, formatHeightShort, timeAgo } from '@/lib/labels';
import { ProfileCardItem, ProfileCardSkeleton } from '@/components/profile-card';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  SectionLabel,
  Segmented,
  Skeleton,
  Stamp,
  TextArea,
} from '@/components/ui';
import { GenderAvatar } from '@/components/avatar';
import { useToast } from '@/components/providers';

type Tab = 'matched' | 'saved';

export default function MatchedPage() {
  const [tab, setTab] = useState<Tab>('matched');

  return (
    <div>
      <PageHeader title="Matches" />

      <Segmented
        label="Matches"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'matched', label: 'Matches', icon: <Sparkles size={17} aria-hidden /> },
          { key: 'saved', label: 'Saved', icon: <Bookmark size={17} aria-hidden /> },
        ]}
      />

      <div className="pt-4">{tab === 'saved' ? <SavedList /> : <MatchedList />}</div>
    </div>
  );
}

// --- Matched ----------------------------------------------------------------

function MatchedList() {
  const router = useRouter();
  const { push } = useToast();
  const [cards, setCards] = useState<BrowseCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setCards(null);
    try {
      setCards(await api.getMatchedProfiles());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your matches.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistic save — flips immediately, rolls back and explains on failure. */
  async function onToggleSave(profileId: string) {
    const before = cards;
    setSavingId(profileId);
    setCards(
      (prev) =>
        prev?.map((c) =>
          c.profile.id === profileId ? { ...c, isShortlisted: !c.isShortlisted } : c,
        ) ?? prev,
    );
    try {
      const saved = await api.toggleShortlist(profileId);
      push('success', saved ? 'Saved to your list.' : 'Removed from your saved list.');
    } catch (err) {
      setCards(before);
      push('error', err instanceof ApiError ? err.message : 'Could not save. Try once more.');
    } finally {
      setSavingId(null);
    }
  }

  if (error) return <ErrorNote message={error} onRetry={load} />;

  if (cards === null) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading matches">
        {Array.from({ length: 4 }, (_, i) => (
          <ProfileCardSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={<HeartHandshake size={26} aria-hidden />}
        title="No profiles yet"
        body="No biodata is listed on the other side right now. New biodata is added every week."
        action={
          <Button variant="primary" onClick={() => router.push('/browse')}>
            Search the register
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {cards.map((card) => (
        <ProfileCardItem
          key={card.profile.id}
          card={card}
          onToggleSave={onToggleSave}
          saving={savingId === card.profile.id}
        />
      ))}
    </ul>
  );
}

// --- Saved ------------------------------------------------------------------

/**
 * Saved profiles with a private note — the pencil margin of the register.
 * Notes are visible only to the account that wrote them.
 */
function SavedList() {
  const router = useRouter();
  const { push } = useToast();
  const [rows, setRows] = useState<ShortlistView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      setRows(await api.getShortlist());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open your saved list.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNote(profileId: string) {
    const before = rows;
    setBusyId(profileId);
    setRows(
      (prev) =>
        prev?.map((r) =>
          r.profile.id === profileId
            ? { ...r, shortlist: { ...r.shortlist, note: draftNote } }
            : r,
        ) ?? prev,
    );
    setEditing(null);
    try {
      await api.updateShortlistNote(profileId, draftNote);
      push('success', 'Note saved. Only you can read it.');
    } catch (err) {
      setRows(before);
      push('error', err instanceof ApiError ? err.message : 'Could not save the note. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(profileId: string, code: string) {
    const before = rows;
    setBusyId(profileId);
    setRows((prev) => prev?.filter((r) => r.profile.id !== profileId) ?? prev);
    try {
      await api.toggleShortlist(profileId);
      push('success', `${code} removed from your saved list.`);
    } catch (err) {
      setRows(before);
      push('error', err instanceof ApiError ? err.message : 'Could not remove. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <ErrorNote message={error} onRetry={load} />;

  if (rows === null) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading saved profiles">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="rounded-2xl bg-card p-3 ring-1 ring-rule">
            <div className="flex gap-3">
              <Skeleton className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={26} aria-hidden />}
        title="Nothing saved yet"
        body="Tap the heart on any profile to keep it here, and add a note for yourself — for example, which relative recommended it."
        action={
          <Button variant="primary" onClick={() => router.push('/browse')}>
            Look at profiles
          </Button>
        }
      />
    );
  }

  return (
    <>
      <SectionLabel en="Saved profiles" hi="आपके नोट केवल आपको दिखते हैं" className="mb-2" />
      <ul className="space-y-3">
        {rows.map(({ shortlist, profile, age, stage }) => (
          <Card as="li" key={shortlist.id} className="p-4">
            <div className="flex gap-3">
              <GenderAvatar gender={profile.gender} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${profile.publicCode}`} className="code text-lg font-bold">
                    {profile.publicCode}
                  </Link>
                  {stage !== 'browsing' ? (
                    <Stamp tone={stage === 'number_shared' ? 'seal' : 'stamp'}>
                      {STAGE_LABELS[stage].en}
                    </Stamp>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[15px] leading-6 text-ink-2">
                  {age} yrs · {formatHeightShort(profile.heightCm)} · {profile.occupation} ·{' '}
                  {profile.city}
                </p>
                <p className="text-[13px] leading-5 text-ink-3">Saved {timeAgo(shortlist.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(profile.id, profile.publicCode)}
                disabled={busyId === profile.id}
                aria-label={`Remove ${profile.publicCode} from saved`}
                className="tap grid h-11 w-11 shrink-0 place-items-center self-start rounded-full text-ink-3 transition-colors duration-150 hover:bg-oxide-wash hover:text-oxide"
              >
                <Trash2 size={20} aria-hidden />
              </button>
            </div>

            {editing === profile.id ? (
              <div className="mt-4">
                <TextArea
                  label="Your private note"
                  rows={3}
                  maxLength={200}
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  hint="Only you can read this."
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="primary"
                    loading={busyId === profile.id}
                    onClick={() => saveNote(profile.id)}
                  >
                    Save note
                  </Button>
                  <Button variant="quiet" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t border-rule pt-3">
                {shortlist.note ? (
                  <p className="text-[15px] italic text-ink">&ldquo;{shortlist.note}&rdquo;</p>
                ) : (
                  <p className="text-[15px] text-ink-3">No note yet.</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(profile.id);
                    setDraftNote(shortlist.note);
                  }}
                  className="tap mt-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-stamp underline"
                >
                  <NotebookPen size={17} aria-hidden />
                  {shortlist.note ? 'Change my note' : 'Add a private note'}
                </button>
              </div>
            )}
          </Card>
        ))}
      </ul>
    </>
  );
}

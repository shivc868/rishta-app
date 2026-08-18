'use client';

/**
 * Saved profiles with a private note — the pencil margin of the register.
 * Notes are visible only to the account that wrote them; the copy says so,
 * because that is the question a parent asks first.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, NotebookPen, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { ShortlistView } from '@/types';
import { STAGE_LABELS, formatHeightShort, timeAgo } from '@/lib/labels';
import { Button, Card, EmptyState, ErrorNote, Skeleton, Stamp, TextArea } from '@/components/ui';
import { GenderAvatar } from '@/components/avatar';
import { useToast } from '@/components/providers';

export default function ShortlistPage() {
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

  return (
    <div>
      <h1 className="text-xl font-bold leading-tight">
        Saved profiles
        <span className="hindi block font-normal text-ink-3">सहेजी हुई प्रोफ़ाइल</span>
      </h1>
      <p className="mt-1 text-[15px] text-ink-2">
        Your notes here are private. The other family never sees them.
      </p>

      <div className="mt-4">
        {error ? (
          <ErrorNote message={error} onRetry={load} />
        ) : rows === null ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading saved profiles">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="border border-rule bg-card p-3">
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={26} aria-hidden />}
            title="Nothing saved yet"
            hindi="अभी कुछ सहेजा नहीं"
            body="Tap the bookmark on any profile to keep it here, and add a note for yourself — for example, which relative recommended it."
            action={
              <Button variant="primary" onClick={() => router.push('/browse')}>
                Look at profiles
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map(({ shortlist, profile, age, stage }) => (
              <Card as="li" key={shortlist.id} className="p-3">
                <div className="flex gap-3">
                  <GenderAvatar gender={profile.gender} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${profile.publicCode}`} className="code text-lg font-bold">
                        {profile.publicCode}
                      </Link>
                      {stage !== 'browsing' ? (
                        <Stamp tone={stage === 'connected' ? 'seal' : 'stamp'}>
                          {STAGE_LABELS[stage].en}
                        </Stamp>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">
                      {age} yrs · {formatHeightShort(profile.heightCm)} · {profile.occupation} ·{' '}
                      {profile.city}
                    </p>
                    <p className="text-sm text-ink-3">Saved {timeAgo(shortlist.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(profile.id, profile.publicCode)}
                    disabled={busyId === profile.id}
                    aria-label={`Remove ${profile.publicCode} from saved`}
                    className="tap grid h-11 w-11 shrink-0 place-items-center self-start rounded-lg border-2 border-transparent text-ink-3 hover:border-oxide/40 hover:bg-oxide-wash hover:text-oxide"
                  >
                    <Trash2 size={20} aria-hidden />
                  </button>
                </div>

                {editing === profile.id ? (
                  <div className="mt-3">
                    <TextArea
                      label="Your private note"
                      hindi="आपकी निजी टिप्पणी"
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
                  <div className="mt-3 border-t border-dotted border-rule pt-2">
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
        )}
      </div>
    </div>
  );
}

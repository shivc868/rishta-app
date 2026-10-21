import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  FileText,
  Flag,
  Lock,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ActionForm } from '@/components/admin/bits';
import { inputClass } from '@/components/admin/styles';
import {
  Avatar,
  KV,
  KVGrid,
  Panel,
  Pill,
  PROFILE_STATUS_META,
  ReportBadge,
  StatusBadge,
} from '@/components/admin/ui';
import { cx } from '@/lib/cx';
import { requireAdmin } from '@/lib/admin/session';
import { adminNameMap, getProfileForReview } from '@/lib/admin/queries';
import { ageFromDob } from '@/lib/api';
import {
  CATEGORY_LABELS,
  COMPLEXION_LABELS,
  DIET_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  formatHeight,
  formatWeightBand,
  timeAgo,
} from '@/lib/labels';
import type { ProfileStatus } from '@/types';
import {
  deleteProfileAction,
  resolveReportAction,
  setProfileStatusAction,
  setProfileVerifiedAction,
} from '@/app/admin/actions';

const DATE_FMT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDate = (iso: string) => DATE_FMT.format(new Date(iso));

const STATUS_ORDER: ProfileStatus[] = ['pending_review', 'active', 'paused', 'matched'];

export default async function ProfileReviewPage({ params }: PageProps<'/admin/profiles/[id]'>) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [data, names] = await Promise.all([getProfileForReview(id), adminNameMap()]);
  if (!data) notFound();
  const { profile: p, priv, reports } = data;
  const openReports = reports.filter((r) => r.status === 'open').length;
  const who = p.gender === 'male' ? 'Groom' : 'Bride';

  return (
    <div className="space-y-5">
      <Link
        href="/admin/profiles"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden /> Back to profiles
      </Link>

      {/* Identity header */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-rule shadow-[var(--shadow-e1)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar seed={p.public_code} label={priv?.full_name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="code text-[22px] font-bold leading-none tracking-tight text-ink">{p.public_code}</h1>
                <StatusBadge status={p.status} />
                {p.is_verified ? (
                  <Pill tone="seal" dot={false}>
                    <BadgeCheck size={13} aria-hidden /> Verified
                  </Pill>
                ) : (
                  <Pill tone="ink" dot={false}>
                    Unverified
                  </Pill>
                )}
                {openReports > 0 && (
                  <Pill tone="gold" dot={false}>
                    <Flag size={12} aria-hidden /> {openReports} open report{openReports === 1 ? '' : 's'}
                  </Pill>
                )}
              </div>
              {priv?.full_name && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                  <Lock size={13} className="text-ink-3" aria-hidden />
                  {priv.full_name}
                  <span className="text-[12px] font-medium text-ink-3">admins only</span>
                </p>
              )}
              <p className="mt-1 text-[13.5px] text-ink-2">
                {who}, {ageFromDob(p.dob)} · {RELIGION_LABELS[p.religion].en}, {p.community}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-2">
                <MapPin size={13} className="text-ink-3" aria-hidden />
                {p.village ? `${p.village}, ` : ''}
                {p.city}, {p.district}, {p.state}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] sm:text-right">
            <Meta label="Created" value={`${fmtDate(p.created_at)} · ${timeAgo(p.created_at)}`} />
            <Meta label="Last active" value={timeAgo(p.last_active_at)} />
            <Meta label="Created for" value={p.created_for} />
            <Meta label="Profile id" value={<span className="code">{p.id.slice(0, 8)}</span>} />
          </dl>
        </div>

        {p.status === 'pending_review' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-oxide-wash px-3.5 py-2.5 text-[13px] text-ink ring-1 ring-oxide/20">
            <AlertTriangle size={15} className="text-oxide" aria-hidden />
            <span className="font-medium">This profile is hidden from families.</span>
            <span className="text-ink-2">An admin sent it back for review. Make it active again from the panel on the right.</span>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* --- Left column ------------------------------------------------- */}
        <div className="space-y-5">
          <Panel title="Public biodata" description="What other families see on the card" icon={User}>
            <KVGrid cols={3}>
              <KV label="For" value={`${who}, created for ${p.created_for}`} />
              <KV label="Age / date of birth" value={`${ageFromDob(p.dob)} years · ${fmtDate(p.dob)}`} />
              <KV label="Height / weight" value={`${formatHeight(p.height_cm)} · ${formatWeightBand(p.weight_band)}`} />
              <KV label="Complexion" value={COMPLEXION_LABELS[p.complexion].en} />
              <KV label="Religion / jati" value={`${RELIGION_LABELS[p.religion].en}, ${p.community}`} />
              <KV label="Category" value={CATEGORY_LABELS[p.category].en} />
              <KV label="Marital status" value={MARITAL_LABELS[p.marital_status].en} />
              <KV label="Education" value={`${p.education} · ${EDUCATION_LEVEL_LABELS[p.education_level].en}`} />
              <KV label="Work" value={`${p.occupation} · ${OCCUPATION_LABELS[p.occupation_category].en}`} />
              <KV label="Income" value={INCOME_LABELS[p.income_band].en} />
              <KV label="Diet" value={DIET_LABELS[p.diet].en} />
              <KV label="Manglik" value={MANGLIK_LABELS[p.manglik].en} />
              <KV label="Place" value={`${p.city}, ${p.district}, ${p.state}${p.village ? ` · ${p.village}` : ''}`} />
            </KVGrid>
            <div className="mt-3 grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
              <div>
                <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">About</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{p.about || <span className="text-ink-3">—</span>}</p>
              </div>
              <div>
                <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">Family</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{p.family_brief || <span className="text-ink-3">—</span>}</p>
              </div>
            </div>
          </Panel>

          <Panel
            tone="manila"
            title="Private details"
            description="Admins only — use these to verify the family over the phone"
            icon={Lock}
          >
            {priv ? (
              <>
                <KVGrid cols={2}>
                  <KV label="Full name" value={priv.full_name} />
                  <KV label="Phone" value={priv.phone} mono />
                  <KV label="Exact address" value={priv.exact_address} />
                  <KV label="Family details" value={priv.family_details} />
                </KVGrid>
                <div className="mt-3 border-t border-manila-deep pt-3">
                  <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                    Photos ({priv.photo_urls.length})
                  </h3>
                  {priv.photo_urls.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {priv.photo_urls.map((u, i) => (
                        <a
                          key={u}
                          href={u.startsWith('grad:') ? undefined : u}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-24 w-20 overflow-hidden rounded-lg bg-paper-deep ring-1 ring-manila-deep"
                          title={u.startsWith('grad:') ? 'Placeholder (demo data)' : `Photo ${i + 1}`}
                        >
                          {u.startsWith('grad:') ? (
                            <span
                              className="block h-full w-full"
                              style={{ background: gradientOf(u) }}
                              aria-label="Placeholder photo"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u} alt="" className="h-full w-full object-cover" />
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[13px] text-ink-2">No photos uploaded.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[13.5px] text-ink-2">No private row yet.</p>
            )}
          </Panel>

          <Panel
            title={`Reports (${reports.length})`}
            description={openReports ? `${openReports} still open` : 'Nothing open against this profile'}
            icon={Flag}
            padded={false}
          >
            {reports.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-2">No family has reported this profile.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {reports.map((r) => (
                  <li key={r.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
                      <ReportBadge status={r.status} />
                      <span>
                        by <span className="code font-semibold text-ink">{r.reporter?.public_code ?? 'unknown'}</span>
                      </span>
                      <span aria-hidden>·</span>
                      <span>{timeAgo(r.created_at)}</span>
                      {r.status !== 'open' && r.resolved_by && (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            {r.status} by {names.get(r.resolved_by) ?? 'an admin'}
                            {r.resolved_at ? ` ${timeAgo(r.resolved_at)}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13.5px] text-ink">{r.reason}</p>
                    {r.resolution_note && <p className="mt-1 text-[12.5px] italic text-ink-2">Note: {r.resolution_note}</p>}
                    {r.status === 'open' && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <ActionForm action={resolveReportAction} fields={{ id: r.id, status: 'resolved' }} submitLabel="Resolve" size="sm" inline />
                        <ActionForm action={resolveReportAction} fields={{ id: r.id, status: 'dismissed' }} submitLabel="Dismiss" size="sm" variant="quiet" inline />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* --- Right rail --------------------------------------------------- */}
        <aside className="space-y-4">
          <Panel title="Moderation" icon={ShieldCheck}>
            <ol className="space-y-1">
              {STATUS_ORDER.map((s) => {
                const m = PROFILE_STATUS_META[s];
                const on = s === p.status;
                return (
                  <li
                    key={s}
                    className={cx(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px]',
                      on ? 'bg-paper-deep font-semibold text-ink' : 'text-ink-2',
                    )}
                  >
                    <span className={cx('grid h-4 w-4 place-items-center rounded-full', on ? m.bar : 'ring-1 ring-inset ring-rule-strong')}>
                      {on && <Check size={10} className="text-white" strokeWidth={3} aria-hidden />}
                    </span>
                    {m.label}
                    {on && <span className="ml-auto text-[11px] font-medium uppercase tracking-wider text-ink-3">current</span>}
                  </li>
                );
              })}
            </ol>

            {p.reviewed_at && (
              <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink-2">
                Last reviewed by <span className="font-semibold text-ink">{names.get(p.reviewed_by ?? '') ?? 'an admin'}</span>{' '}
                {timeAgo(p.reviewed_at)}.
                {p.review_note && <span className="mt-0.5 block italic">“{p.review_note}”</span>}
              </p>
            )}

            <div className="mt-4 space-y-2.5 border-t border-rule pt-4">
              {p.status !== 'active' && (
                <ActionForm
                  action={setProfileStatusAction}
                  fields={{ id: p.id, status: 'active' }}
                  submitLabel="Make active (visible to families)"
                  variant="primary"
                  fullWidth
                />
              )}
              {p.status !== 'paused' && (
                <ActionForm action={setProfileStatusAction} fields={{ id: p.id, status: 'paused' }} submitLabel="Pause (hide from browse)" fullWidth>
                  <input name="note" placeholder="Reason — visible to admins only" className={inputClass} />
                </ActionForm>
              )}
              {p.status !== 'matched' && (
                <ActionForm action={setProfileStatusAction} fields={{ id: p.id, status: 'matched' }} submitLabel="Mark as matched" fullWidth />
              )}
              {p.status !== 'pending_review' && (
                <ActionForm action={setProfileStatusAction} fields={{ id: p.id, status: 'pending_review' }} submitLabel="Hide for review" variant="quiet" fullWidth />
              )}
            </div>
          </Panel>

          <Panel title="Verified badge" description="Optional — families are never blocked on it" icon={BadgeCheck}>
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              Add the badge once you have spoken to the family and matched the name to the phone number above. It only
              adds trust on the card; the profile is live either way.
            </p>
            <div className="mt-3">
              <ActionForm
                action={setProfileVerifiedAction}
                fields={{ id: p.id, verified: p.is_verified ? 'false' : 'true' }}
                submitLabel={p.is_verified ? 'Remove verified badge' : 'Mark as verified'}
                variant={p.is_verified ? 'secondary' : 'primary'}
                fullWidth
              />
            </div>
          </Panel>

          <Panel title="Activity" icon={Activity}>
            <ol className="relative space-y-3 border-l border-rule pl-4 text-[12.5px]">
              <Event label="Last active" when={p.last_active_at} />
              {p.reviewed_at && <Event label={`Reviewed by ${names.get(p.reviewed_by ?? '') ?? 'an admin'}`} when={p.reviewed_at} />}
              <Event label="Profile created" when={p.created_at} />
            </ol>
          </Panel>

          {admin.role === 'superadmin' && (
            <Panel tone="danger" title="Danger zone" icon={AlertTriangle}>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                Deletes the profile, its private row, requests and grants. This cannot be undone.
              </p>
              <div className="mt-3">
                <ActionForm action={deleteProfileAction} fields={{ id: p.id }} submitLabel="Delete profile" variant="danger" fullWidth>
                  <input name="confirm" placeholder="Type DELETE to confirm" className={inputClass} autoComplete="off" />
                </ActionForm>
              </div>
            </Panel>
          )}

          <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-ink-3">
            <FileText size={12} aria-hidden /> Every action here is written to the audit log.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-3 sm:col-start-1">{label}</dt>
      <dd className="font-medium text-ink sm:col-start-2">{value}</dd>
    </>
  );
}

function Event({ label, when }: { label: string; when: string }) {
  return (
    <li className="relative">
      <span aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-card ring-2 ring-rule-strong" />
      <span className="block font-medium text-ink">{label}</span>
      <span className="block text-ink-3">
        {fmtDate(when)} · {timeAgo(when)}
      </span>
    </li>
  );
}

/** Demo rows carry "grad:h1:h2" placeholders instead of real photo URLs. */
function gradientOf(token: string): string {
  const [, a = '210', b = '260'] = token.split(':');
  return `linear-gradient(135deg, hsl(${a} 45% 62%), hsl(${b} 38% 40%))`;
}

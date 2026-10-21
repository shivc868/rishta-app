'use client';

/**
 * My profile — the family's own biodata, read-only, laid out the way a
 * printed biodata sheet is: a centred identity block, then the facts in
 * four titled groups. Editing lives in Settings; nothing here changes data.
 */

import { Briefcase, Home, MapPin, UserRound, Users } from 'lucide-react';
import * as api from '@/lib/api';
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
  STATUS_LABELS,
  formatHeightShort,
  formatWeightBand,
} from '@/lib/labels';
import { Card, Stamp } from '@/components/ui';
import { SkinToneDot } from '@/components/skin-tone';
import { GenderAvatar } from '@/components/avatar';
import { useSession } from '@/components/providers';

type Icon = typeof Users;

export default function MyProfilePage() {
  const { activeProfile: profile } = useSession();
  if (!profile) return null;
  const age = api.ageFromDob(profile.dob);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Identity, centred like the head of a biodata sheet. */}
      <Card className="px-4 pb-5 pt-6 text-center">
        <div className="mx-auto w-fit">
          <GenderAvatar gender={profile.gender} size="lg" />
        </div>
        <h1 className="code mt-3 text-[26px] leading-8">{profile.publicCode}</h1>
        <p className="mt-1 text-[17px] font-semibold leading-6 text-ink">
          {age} yrs · {formatHeightShort(profile.heightCm)}
        </p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[15px] leading-6 text-ink-2">
          <MapPin size={14} className="shrink-0 text-ink-3" aria-hidden />
          {profile.city}, {profile.district}, {profile.state}
        </p>
        <div className="mt-3">
          <Stamp tone={profile.status === 'active' ? 'seal' : 'ink'}>
            {STATUS_LABELS[profile.status].en}
          </Stamp>
        </div>
      </Card>

      <Group icon={UserRound} title="About">
        <Fact label="Age" value={`${age} years`} />
        <Fact label="Height" value={formatHeightShort(profile.heightCm)} />
        <Fact label="Weight" value={formatWeightBand(profile.weightBand)} />
        <Fact
          label="Skin tone"
          value={
            <span className="inline-flex items-center gap-2">
              <SkinToneDot tone={profile.complexion} />
              {COMPLEXION_LABELS[profile.complexion].en}
            </span>
          }
        />
        <Fact label="Marital status" value={MARITAL_LABELS[profile.maritalStatus].en} />
        <Fact label="Manglik" value={MANGLIK_LABELS[profile.manglik].en} />
        <Fact label="Food" value={DIET_LABELS[profile.diet].en} />
      </Group>

      <Group icon={Briefcase} title="Education & work">
        <Fact
          label="Education"
          value={profile.education}
          sub={profile.educationLevel !== 'other' ? EDUCATION_LEVEL_LABELS[profile.educationLevel].en : undefined}
        />
        <Fact
          label="Work"
          value={profile.occupation}
          sub={
            profile.occupation !== OCCUPATION_LABELS[profile.occupationCategory].en
              ? OCCUPATION_LABELS[profile.occupationCategory].en
              : undefined
          }
        />
        <Fact label="Monthly income" value={INCOME_LABELS[profile.incomeBand].en} />
      </Group>

      <Group icon={Users} title="Religion & community">
        <Fact label="Religion" value={RELIGION_LABELS[profile.religion].en} />
        <Fact label="Jati" value={profile.community} />
        <Fact label="Category" value={CATEGORY_LABELS[profile.category].en} />
      </Group>

      <Group icon={Home} title="Place">
        {profile.village ? <Fact label="Village / mohalla" value={profile.village} /> : null}
        <Fact label="Tehsil" value={profile.city} />
        <Fact label="District" value={profile.district} />
        <Fact label="State" value={profile.state} />
      </Group>

      {profile.about ? (
        <Card className="p-4">
          <GroupTitle icon={UserRound} title="In their words" />
          <p className="mt-2 text-[15px] leading-6 text-ink-2">{profile.about}</p>
        </Card>
      ) : null}
      {profile.familyBrief ? (
        <Card className="p-4">
          <GroupTitle icon={Home} title="Family" />
          <p className="mt-2 text-[15px] leading-6 text-ink-2">{profile.familyBrief}</p>
        </Card>
      ) : null}
    </div>
  );
}

function GroupTitle({ icon: IconC, title }: { icon: Icon; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-bold leading-6 text-ink">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-stamp-wash text-stamp" aria-hidden>
        <IconC size={15} />
      </span>
      {title}
    </h2>
  );
}

/** A titled group of facts; two columns from tablet up. */
function Group({ icon, title, children }: { icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-4">
      <GroupTitle icon={icon} title={title} />
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6">{children}</dl>
    </Card>
  );
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex min-h-11 items-baseline justify-between gap-4 border-b border-rule py-2.5 last:border-b-0 sm:nth-last-2:border-b-0">
      <dt className="shrink-0 text-[13px] font-medium leading-5 text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[15px] font-semibold leading-5 text-ink">
        {value}
        {sub ? <span className="block text-[13px] font-normal text-ink-3">{sub}</span> : null}
      </dd>
    </div>
  );
}

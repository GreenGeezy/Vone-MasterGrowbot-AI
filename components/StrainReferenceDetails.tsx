import React from 'react';

type ReferenceProfile = {
  description?: string;
  breeder?: string;
  classification?: string;
  lineage?: string;
  thc_level?: string;
  cbd_level?: string;
  most_common_terpene?: string;
};

const available = (value?: string) => Boolean(value?.trim() && !/^(not established|unknown|n\/a|undefined|null)$/i.test(value.trim()));

/** Only render reference fields that actually carry information. */
export default function StrainReferenceDetails({ profile }: { profile: ReferenceProfile }) {
  const facts = [
    ['Breeder', profile.breeder],
    ['Classification', profile.classification],
    ['Lineage', profile.lineage],
    ['Reported THC', profile.thc_level],
    ['Reported CBD', profile.cbd_level],
    ['Reported terpene', profile.most_common_terpene],
  ].filter(([, value]) => available(value));
  const hasComposition = [profile.thc_level, profile.cbd_level, profile.most_common_terpene].some(available);
  return <section aria-label="Strain reference details" className="space-y-3 text-sm">
    {available(profile.description) && <p className="leading-relaxed whitespace-pre-wrap break-words">{profile.description}</p>}
    {facts.length > 0 && <dl className="grid grid-cols-2 gap-3">{facts.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-bold text-gray-500">{label}</dt><dd className="font-semibold break-words">{value}</dd></div>)}</dl>}
    {!hasComposition && <p className="text-xs text-gray-500">Cannabinoid and terpene values vary; verified data is unavailable for this profile.</p>}
    {hasComposition && <p className="text-xs text-gray-500">Reported composition varies by sample and has not been independently verified for your plant.</p>}
  </section>;
}

import { Strain } from '../types';

export const STRAIN_VALUE_FALLBACK = 'Not established';

export const formatStrainValue = (value?: string): string => {
  const normalized = value?.trim();
  if (!normalized || /^(unknown|n\/a|undefined|null)$/i.test(normalized)) {
    return STRAIN_VALUE_FALLBACK;
  }
  return normalized;
};

export const matchesStrainSearch = (strain: Strain, query: string): boolean => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const thc = formatStrainValue(strain.thc_level);
  const cbd = formatStrainValue(strain.cbd_level);
  const searchableText = [
    strain.name,
    strain.type,
    strain.most_common_terpene,
    strain.description,
    thc,
    cbd,
    `${thc} thc`,
    `thc ${thc}`,
    `${cbd} cbd`,
    `cbd ${cbd}`,
  ].join(' ').toLocaleLowerCase();

  return searchableText.includes(normalizedQuery);
};

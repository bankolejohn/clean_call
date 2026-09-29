import type { WasteType } from '@/lib/constants/waste-types';

const KEYWORDS: Record<WasteType, readonly string[]> = {
  HOUSEHOLD:    ['household', 'domestic', 'residential', 'general', 'municipal', 'organic', 'food'],
  COMMERCIAL:   ['commercial', 'business', 'office', 'market', 'general'],
  RECYCLABLE:   ['recycl', 'plastic', 'paper', 'cardboard', 'glass', 'metal', 'can', 'bottle'],
  CONSTRUCTION: ['construction', 'demolition', 'rubble', 'debris', 'concrete', 'building'],
  MEDICAL:      ['medical', 'clinical', 'biohazard', 'hazardous', 'sharps', 'hospital'],
} as const;

/**
 * True iff any of the collector's free-text waste_types is compatible with the
 * requested canonical Waste_Type. Case-insensitive substring/keyword match; also
 * matches when the free-text value equals the canonical enum name directly.
 * Requirement 3.4, 3.5, 10.1.
 */
export function isCollectorWasteTypeCompatible(
  collectorWasteTypes: string[],
  canonical: WasteType
): boolean {
  const keywords = KEYWORDS[canonical];
  const canonicalLower = canonical.toLowerCase();
  return collectorWasteTypes.some((raw) => {
    const v = raw.trim().toLowerCase();
    if (v === canonicalLower) return true;
    return keywords.some((kw) => v.includes(kw));
  });
}

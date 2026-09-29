import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isCollectorWasteTypeCompatible } from '@/lib/utils/waste-type-match';
import { WASTE_TYPES, type WasteType } from '@/lib/constants/waste-types';

/**
 * Property-Based Tests for the waste-type compatibility layer.
 * Feature: cleancall-phase-3-collection-requests
 */

const NUM_RUNS = 100;

// The documented case-insensitive keyword/substring mapping table from the design.
const KEYWORDS: Record<WasteType, readonly string[]> = {
  HOUSEHOLD: ['household', 'domestic', 'residential', 'general', 'municipal', 'organic', 'food'],
  COMMERCIAL: ['commercial', 'business', 'office', 'market', 'general'],
  RECYCLABLE: ['recycl', 'plastic', 'paper', 'cardboard', 'glass', 'metal', 'can', 'bottle'],
  CONSTRUCTION: ['construction', 'demolition', 'rubble', 'debris', 'concrete', 'building'],
  MEDICAL: ['medical', 'clinical', 'biohazard', 'hazardous', 'sharps', 'hospital'],
};

const canonicalArb = fc.constantFrom<WasteType>(...WASTE_TYPES);

/** Randomise the letter case of a string (per character). */
function randomCaseArb(s: string) {
  return fc
    .array(fc.boolean(), { minLength: s.length, maxLength: s.length })
    .map((flags) =>
      s
        .split('')
        .map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase()))
        .join('')
    );
}

/**
 * Returns true if `text` (lowercased) contains any keyword for `canonical`
 * or names the canonical enum directly — mirrors the matcher's own rule.
 */
function textMatchesCanonical(text: string, canonical: WasteType): boolean {
  const v = text.trim().toLowerCase();
  if (v === canonical.toLowerCase()) return true;
  return KEYWORDS[canonical].some((kw) => v.includes(kw));
}

/** All keyword fragments across every canonical, used to build keyword-free tokens. */
const ALL_KEYWORDS = Object.values(KEYWORDS).flat();
const ALL_CANONICAL_LOWER = WASTE_TYPES.map((w) => w.toLowerCase());

// A safe alphabet for building tokens that cannot form any documented keyword.
// The chars q, x, z, w, k, j, v never begin any keyword; combined with digits
// they still might coincidentally form a keyword, so we always filter below.
const safeTokenArb = fc.stringMatching(/^[qxzwkjv0-9]{1,12}$/);

/** True iff `s` contains no documented keyword and does not name any canonical. */
function isKeywordFree(s: string): boolean {
  const v = s.trim().toLowerCase();
  if (ALL_CANONICAL_LOWER.includes(v)) return false;
  return !ALL_KEYWORDS.some((kw) => v.includes(kw));
}

// =============================================================================
// Property 4: Waste-type compatibility is sound
// =============================================================================

// Feature: cleancall-phase-3-collection-requests, Property 4: Waste-type compatibility is sound
describe('Feature: cleancall-phase-3-collection-requests, Property 4: Waste-type compatibility is sound', () => {
  /**
   * Validates: Requirements 3.4, 3.5, 10.1
   *
   * (a) exact canonical string in random case → compatible
   * (b) a documented keyword embedded as a substring in random text/case → compatible
   * (c) entries that contain none of C's keywords and don't name C → NOT compatible
   */

  it('(a) a list containing the exact canonical string (any case) is compatible', () => {
    fc.assert(
      fc.property(
        canonicalArb.chain((c) =>
          fc.record({
            canonical: fc.constant(c),
            cased: randomCaseArb(c),
            // arbitrary extra noise entries alongside the canonical
            others: fc.array(fc.string(), { maxLength: 3 }),
          })
        ),
        ({ canonical, cased, others }) => {
          const list = [...others, cased];
          expect(isCollectorWasteTypeCompatible(list, canonical)).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('(b) a list containing a documented keyword (as substring, any case) is compatible', () => {
    fc.assert(
      fc.property(
        canonicalArb.chain((c) =>
          fc
            .constantFrom(...KEYWORDS[c])
            .chain((kw) =>
              fc.record({
                canonical: fc.constant(c),
                prefix: fc.string({ maxLength: 6 }),
                keyword: randomCaseArb(kw),
                suffix: fc.string({ maxLength: 6 }),
              })
            )
        ),
        ({ canonical, prefix, keyword, suffix }) => {
          const entry = `${prefix}${keyword}${suffix}`;
          expect(isCollectorWasteTypeCompatible([entry], canonical)).toBe(true);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('(c) a list whose entries name none of C keywords and do not name C is NOT compatible', () => {
    fc.assert(
      fc.property(
        fc.record({
          canonical: canonicalArb,
          // build keyword-free tokens, then filter out any accidental keyword hit
          entries: fc.array(safeTokenArb, { maxLength: 5 }),
        }),
        ({ canonical, entries }) => {
          const clean = entries.filter(isKeywordFree);
          // Precondition: nothing in the (possibly empty) list matches this canonical.
          fc.pre(clean.every((e) => !textMatchesCanonical(e, canonical)));
          expect(isCollectorWasteTypeCompatible(clean, canonical)).toBe(false);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

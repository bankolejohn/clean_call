import { describe, it, expect } from 'vitest';
import { isCollectorWasteTypeCompatible } from '@/lib/utils/waste-type-match';

/**
 * Unit tests for the waste-type compatibility layer.
 * Feature: cleancall-phase-3-collection-requests
 */

describe('isCollectorWasteTypeCompatible', () => {
  it("'General Waste' is compatible with BOTH HOUSEHOLD and COMMERCIAL", () => {
    expect(isCollectorWasteTypeCompatible(['General Waste'], 'HOUSEHOLD')).toBe(true);
    expect(isCollectorWasteTypeCompatible(['General Waste'], 'COMMERCIAL')).toBe(true);
  });

  it("'Recyclables' is compatible with RECYCLABLE", () => {
    expect(isCollectorWasteTypeCompatible(['Recyclables'], 'RECYCLABLE')).toBe(true);
  });

  it("'Medical/Clinical' is compatible with MEDICAL", () => {
    expect(isCollectorWasteTypeCompatible(['Medical/Clinical'], 'MEDICAL')).toBe(true);
  });

  it('a clearly-incompatible example is not compatible', () => {
    expect(isCollectorWasteTypeCompatible(['Recyclables'], 'MEDICAL')).toBe(false);
  });
});

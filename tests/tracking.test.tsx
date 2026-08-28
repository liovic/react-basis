// tests/tracking.test.tsx

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useState, useEffect, __test__ } from '../src/hooks';
import { BasisProvider } from '../src/context';
import * as UI from '../src/core/logger';

describe('Manual Effect Tracking (v0.6.x)', () => {

  beforeEach(() => {
    // Critical: Reset engine state to prevent pollution from previous tests
    __test__.history.clear();
    __test__.endEffectTracking();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers CAUSAL HINT when setState is called inside tracked effect', () => {
    // Mock logger to avoid console noise
    const spy = vi.spyOn(UI, 'displayCausalHint').mockImplementation(() => { });

    // Debug mode must be on for tracking to work
    const wrapper = ({ children }: any) => <BasisProvider debug={true}>{children}</BasisProvider>;

    renderHook(() => {
      const [, setB] = useState(0, 'target');

      // The basis useEffect wrapper calls beginEffectTracking('source_effect')
      useEffect(() => {
        setB(1);
      }, [], 'source_effect');
    }, { wrapper });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('target'),
      expect.objectContaining({ role: 'local' }),
      expect.stringContaining('source_effect'),
      expect.anything() // Source meta (likely NULL_SIGNAL if not explicitly registered)
    );
  });
});
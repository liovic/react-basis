// tests/integration.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, BasisProvider } from '../src';

describe('Basis System Integration', () => {
  beforeEach(() => { vi.useFakeTimers(); });

  it('identifies redundancy between synced states', async () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const wrapper = ({ children }: any) => <BasisProvider>{children}</BasisProvider>;

    const { result } = renderHook(() => {
      const [a, setA] = useState(0, 'varA');
      const [b, setB] = useState(0, 'varB');
      return { setA, setB };
    }, { wrapper });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        result.current.setA(i + 1);
        result.current.setB(i + 1);
        vi.advanceTimersByTime(30); 
      });
    }

    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('REDUNDANCY DETECTED'), expect.any(String));
    groupSpy.mockRestore();
  });
});
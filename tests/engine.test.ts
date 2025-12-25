// tests/engine.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __testEngine__ } from '../src/engine';

const { registerVariable, recordUpdate, history, currentTickBatch, printBasisHealthReport } = __testEngine__;

describe('State Engine', () => {
  beforeEach(() => {
    history.clear();
    currentTickBatch.clear();
    vi.useFakeTimers();
  });

  it('registers a variable with default vector', () => {
    registerVariable('testVar');
    expect(history.has('testVar')).toBe(true);
  });

  it('batches updates and shifts vectors', () => {
    registerVariable('a');
    recordUpdate('a');
    vi.runAllTimers();
    expect(history.get('a')![49]).toBe(1);
  });

  it('prevents infinite loops', () => {
    registerVariable('loop');
    for (let i = 0; i < 26; i++) recordUpdate('loop');
    expect(recordUpdate('loop')).toBe(false);
  });

  it('triggers health report', () => {
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    registerVariable('v1');
    printBasisHealthReport();
    expect(tableSpy).toHaveBeenCalled();
    tableSpy.mockRestore();
  });
});
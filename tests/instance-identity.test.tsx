// tests/instance-identity.test.tsx

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState, __test__ } from '../src/hooks';
import { instance } from '../src/engine';
import { BasisProvider } from '../src/context';

const findKeys = (prefix: string): string[] =>
  Array.from(__test__.history.keys()).filter(k => k.startsWith(prefix));

describe('Instance Identity', () => {
  beforeEach(() => {
    __test__.history.clear();
    __test__.endEffectTracking();
    instance.redundantLabels.clear();
    instance.graph.clear();
    instance.violationMap.clear();
  });

  it('gives two mounted instances of the same component distinct history entries', () => {
    const Row: React.FC<{ id: number }> = ({ id }) => {
      const [isOpen] = useState(false, 'Row.tsx -> isOpen');
      return <div data-testid={`row-${id}`}>{String(isOpen)}</div>;
    };

    render(
      <BasisProvider debug>
        <Row id={1} />
        <Row id={2} />
      </BasisProvider>
    );

    const keys = findKeys('Row.tsx -> isOpen');
    expect(keys.length).toBe(2);
    expect(new Set(keys).size).toBe(2);
  });

  it('unmounting one instance does not wipe tracking for a sibling still mounted', () => {
    const Row: React.FC<{ id: number }> = ({ id }) => {
      const [isOpen] = useState(false, 'Row.tsx -> isOpen');
      return <div data-testid={`row-${id}`}>{String(isOpen)}</div>;
    };

    const Parent: React.FC<{ showSecond: boolean }> = ({ showSecond }) => (
      <BasisProvider debug>
        <Row id={1} />
        {showSecond && <Row id={2} />}
      </BasisProvider>
    );

    const { rerender } = render(<Parent showSecond={true} />);
    expect(findKeys('Row.tsx -> isOpen').length).toBe(2);

    rerender(<Parent showSecond={false} />);

    expect(findKeys('Row.tsx -> isOpen').length).toBe(1);
  });

  it('does not flag two instances of the same field as duplicate state', async () => {
    const Row: React.FC<{ id: number }> = ({ id }) => {
      const [isOpen, setIsOpen] = useState(false, 'CoincidenceRow.tsx -> isOpen');
      return (
        <button data-testid={`toggle-${id}`} onClick={() => setIsOpen(v => !v)}>
          {String(isOpen)}
        </button>
      );
    };

    const { getByTestId } = render(
      <BasisProvider debug showHUD={false}>
        <Row id={1} />
        <Row id={2} />
      </BasisProvider>
    );

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        getByTestId('toggle-1').click();
        getByTestId('toggle-2').click();
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
    }

    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    const keys = findKeys('CoincidenceRow.tsx -> isOpen');
    expect(keys.length).toBe(2);

    expect(instance.redundantLabels.has(keys[0])).toBe(false);
    expect(instance.redundantLabels.has(keys[1])).toBe(false);
  });

  it('does NOT collide two different call sites that happen to share an auto-generated label', () => {
    const useFoo = () => useState(0, 'Shared.tsx -> value');
    const useBar = () => useState(0, 'Shared.tsx -> value');

    const Widget: React.FC = () => {
      const [a] = useFoo();
      const [b] = useBar();
      return <div>{a}{b}</div>;
    };

    render(
      <BasisProvider debug>
        <Widget />
      </BasisProvider>
    );

    const keys = findKeys('Shared.tsx -> value');
    expect(keys.length).toBe(2);
  });

  it('keeps history correctly attributed to each item after removing one from the middle of a keyed list', () => {
    const Row: React.FC<{ id: number }> = ({ id }) => {
      const [isOpen] = useState(false, 'KeyedRow.tsx -> isOpen');
      return <div data-testid={`row-${id}`}>{String(isOpen)}</div>;
    };

    const List: React.FC<{ items: number[] }> = ({ items }) => (
      <BasisProvider debug>
        {items.map(id => <Row key={id} id={id} />)}
      </BasisProvider>
    );

    const { rerender } = render(<List items={[1, 2, 3]} />);
    const keysBefore = findKeys('KeyedRow.tsx -> isOpen');
    expect(keysBefore.length).toBe(3);

    rerender(<List items={[1, 3]} />);

    const keysAfter = findKeys('KeyedRow.tsx -> isOpen');
    expect(keysAfter.length).toBe(2);
    keysAfter.forEach(k => expect(keysBefore).toContain(k));
  });
});
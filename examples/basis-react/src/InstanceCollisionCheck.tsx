import { useState as useReactState } from 'react';
import { BasisProvider, useState } from 'react-state-basis';

function Row({ id }: { id: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <button data-testid={`row-${id}`} onClick={() => setIsOpen(v => !v)}>
      Row {id}: {String(isOpen)}
    </button>
  );
}

function Inner() {
  const [ids, setIds] = useReactState<number[]>(() =>
    Array.from({ length: 10 }, (_, i) => i + 1)
  );

  return (
    <div>
      <div data-testid="ready">READY rows={ids.length}</div>
      {ids.map(id => (
        <Row key={id} id={id} />
      ))}
      <button data-testid="remove-one" onClick={() => setIds(prev => prev.slice(1))}>
        Remove one
      </button>
    </div>
  );
}

export function InstanceCollisionCheck() {
  return (
    <BasisProvider debug={true} showHUD={true}>
      <Inner />
    </BasisProvider>
  );
}  
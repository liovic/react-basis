// tests/context.test.tsx

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BasisProvider } from '../src/context';

describe('BasisProvider', () => {
  it('shows monitor in debug mode', () => {
    const { container } = render(<BasisProvider debug={true}><div>App</div></BasisProvider>);
    expect(container.textContent).toContain('BASIS_ENGINE: ACTIVE');
  });

  it('hides monitor in non-debug mode', () => {
    const { container } = render(<BasisProvider debug={false}><div>App</div></BasisProvider>);
    expect(container.textContent).not.toContain('BASIS_ENGINE: ACTIVE');
  });
});
import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import plugin from '../src/babel-plugin.js';

const run = (code: string, filename = 'MyComponent.js'): string => {
  const result = transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    plugins: [plugin],
  });

  if (!result?.code) {
    throw new Error(`transformSync returned no code for ${filename}`);
  }

  return result.code;
};

describe('babel-plugin-basis-transform', () => {
  it('labels a plain useState call with file -> varName', () => {
    const out = run(`
      import { useState } from 'react';
      function Comp() {
        const [count, setCount] = useState(0);
      }
    `);

    expect(out).toContain("useState(0, \"MyComponent.js -> count\")");
    expect(out).toMatch(/import\s*{\s*useState\s*}\s*from\s*["']react-state-basis["']/);
  });

  it('handles member-expression callees (React.useState(...))', () => {
    const out = run(`
      import * as React from 'react';
      function Comp() {
        const [count, setCount] = React.useState(0);
      }
    `);

    expect(out).toContain("React.useState(0, \"MyComponent.js -> count\")");
  });

  it('is idempotent, does not double-label a call that already has a label arg', () => {
    const out = run(`
      import { useState } from 'react';
      function Comp() {
        const [count, setCount] = useState(0, 'MyComponent -> count');
      }
    `);

    const matches = out.match(/useState\(/g) || [];
    expect(matches.length).toBe(1);

    expect(out).toContain("useState(0, 'MyComponent -> count')");
    expect(out).not.toContain("MyComponent.js -> count");
  });

  it('handles useReducer 2-arg form (no lazy init)', () => {
    const out = run(`
      import { useReducer } from 'react';
      function Comp() {
        const [state, dispatch] = useReducer(reducer, initialState);
      }
    `);

    expect(out).toContain(
      'useReducer(reducer, initialState, undefined, "MyComponent.js -> state")'
    );
  });

  it('handles useReducer 3-arg lazy-init form', () => {
    const out = run(`
      import { useReducer } from 'react';
      function Comp() {
        const [state, dispatch] = useReducer(reducer, initialArg, init);
      }
    `);

    expect(out).toContain(
      'useReducer(reducer, initialArg, init, "MyComponent.js -> state")'
    );
  });

  it('respects a block-comment @basis-ignore at the top of the file', () => {
    const out = run(`
      /* @basis-ignore */
      import { useState } from 'react';
      function Comp() {
        const [count, setCount] = useState(0);
      }
    `);

    expect(out).toContain('useState(0)');
    expect(out).not.toContain('MyComponent.js -> count');
    
    expect(out).not.toMatch(/react-state-basis/);
  });

  it('respects a line-comment @basis-ignore at the top of the file', () => {
    const out = run(`
      // @basis-ignore
      import { useState } from 'react';
      function Comp() {
        const [count, setCount] = useState(0);
      }
    `);

    expect(out).toContain('useState(0)');
    expect(out).not.toContain('MyComponent.js -> count');
  });

  it('routes an aliased import to the wrapped export, but does NOT label the call site', () => {
    const out = run(`
      import { useState as useLocalState } from 'react';
      function Comp() {
        const [count, setCount] = useLocalState(0);
      }
    `);

    expect(out).toMatch(
      /import\s*{\s*useState as useLocalState\s*}\s*from\s*["']react-state-basis["']/
    );

    expect(out).toContain('useLocalState(0)');
    expect(out).not.toContain('MyComponent.js -> count');
  });
});
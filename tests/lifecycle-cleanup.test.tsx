// tests/lifecycle-cleanup.test.tsx

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState, useEffect } from '../src/hooks';
import { instance } from '../src/engine';
import { BasisProvider } from '../src/context';

describe('Lifecycle cleanup (mount/unmount churn)', () => {
    beforeEach(() => {
        instance.history.clear();
        instance.graph.clear();
        instance.violationMap.clear();
        instance.redundantLabels.clear();
    });

    it('does not let graph/violationMap grow unbounded across repeated mount/unmount cycles', async () => {
        const Modal: React.FC = () => {
            const [a, setA] = useState(0, 'Modal.tsx -> a');
            useEffect(() => {
                setA(v => v + 1);
            }, [], 'Modal.tsx -> effect');
            return <div>{a}</div>;
        };

        const graphSizes: number[] = [];

        for (let i = 0; i < 50; i++) {
            const { unmount } = render(
                <BasisProvider debug showHUD={false}>
                    <Modal />
                </BasisProvider>
            );
            await act(async () => {
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            });
            unmount();
            graphSizes.push(instance.graph.size);
        }

        const first10Avg = graphSizes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const last10Avg = graphSizes.slice(-10).reduce((a, b) => a + b, 0) / 10;

        // If cleanup is working, size should plateau, not climb linearly
        // with the number of mounts.
        expect(last10Avg).toBeLessThanOrEqual(first10Avg * 1.5);
    });
});
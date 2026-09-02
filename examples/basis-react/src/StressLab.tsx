import { useState as basisUseState, useEffect } from 'react-state-basis'
import { useState as reactUseState } from 'react'

const StressNode = ({ index, mode }: { index: number; mode: 'idle' | 'sporadic' | 'burst' | 'animation' }) => {
    const [val, setVal] = basisUseState(0, `stress_node_${index}`)

    useEffect(() => {
        if (mode === 'idle') return;

        if (mode === 'sporadic') {
            const randomDelay = 800 + Math.random() * 2200;
            const timeout = setTimeout(() => {
                setVal(v => v + 1);
            }, randomDelay);
            return () => clearTimeout(timeout);
        }

        if (mode === 'burst') {
            const burstDelay = Math.random() * 50;
            const timeout = setTimeout(() => {
                setVal(v => v + 1);
            }, burstDelay);
            return () => clearTimeout(timeout);
        }

        if (mode === 'animation') {
            let frame: number;
            const animate = () => {
                setVal(v => (v + 1) % 100);
                frame = requestAnimationFrame(animate);
            };
            frame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(frame);
        }
    }, [val, setVal, mode]);

    return null;
}

type TestMode = 'idle' | 'sporadic' | 'burst' | 'animation';

export const StressLab = () => {
    const [hookCount, setHookCount] = reactUseState(0);
    const [mode, setMode] = reactUseState<TestMode>('idle');
    const [burstTrigger, setBurstTrigger] = reactUseState(0);
    const [perfMetrics, setPerfMetrics] = reactUseState<number[]>([]);
    const [basisMetrics, setBasisMetrics] = reactUseState<{
        hooks: number;
        tick: number;
        analysisMs: number;
    } | null>(null);

    useEffect(() => {
        if (mode === 'idle') return;

        const interval = setInterval(() => {
            const instance = (window as any).__BASIS_ENGINE_INSTANCE__;
            if (instance) {
                setBasisMetrics({
                    hooks: instance.history?.size || 0,
                    tick: instance.tick || 0,
                    analysisMs: instance.metrics?.lastAnalysisTimeMs || 0
                });
            }
        }, 500);

        return () => clearInterval(interval);
    }, [mode]);

    const measureInteraction = (label: string, action: () => void) => {
        const start = performance.now();

        action();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const end = performance.now();
                const duration = Math.round(end - start);
                console.log(`[PERF] ${label}: ${duration}ms`);
                setPerfMetrics(prev => [...prev.slice(-9), duration]);
            });
        });
    };

    const startTest = (testMode: TestMode, count: number) => {
        console.log(`[TEST START] Mode: ${testMode}, Hooks: ${count}`);
        setPerfMetrics([]);

        measureInteraction('Test Init', () => {
            setMode('idle');
            setHookCount(0);

            setTimeout(() => {
                measureInteraction(`${testMode} (${count} hooks)`, () => {
                    setMode(testMode);
                    setHookCount(count);
                });
            }, 100);
        });
    };

    const stopTest = () => {
        console.log('[TEST STOP]');
        setMode('idle');
        setHookCount(0);
        setPerfMetrics([]);
    };

    const triggerBurst = () => {
        measureInteraction('Manual Burst', () => {
            setBurstTrigger(prev => prev + 1);
        });
    };

    const avgPerf = perfMetrics.length > 0
        ? Math.round(perfMetrics.reduce((a, b) => a + b, 0) / perfMetrics.length)
        : null;

    return (
        <div className="diagnostic-card stress" style={{ padding: '24px' }}>
            <div className="card-tag" style={{ fontSize: '11px', marginBottom: '12px' }}>04 // PERFORMANCE_STRESS_LAB</div>
            <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Basis Performance Benchmarks</h2>

            <div style={{
                background: 'var(--zinc-50)',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
                border: '1px solid var(--zinc-200)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>TEST_MODE</span>
                    <span className="mono" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' }}>
                        {mode}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>ACTIVE_HOOKS</span>
                    <span className="mono" style={{ fontSize: '14px', fontWeight: 700 }}>{hookCount}</span>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--zinc-200)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--zinc-700)', fontSize: '12px', letterSpacing: '0.05em' }}>
                        METRIC_INTEGRITY_REPORT
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                        <strong>AVG_RENDER:</strong> Represents the internal processing time for Basis telemetry and React reconciliation. This reflects the direct computational weight of the library logic.
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                        <strong>TOTAL_INP:</strong> The absolute interaction-to-paint delay observed by the browser engine. Includes hardware interrupt latency, task-queue wait times, and main-thread saturation.
                    </div>
                    <div style={{ marginTop: '10px', fontStyle: 'italic', color: 'var(--zinc-500)', fontSize: '10px' }}>
                        * The observed delta between these metrics constitutes the "Cost of Observation"-the unavoidable browser scheduling overhead inherent in runtime instrumentation.
                    </div>
                </div>

                {basisMetrics && (
                    <div style={{
                        paddingTop: '16px',
                        borderTop: '1px solid var(--zinc-300)',
                        marginTop: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--zinc-500)' }}>BASIS_HOOKS</span>
                            <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                                {basisMetrics.hooks}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--zinc-500)' }}>BASIS_TICK</span>
                            <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                                {basisMetrics.tick}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--zinc-500)' }}>ANALYSIS_TIME</span>
                            <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                                {basisMetrics.analysisMs.toFixed(2)}ms
                            </span>
                        </div>
                    </div>
                )}

                {avgPerf !== null && (
                    <div style={{
                        paddingTop: '16px',
                        borderTop: '1px solid var(--zinc-300)',
                        marginTop: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span className="mono" style={{ fontSize: '12px', color: 'var(--zinc-500)' }}>AVG_RENDER</span>
                            <span className="mono" style={{
                                fontSize: '18px',
                                fontWeight: 700,
                                color: avgPerf < 20 ? 'var(--green)' : avgPerf < 50 ? 'var(--orange)' : 'var(--red)'
                            }}>
                                {avgPerf}ms
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    fontSize: '12px',
                    color: 'var(--zinc-500)',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Realistic Patterns
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                        onClick={() => startTest('sporadic', 20)}
                        className="secondary"
                        style={{ fontSize: '13px', padding: '12px' }}
                        disabled={mode !== 'idle'}
                    >
                        LIGHT_LOAD
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>20 hooks • sporadic</div>
                    </button>
                    <button
                        onClick={() => startTest('sporadic', 50)}
                        className="secondary"
                        style={{ fontSize: '13px', padding: '12px' }}
                        disabled={mode !== 'idle'}
                    >
                        MEDIUM_LOAD
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>50 hooks • sporadic</div>
                    </button>
                </div>

                <div style={{
                    fontSize: '12px',
                    color: 'var(--zinc-500)',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Stress Patterns
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <button
                        onClick={() => startTest('burst', 50)}
                        className="secondary"
                        style={{ fontSize: '13px', padding: '12px' }}
                        disabled={mode !== 'idle'}
                    >
                        BURST_TEST
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>50 hooks • simultaneous</div>
                    </button>
                    <button
                        onClick={() => startTest('burst', 100)}
                        className="secondary"
                        style={{ fontSize: '13px', padding: '12px' }}
                        disabled={mode !== 'idle'}
                    >
                        EXTREME_BURST
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>100 hooks • simultaneous</div>
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <button
                        onClick={() => startTest('animation', 10)}
                        className="secondary"
                        style={{ fontSize: '13px', padding: '12px' }}
                        disabled={mode !== 'idle'}
                    >
                        ANIMATION_STRESS
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>10 hooks @ 60fps • breaker test</div>
                    </button>
                </div>
            </div>

            {mode === 'burst' && hookCount > 0 && (
                <button
                    onClick={triggerBurst}
                    className="primary"
                    style={{ width: '100%', marginBottom: '16px', fontSize: '14px', padding: '14px' }}
                >
                    TRIGGER_BURST_UPDATE
                </button>
            )}

            {mode !== 'idle' && (
                <button
                    onClick={stopTest}
                    className="danger"
                    style={{ width: '100%', fontSize: '14px', padding: '14px' }}
                >
                    STOP_TEST
                </button>
            )}

            <div style={{ display: 'none' }}>
                {mode !== 'idle' && Array.from({ length: hookCount }).map((_, i) => (
                    <StressNode key={`${mode}-${i}-${burstTrigger}`} index={i} mode={mode} />
                ))}
            </div>
        </div>
    )
}
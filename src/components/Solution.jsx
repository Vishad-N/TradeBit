import { useEffect, useMemo, useRef, useState } from 'react';
import { solutionChart } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion, useInViewOnce, useStrokeLengths } from '../hooks/motion.js';

const STEPS = ['Structure', 'Price Action', 'Setup', 'Risk', 'Execution'];

export default function Solution() {
  const visRef = useRef(null);
  const chartRef = useRef(null);
  const timers = useRef([]);
  const chart = useMemo(solutionChart, []);
  const [played, setPlayed] = useState(false);
  const [step, setStep] = useState(0);
  useStrokeLengths(chartRef);

  // Reveal the five layers one after another once the visual is on screen.
  useInViewOnce(visRef, () => {
    setPlayed(true);
    const reduce = prefersReducedMotion();
    for (let i = 1; i <= 5; i++) timers.current.push(setTimeout(() => setStep(i), reduce ? 0 : 500 + i * 700));
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className="sol-wrap">
      <section className="solution" aria-labelledby="sol-t">
        <div className="wrap sol-grid">
          <div className="sol-copy">
            <span className="label rv">The Shift</span>
            <h2 id="sol-t" className="h-l split"><span className="ln"><span>Replace</span></span><span className="ln"><span>Guesswork With</span></span><span className="ln"><span><span className="hl">Structure.</span></span></span></h2>
            <p className="lead rv d2">Every decision answers one question — <strong>why here, why now?</strong> The framework turns a noisy chart into five deliberate, repeatable steps.</p>
            <ul className="shift rv d3">
              <li><span>Guessing direction</span><i>→</i><span>Mapping structure</span></li>
              <li><span>Reacting to candles</span><i>→</i><span>Reading price action</span></li>
              <li><span>Entering anywhere</span><i>→</i><span>Waiting for a setup</span></li>
              <li><span>Hoping it works</span><i>→</i><span>Defining risk first</span></li>
            </ul>
          </div>
          <div ref={visRef} className="sol-vis rv d1" role="img" aria-label="Market structure visualization: a flowing pale lime ribbon behind a candlestick uptrend, with structure points, a setup zone, risk levels and an execution marker">
            <svg ref={chartRef} className={played ? 'drawn' : undefined} viewBox="0 0 700 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <g dangerouslySetInnerHTML={html(chart.base)} />
              {chart.layers.map((markup, i) => markup && (
                <g key={i} className={i <= step ? 'lay on' : 'lay'} data-l={i} dangerouslySetInnerHTML={html(markup)} />
              ))}
            </svg>
            <div className="sol-steps">
              {STEPS.map((label, j) => <span key={label} className={j < step ? 'on' : undefined}>{label}</span>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

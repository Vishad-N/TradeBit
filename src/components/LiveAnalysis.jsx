import { useEffect, useMemo, useRef, useState } from 'react';
import { LensRings } from './Rings.jsx';
import { liveBg, liveChart } from '../lib/charts.js';
import { html } from '../lib/html.js';
import { prefersReducedMotion, useInViewOnce, useStrokeLengths } from '../hooks/motion.js';

const CHIPS = [
  { l: 1, label: 'Structure' },
  { l: 2, label: 'Levels' },
  { l: 3, label: 'Zones' },
  { l: 4, label: 'Breakout', key: true },
  { l: 5, label: 'Risk', key: true },
];

const READOUTS = [
  ['Layer 00', 'The raw chart', 'No lines, no bias. Every analysis begins with price alone.'],
  ['Layer 01', 'Market structure', 'Higher highs and higher lows — buyers control the trend while this sequence holds.'],
  ['Layer 02', 'Support & resistance', 'Former resistance becomes support. The latest high is the level to watch.'],
  ['Layer 03', 'Demand & supply', 'The origin of the last strong move is marked as demand — then we wait for price to come to us.'],
  ['Layer 04', 'Breakout', 'A close above resistance confirms continuation. Now we look for a controlled retest.'],
  ['Layer 05', 'Entry & risk', 'Entry on the retest, stop below the zone, target at a planned multiple. Risk is set before the trade.'],
];

export default function LiveAnalysis() {
  const boardRef = useRef(null);
  const chartRef = useRef(null);
  const timers = useRef([]);
  // Once the user touches a chip (or autoplay has started) autoplay never (re)starts.
  const autoplayed = useRef(false);
  const chart = useMemo(liveChart, []);
  const bg = useMemo(liveBg, []);
  const [drawn, setDrawn] = useState(false);
  const [layers, setLayers] = useState([false, false, false, false, false, false]);
  const [readout, setReadout] = useState(0);
  const [swapping, setSwapping] = useState(false);
  useStrokeLengths(chartRef);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Fade the readout out, swap its text, fade back in.
  const showReadout = i => {
    setSwapping(true);
    timers.current.push(setTimeout(() => { setReadout(i); setSwapping(false); }, 200));
  };

  const setLayer = (i, on) => setLayers(prev => prev.map((v, j) => (j === i ? on : v)));

  useInViewOnce(boardRef, () => {
    setDrawn(true);
    if (autoplayed.current) return;
    autoplayed.current = true;
    const reduce = prefersReducedMotion();
    for (let i = 1; i <= 5; i++) {
      timers.current.push(setTimeout(() => { setLayer(i, true); showReadout(i); }, reduce ? 0 : 400 + i * 1100));
    }
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });

  const toggleChip = i => {
    const next = layers.map((v, j) => (j === i ? !v : v));
    setLayers(next);
    const top = next[i] ? i : Math.max(0, ...next.map((v, j) => (v ? j : 0)));
    showReadout(top);
    autoplayed.current = true;
  };

  const [roKey, roTitle, roText] = READOUTS[readout];

  return (
    <section className="live dark" id="live" aria-labelledby="live-t">
      <LensRings />
      <svg className="live-bgc drawn" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={html(bg)} />
      <div className="wrap">
        <div className="live-head">
          <div>
            <span className="label rv">Applied Analysis</span>
            <h2 id="live-t" className="h-l split" style={{ marginTop: '26px' }}><span className="ln"><span>Don't Just Learn</span></span><span className="ln"><span>The Theory.</span></span><span className="ln"><span className="lime">See It Applied.</span></span></h2>
          </div>
          <p className="lead rv d2">The same breakdown process used in every weekly live session — structure first, then levels, zones, confirmation and risk. Toggle each layer to see how the picture builds.</p>
        </div>
        <div ref={boardRef} className="board rv">
          <div className="board-bar">
            <span className="meta"><b>GOLD · XAU/USD</b> &nbsp;·&nbsp; 4H &nbsp;·&nbsp; Educational breakdown</span>
            <div className="chips" role="group" aria-label="Chart layers">
              {CHIPS.map(({ l, label, key }) => (
                <button key={l} type="button" className={key ? 'chip k' : 'chip'} aria-pressed={layers[l]} onClick={() => toggleChip(l)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="board-chart">
            <svg ref={chartRef} className={drawn ? 'drawn' : undefined} viewBox="0 0 1200 540" preserveAspectRatio="none" role="img" aria-label="Candlestick chart with higher highs, higher lows, support and resistance, demand and supply zones, a breakout, entry and risk zones">
              <g dangerouslySetInnerHTML={html(chart.base)} />
              {chart.layers.map((markup, i) => markup && (
                <g key={i} className={layers[i] ? 'lay on' : 'lay'} data-l={i} dangerouslySetInnerHTML={html(markup)} />
              ))}
            </svg>
          </div>
          <div className="readout" aria-live="polite">
            <div className={swapping ? 'readout-b swap' : 'readout-b'}><span className="meta">{roKey}</span><h3>{roTitle}</h3><p>{roText}</p></div>
          </div>
        </div>
        <p className="disclaim">Educational illustration only. Past price behaviour does not guarantee future results.</p>
      </div>
    </section>
  )
}

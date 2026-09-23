import { useLayoutEffect, useRef, useState } from 'react';
import { phoneChart, uiChart } from '../lib/charts.js';
import { html } from '../lib/html.js';

// Ring sizes are expressed relative to --cut-r, the radius of the circular cut-out.
const RINGS_IN = [1, 2, 3, 4, 5, 6, 7].map(k => `calc(var(--cut-r) * 2 + ${k * 64}px)`);
const RINGS_CUT = [1, 2, 3, 4].map(k => `calc(var(--cut-r) * 2 - ${k * 70}px)`);

// The device mock-ups are laid out at a fixed design width and scaled to fit
// whatever width their screen currently has.
function useFitScale(designWidth) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    const fit = () => setScale(el.clientWidth / designWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);
  return [ref, { transform: `scale(${scale})` }];
}

export default function Platform() {
  const [lapRef, lapStyle] = useFitScale(1100);
  const [phoneRef, phoneStyle] = useFitScale(300);

  return (
    <section className="platform" id="platform" aria-labelledby="plat-t">
      <div className="plat-stage">
        <div className="rings-in" aria-hidden="true">
          {RINGS_IN.map(size => <i key={size} style={{ width: size, height: size }} />)}
        </div>
        <div className="plat-copy">
          <span className="label rv">The Platform</span>
          <h2 id="plat-t" className="h-l split"><span className="ln"><span>Your Entire</span></span><span className="ln"><span>Practice.</span></span><span className="ln"><span>One Place.</span></span></h2>
          <p className="lead rv d2">Lessons, live analysis, your trading journal and risk tools live together — on desktop and in your pocket.</p>
          <ul className="feats rv d3">
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><rect x="2" y="3" width="18" height="16" rx="3"/><path d="M2 8h18"/><rect x="5" y="11" width="6" height="5" fill="#B8D83D" stroke="none"/></svg>Course dashboard<span>6 modules</span></li>
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><circle cx="11" cy="11" r="8"/><path d="M11 3a8 8 0 018 8" stroke="#B8D83D" strokeWidth="2.4"/></svg>Lesson progress<span>Auto-saved</span></li>
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><path d="M2 17l5-5 4 3 8-9"/><circle cx="19" cy="6" r="2" fill="#B8D83D" stroke="none"/></svg>Market analysis<span>Weekly live</span></li>
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><rect x="4" y="2" width="14" height="18" rx="2"/><path d="M8 7h6M8 11h6M8 15h3"/></svg>Trading journal<span>Tagged reviews</span></li>
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><rect x="4" y="2" width="14" height="18" rx="2"/><path d="M8 6h6"/><circle cx="8.5" cy="11" r=".8" fill="#151814"/><circle cx="13.5" cy="11" r=".8" fill="#151814"/><circle cx="8.5" cy="15" r=".8" fill="#151814"/><circle cx="13.5" cy="15" r="1.4" fill="#B8D83D" stroke="none"/></svg>Risk calculator<span>Position size</span></li>
            <li><svg viewBox="0 0 22 22" fill="none" stroke="#151814" strokeWidth="1.4"><circle cx="8" cy="8" r="3"/><circle cx="15" cy="9" r="2.4"/><path d="M2.5 18c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14 13.4c2.4 0 4.2 1.4 4.8 4.2"/></svg>Community<span>Moderated</span></li>
          </ul>
        </div>
      </div>
      <div className="cut-rings" aria-hidden="true">
        <i className="k" style={{ width: 'calc(var(--cut-r) * 2 + 26px)', height: 'calc(var(--cut-r) * 2 + 26px)' }} />
        {RINGS_CUT.map(size => <i key={size} style={{ width: size, height: size }} />)}
      </div>

      <div className="devices rv">
        <div className="flt flt1"><i>◷</i><div><b>Live session in 02:14:30</b><span>Weekly Outlook · Mon 8:30 PM</span></div></div>
        <div className="flt flt2"><i>±</i><div><b>Position size · 42 units</b><span>1% risk on ₹5,00,000</span></div></div>
        <div className="laptop">
          <div className="lid"><div className="screen" ref={lapRef}>
            <div className="scale-ui ui" style={lapStyle} role="img" aria-label="TradeBit learning dashboard showing current lesson, course progress, live analysis chart, trading journal, position calculator and community">
              <aside>
                <div className="ub"><i></i>TRADEBIT</div>
                <div className="ni on"><i></i>Dashboard</div><div className="ni"><i></i>Courses</div><div className="ni"><i></i>Live Analysis</div>
                <div className="ni"><i></i>Trading Journal</div><div className="ni"><i></i>Calculators</div><div className="ni"><i></i>Community</div><div className="ni"><i></i>Sessions</div>
                <div className="streak"><small style={{ color: 'rgba(243,244,239,.42)' }}>Journal streak</small><b>21 days</b></div>
              </aside>
              <main>
                <div className="top"><div><small>Tuesday, 22 September</small><h4>Good evening, Priya</h4></div><div><span className="pill">Search lessons</span><span className="pill k">● Live at 8:30 PM</span></div></div>
                <div className="cd2"><h5><span>Continue learning</span><span>Module 04 · Lesson 7</span></h5>
                  <div className="lesson"><div className="thumb"><svg viewBox="0 0 160 92" preserveAspectRatio="none"><polyline points="0,78 20,68 36,72 54,48 70,56 94,32 110,40 134,18 160,24" fill="none" stroke="#DCE8C0" strokeWidth="2"/><rect x="84" y="48" width="76" height="14" fill="#B8D83D" fillOpacity=".2"/></svg><span className="pl">▶</span></div>
                    <div style={{ flex: 1 }}><b>Position Sizing With Fixed Fractional Risk</b><span style={{ color: 'rgba(243,244,239,.42)' }}>18 min · Risk Management</span><div className="bar"><i style={{ width: '64%' }}></i></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', color: 'rgba(243,244,239,.42)' }}><span>11:32 watched</span><span>64%</span></div></div></div>
                </div>
                <div className="cd2"><h5><span>Course progress</span><span>58%</span></h5>
                  <div className="prog"><svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" stroke="rgba(243,244,239,.12)" strokeWidth="7" fill="none"/><circle cx="42" cy="42" r="34" stroke="#B8D83D" strokeWidth="7" fill="none" strokeDasharray="213.6" strokeDashoffset="89.7" strokeLinecap="round" transform="rotate(-90 42 42)"/><text x="42" y="47" textAnchor="middle" fill="#F3F4EF" fontSize="16" fontFamily="Space Grotesk, sans-serif">58%</text></svg>
                    <div className="mods"><div><span>Market Structure</span><span>100%</span></div><div><span>Price Action</span><span>100%</span></div><div><span>Trade Setups</span><span>100%</span></div><div className="k"><span>Risk Management</span><span>64%</span></div></div></div>
                </div>
                <div className="cd2 chartc"><h5><span>Live analysis · NIFTY 50 · 1D</span><span style={{ color: '#B8D83D' }}>Structure · Bullish</span></h5><svg className="drawn" viewBox="0 0 560 168" preserveAspectRatio="none" dangerouslySetInnerHTML={html(uiChart())} /></div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="cd2"><h5><span>Trading journal</span><span>This week</span></h5>
                    <table><tbody><tr><td>RELIANCE · Long</td><td className="m">Plan ✓</td><td className="k">+2.1R</td></tr><tr><td>HDFCBANK · Long</td><td className="m">Plan ✓</td><td className="m">−1.0R</td></tr><tr><td>GOLD · Short</td><td className="m">Plan ✓</td><td className="k">+1.6R</td></tr></tbody></table></div>
                  <div className="cd2"><h5><span>Position calculator</span><span>Risk 1%</span></h5>
                    <div className="calc"><div><small>Account</small><b>₹5,00,000</b></div><div><small>Stop distance</small><b>₹118</b></div><div className="res"><small>Position size</small><b>42 units · ₹4,956 at risk</b></div></div></div>
                  <div className="comm"><div className="av"><i></i><i></i><i></i></div>148 students online · 3 new chart reviews</div>
                </div>
              </main>
            </div>
          </div></div>
          <div className="base"></div>
          <div className="phone"><div className="p-screen" ref={phoneRef}>
            <div className="scale-ui pui" style={phoneStyle} role="img" aria-label="TradeBit mobile app with upcoming session, chart, journal stats and community">
              <div className="hd"><b>Today</b><span style={{ color: '#B8D83D' }}>● Live 8:30</span></div>
              <div className="cd2"><small>Up next</small><div style={{ fontSize: '15px', fontWeight: '600', margin: '6px 0 2px' }}>Weekly Outlook — Session 38</div><div style={{ color: 'rgba(243,244,239,.42)' }}>Starts in 02:14:30</div></div>
              <div className="cd2"><small>NIFTY 50 · 1D</small><svg className="drawn" viewBox="0 0 260 110" dangerouslySetInnerHTML={html(phoneChart())} /></div>
              <div className="cd2"><small>Journal · Plan adherence</small><div className="big">86%</div><div className="row"><span>Trades logged</span><b>34</b></div><div className="row"><span>Avg. planned R</span><b>2.3R</b></div></div>
              <div className="cd2"><small>Community</small><div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}><div className="av"><i></i><i></i><i></i></div><span style={{ color: 'rgba(243,244,239,.62)' }}>148 online</span></div></div>
              <div className="tabs"><span className="on">Home</span><span>Learn</span><span>Journal</span><span>Tools</span></div>
            </div>
          </div></div>
        </div>
      </div>
    </section>
  )
}

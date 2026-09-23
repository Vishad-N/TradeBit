import Counter from './Counter.jsx';
import { trustIn, trustTopo } from '../lib/charts.js';
import { html } from '../lib/html.js';

export default function Trust() {
  return (
    <section className="trust-zone" aria-label="TradeBit at a glance">
      <svg className="topo" viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={html(trustTopo())} />
      <div className="trust rv">
        <svg className="topo-in" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={html(trustIn())} />
        <div className="trust-grid">
          <div className="stat"><Counter className="n" to={25} suf="K+" /><span className="t"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6" cy="5" r="2.6"/><path d="M1.5 14c.5-2.8 2.3-4.2 4.5-4.2s4 1.4 4.5 4.2M11 2.6a2.6 2.6 0 010 5M12.4 9.8c1.3.5 2 1.8 2.2 3.8"/></svg>Students</span></div>
          <div className="stat"><Counter className="n" to={50} suf="+" /><span className="t"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c1.8 1.9 2.6 4.1 2.6 6.5s-.8 4.6-2.6 6.5C6.2 12.6 5.4 10.4 5.4 8S6.2 3.4 8 1.5z"/></svg>Countries</span></div>
          <div className="stat"><Counter className="n" to={4.8} dec={1} suf="/5" /><span className="t"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 1.8l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.2l-3.7 2.1.8-4.2L2 6.2l4.2-.5z"/></svg>Average Rating</span></div>
          <div className="stat"><Counter className="n" to={100} suf="+" /><span className="t"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="1.5" y="3" width="13" height="9" rx="1.5"/><path d="M6.8 5.6v3.8L10 7.5z"/><path d="M5 14.5h6"/></svg>Hours of Education</span></div>
        </div>
        <div className="trust-foot meta"><span>Student data · updated September 2026</span><span>Structure · Risk · Discipline</span></div>
      </div>
    </section>
  )
}

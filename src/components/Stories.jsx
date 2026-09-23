import { face } from '../lib/charts.js';
import { html } from '../lib/html.js';

// Organic testimonial shape with topographic inner contours.
function Shape({ className, contours }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: contours }, (_, k) => <i key={k} style={{ inset: (k + 1) * 30 }} />)}
    </div>
  );
}

const Face = ({ n }) => <span className="face" dangerouslySetInnerHTML={html(face(n))} />;

export default function Stories({ onPlayVideo }) {
  return (
    <section className="stories" id="stories" aria-labelledby="st-t">
      <div className="wrap">
        <div className="stories-head">
          <div>
            <span className="label rv">Student Stories</span>
            <h2 id="st-t" className="h-l split"><span className="ln"><span>Clarity, In Their</span></span><span className="ln"><span>Own Words.</span></span></h2>
          </div>
          <div className="score rv d2"><b>4.8</b><div><div className="stars" aria-label="4.8 out of 5 stars">★★★★★</div><span>from 3,200+ verified reviews</span></div></div>
        </div>

        <div className="comp">
          <Shape className="shape s-a" contours={6} />
          <Shape className="shape s-b" contours={5} />
          <div className="shape s-c" aria-hidden="true"></div>
          <span className="note n1" aria-hidden="true">Process &gt; prediction</span>

          <figure className="tst t-main rv">
            <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>“For the first time, I understood <em>why</em> I was taking a trade — and that changed how I approach the entire market.”</blockquote>
            <figcaption className="who"><Face n={0} /><div><b>Rohan Kulkarni</b><span>Software Engineer · Pune · Student since 2024</span></div></figcaption>
          </figure>
          <figure className="tst t-s t-2 rv d1">
            <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>“The risk module changed everything. I size positions with a formula now, not a feeling.”</blockquote>
            <figcaption className="who"><Face n={1} /><div><b>Ananya Shah</b><span>Chartered Accountant · Mumbai</span></div></figcaption>
          </figure>
          <button className="tst t-vid rv d2" type="button" onClick={onPlayVideo} aria-label="Play video story from Vikram Rao">
            <svg className="bg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#DCE8C0" strokeOpacity=".1"><ellipse cx="200" cy="330" rx="240" ry="190"/><ellipse cx="200" cy="330" rx="200" ry="150"/><ellipse cx="200" cy="330" rx="160" ry="110"/></g><ellipse cx="200" cy="180" rx="44" ry="52" fill="#DCE8C0" fillOpacity=".08"/><path d="M110 320 C120 250 160 236 200 234 C240 236 280 250 290 320Z" fill="#DCE8C0" fillOpacity=".08"/></svg>
            <span className="meta">Video story · 3:12</span>
            <span className="play"><svg width="18" height="18" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg></span>
            <span><b>“I stopped overtrading.”</b><small>Vikram Rao · Business Owner · Bengaluru</small></span>
          </button>
          <figure className="tst t-s t-3 rv d1">
            <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
            <blockquote>“Journaling every trade showed me my real mistakes. The weekly clinics keep me consistent.”</blockquote>
            <figcaption className="who"><Face n={2} /><div><b>Meera Iyer</b><span>Doctor · Chennai</span></div></figcaption>
          </figure>
        </div>
        <p className="stories-foot">Testimonials describe individual learning experiences and are not indicative of future performance or trading results.</p>
      </div>
    </section>
  )
}

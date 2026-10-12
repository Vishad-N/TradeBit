import { Link } from 'react-router-dom';
import Disclaimer from '../components/Disclaimer.jsx';
import '../styles/about.css';

// The three ideas in the "About" copy, set as a quiet numbered row (same outlined-number style as the Method section).
const PILLARS = [
  { n: '01', title: 'The Mission', text: 'To transform everyday traders into Pro-level masters and elevate them into the elite 1% Club.' },
  { n: '02', title: 'The Education', text: 'High-end, practical education focused on Gold and Crypto trading, with the strategies to navigate any market condition.' },
  { n: '03', title: 'The Result', text: 'Disciplined, highly profitable and independent market leaders, not students who depend on tips.' },
];

export default function About() {
  return (
    <div className="ab">
      {/* HERO: the blindfolded trader. The empty space of the picture is the bridge that has not been built yet, so the headline sits in it. */}
      <section className="ab-hero" aria-labelledby="ab-t">
        <div className="ab-copy">
          <span className="label">About Trade Bit India</span>
          <h1 id="ab-t" className="h-l ab-title">Don't trade blindly and <span className="hl">blow your account.</span></h1>
          <p className="ab-lead">Learn the skill first, dominate the market next with <strong>Trade Bit India.</strong></p>
        </div>
        <img
          className="ab-art"
          src="/blindfolded-bridge.webp"
          alt="A blindfolded businessman steps off a cliff towards a bridge that is only being sketched with a pencil: trading without skill"
          width="1674"
          height="940"
        />
      </section>

      {/* ABOUT: headline claim on the left, the two paragraphs on the right */}
      <section className="ab-about" aria-labelledby="ab-about-t">
        <div className="ab-about-head">
          <span className="label">Who We Are</span>
          <h2 id="ab-about-t" className="h-m">Not just an educational platform.<br /><span className="ab-em">A financial revolution.</span></h2>
        </div>
        <div className="ab-about-body">
          <p>Trade Bit India is not just an educational platform; it is a financial revolution. Our mission is crystal clear: to transform everyday traders into <b>Pro-level masters</b> and elevate them into the <b>elite 1% Club.</b></p>
          <p>We believe that the right knowledge is your greatest asset in the market. That is why we provide high-end, practical education focused on <b>Gold and Crypto trading</b>, equipping you with the strategies needed to navigate any market condition.</p>
          <p className="ab-close">We don't just teach trading; we build disciplined, highly profitable, and independent market leaders.</p>
        </div>
      </section>

      <ol className="ab-pillars">
        {PILLARS.map(p => (
          <li key={p.n}>
            <span className="ab-num" aria-hidden="true">{p.n}</span>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </li>
        ))}
      </ol>

      {/* VISION: dark band, one sentence, one action */}
      <section className="ab-vision" aria-labelledby="ab-vision-t">
        <div className="ab-vision-rings" aria-hidden="true"><i /><i /><i /><i /></div>
        <span className="label">Our Vision</span>
        <h2 id="ab-vision-t" className="ab-vision-text">
          To simplify financial literacy and empower every Indian trader to not just <em>survive</em> the market, but <strong>dominate it.</strong>
        </h2>
        <p className="ab-vision-sub">Join us, master the charts, and claim your spot in the 1% Club!</p>
        <div className="ab-vision-cta">
          <Link to="/1-percent-club" className="btn btn-lime">Claim Your Spot <span className="ar">→</span></Link>
          <Link to="/contact" className="ab-link">Talk to us</Link>
        </div>
      </section>

      <div className="ab-note">
        <Disclaimer />
        <p>Please also read our <Link to="/risk-disclosure">Risk Disclosure</Link>.</p>
      </div>
    </div>
  );
}

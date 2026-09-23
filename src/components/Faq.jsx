import { useRef, useState } from 'react';

const COLUMNS = [
  [
    ['Is this suitable for beginners?', 'Yes. The programme starts from the basics — what a candle is and how a chart is read — and builds one step at a time. Most students start with no prior experience.'],
    ['Do I need previous trading experience?', "No. Experienced traders benefit from the structure and risk modules, but no background is needed, and you don't need a funded account to start learning."],
    ['Which markets are covered?', 'The framework applies to any liquid market. Lessons use Indian equities and indices, forex, commodities such as gold, and crypto as worked examples.'],
    ['How long do I get access?', 'Lifetime access. You pay once and keep every lesson, tool and future curriculum update.'],
  ],
  [
    ['Are live sessions included?', 'Yes — a weekly outlook, a mid-week review and a Saturday journal clinic. Every session is recorded and added to your library.'],
    ['Can I access the platform on mobile?', 'Yes. The platform works in any modern mobile browser, and your progress, journal and calculators sync across devices.'],
    ['What happens after purchase?', "You'll receive login details by email within minutes, with a short onboarding guide and an invitation to the student community."],
    ['Is this financial advice?', 'No. Strata provides education only. Nothing here is a recommendation to buy or sell any security. Trading involves risk and you are responsible for your own decisions.'],
  ],
];

function QuestionAnswer({ question, answer }) {
  const [open, setOpen] = useState(false);
  const ansRef = useRef(null);
  // Height animates from 0 to the answer's measured height (set in CSS transition).
  const height = open && ansRef.current ? `${ansRef.current.scrollHeight}px` : '0px';

  return (
    <div className={open ? 'qa open' : 'qa'}>
      <h3>
        <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {question}<span className="pm" aria-hidden="true"></span>
        </button>
      </h3>
      <div className="ans" ref={ansRef} style={{ height }}><p>{answer}</p></div>
    </div>
  );
}

export default function Faq() {
  return (
    <div className="faq" id="faq" aria-labelledby="faq-t">
      <div className="faq-grid">
        <div className="faq-side">
          <span className="label">FAQ</span>
          <h2 id="faq-t" className="h-m">Questions?<br />Answered.</h2>
          <p>Still unsure? Write to <a href="mailto:hello@strata.academy">hello@strata.academy</a> — a real person replies within one working day.</p>
        </div>
        <div className="qa-cols">
          {COLUMNS.map((items, c) => (
            <div key={c}>
              {items.map(([q, a]) => <QuestionAnswer key={q} question={q} answer={a} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

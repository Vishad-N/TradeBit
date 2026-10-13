import { Link } from 'react-router-dom';

const h2Style = { fontSize: '24px', fontWeight: '500', color: 'var(--c)', marginTop: '40px', marginBottom: '20px' };
const pStyle = { marginBottom: '20px' };
const ulStyle = { marginBottom: '20px', paddingLeft: '24px', listStyle: 'disc' };

export default function Refund() {
  return (
    <div>
      <span className="label">LEGAL</span>
      <h1 className="h-l" style={{ marginTop: '24px', marginBottom: '40px' }}>Refund and Cancellation Policy</h1>
      <div className="legal-content" style={{ color: 'var(--c-80)', lineHeight: '1.6', fontSize: '18px' }}>
        <p style={pStyle}>Last Updated: October 13, 2026</p>
        <p style={pStyle}>Thank you for choosing TradeBit India for your trading education journey. Please read this policy carefully before purchasing any of our courses, masterclasses, or mentorship programs.</p>

        <h2 style={h2Style}>1. No Refund Policy for Digital Educational Content</h2>
        <p style={pStyle}>Due to the nature of digital content, online courses, and downloadable materials, TradeBit India operates under a strict NO REFUND policy.</p>
        <p style={pStyle}>Once a user purchases a course or enrolls in a program, immediate access to the intellectual property, video lectures, and educational resources is granted. Therefore, we do not offer refunds, exchanges, or cancellations under any circumstances, except as stated in the exception below and in Section 3.</p>

        <p style={pStyle}>
          <strong>Exception: 1% Club money-back guarantee.</strong> The 1% Club mentorship program carries a separate 90-day 100% money-back
          guarantee. It applies only to students who meet its terms: active participation for the full 90 days, replication of the mentor's
          exact trades, execution of at least 90% of the official trades broadcast in the club, and submission of a verified broker P&amp;L ledger
          proving a net loss while following the stated risk management. Those terms apply to that program in place of this section, and are
          set out in full on the <Link to="/1-percent-club#guarantee">1% Club page</Link>. This exception does not extend to any other
          course, masterclass or program.
        </p>

        <h2 style={h2Style}>2. Pre-Purchase Evaluation</h2>
        <p style={pStyle}>We encourage all students to evaluate our teaching style and content quality before making a purchase. You can do this by:</p>
        <ul style={ulStyle}>
          <li>Watching our free educational videos on our official YouTube channel.</li>
          <li>Reviewing the course curriculum and modules details listed on our website.</li>
          <li>Reaching out to our support team with any pre-enrollment queries.</li>
        </ul>

        <h2 style={h2Style}>3. Exceptional Cases (Double Payments)</h2>
        <p style={pStyle}>In rare cases where a student is charged twice for the same course due to a technical glitch or payment gateway error:</p>
        <ul style={ulStyle}>
          <li>The duplicate payment will be refunded entirely to the original payment source.</li>
          <li>The user must notify us with payment proofs (transaction ID, screenshot) within 48 hours of the transaction.</li>
          <li>Once verified, the refund will be processed and reflected in your account within 5-7 working days, depending on your bank's policy.</li>
        </ul>

        <h2 style={h2Style}>4. Policy Updates</h2>
        <p style={pStyle}>TradeBit India reserves the right to modify this Refund and Cancellation Policy at any time without prior notice. Any changes will be posted immediately on this webpage.</p>

        <h2 style={h2Style}>5. Support &amp; Queries</h2>
        <p style={pStyle}>If you experience any technical difficulties in accessing your purchased course or have questions regarding your enrollment, please contact our support team immediately:</p>
        <ul style={ulStyle}>
          <li>Email: <a href="mailto:support@tradebitindia.com">support@tradebitindia.com</a></li>
          <li>WhatsApp/Call Support: <a href="tel:+917805888599">+91-7805888599</a></li>
        </ul>
      </div>
    </div>
  );
}

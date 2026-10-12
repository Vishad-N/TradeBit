const h2Style = { fontSize: '24px', fontWeight: '500', color: 'var(--c)', marginTop: '40px', marginBottom: '20px' };
const pStyle = { marginBottom: '20px' };
const ulStyle = { marginBottom: '20px', paddingLeft: '24px', listStyle: 'disc' };

export default function Privacy() {
  return (
    <div>
      <span className="label">LEGAL</span>
      <h1 className="h-l" style={{ marginTop: '24px', marginBottom: '40px' }}>Privacy Policy for TradeBit India</h1>
      <div className="legal-content" style={{ color: 'var(--c-80)', lineHeight: '1.6', fontSize: '18px' }}>
        <p style={pStyle}>Last Updated: October 10, 2026</p>
        <p style={pStyle}>At TradeBit India (accessible from tradebitindia.com), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by TradeBit India and how we use it.</p>

        <h2 style={h2Style}>1. Information We Collect</h2>
        <p style={pStyle}>If you register for our courses, subscribe to our newsletter, or fill out a form, we may collect personal information such as your:</p>
        <ul style={ulStyle}>
          <li>Name</li>
          <li>Email Address</li>
          <li>Phone Number / WhatsApp Number</li>
          <li>Billing Address &amp; Payment Information (processed securely through authorized payment gateways)</li>
        </ul>

        <h2 style={h2Style}>2. How We Use Your Information</h2>
        <p style={pStyle}>We use the information we collect in various ways, including to:</p>
        <ul style={ulStyle}>
          <li>Provide, operate, and maintain our educational platform and website.</li>
          <li>Process your course enrollments and payments.</li>
          <li>Send you course links, updates, and promotional materials (via Email/WhatsApp/SMS).</li>
          <li>Improve, personalize, and expand our website user experience.</li>
          <li>Understand and analyze how you use our website.</li>
        </ul>

        <h2 style={h2Style}>3. Log Files and Cookies</h2>
        <p style={pStyle}>TradeBit India follows a standard procedure of using log files and cookies. These files log visitors when they visit websites. The information collected includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date/time stamp, and referring/exit pages. This is used for analyzing trends and administering the site.</p>

        <h2 style={h2Style}>4. Third-Party Privacy Policies</h2>
        <p style={pStyle}>Our website may contain links to external sites or use third-party tools (like payment gateways and analytics). TradeBit India's Privacy Policy does not apply to other advertisers or websites. We advise you to consult the respective Privacy Policies of these third-party services.</p>

        <h2 style={h2Style}>5. Data Protection Rights</h2>
        <p style={pStyle}>We want to make sure you are fully aware of all of your data protection rights. Every user is entitled to request copies of their personal data or ask us to correct/erase any information they believe is inaccurate.</p>

        <h2 style={h2Style}>6. Contact Us</h2>
        <p style={pStyle}>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at:</p>
        <ul style={ulStyle}>
          <li>Email: <a href="mailto:support@tradebitindia.com">support@tradebitindia.com</a></li>
          <li>Contact Number: <a href="tel:+917805888599">+91-7805888599</a></li>
        </ul>
      </div>
    </div>
  );
}

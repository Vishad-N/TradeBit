import Reveal from '../shared/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const STATS = [
  ['X+', 'Years'],
  ['X+', 'Students'],
  ['X+', 'Sessions'],
]

export default function Mentor() {
  return (
    <section className="mentor" id="mentor">
      <div className="wrap">
        <SectionHeading label="05 / Your instructor">Meet your mentor</SectionHeading>
        <Reveal className="glass">
          <div className="portrait">
            <img src="/mentors/satyendra-tt1.webp" alt="Satyendra Kushwaha, lead instructor" width="998" height="1500" loading="lazy" decoding="async" />
          </div>
          <div className="mbody">
            <h3>Satyendra Kushwaha</h3>
            <p className="role">Lead Instructor · Gold &amp; Crypto Trading Expert</p>
            <p className="mtag">Welcome to TradeBit India – Mastering Gold &amp; Crypto with 7+ Years of Market Expertise.</p>
            <p>
              At TradeBit India, we believe trading isn&apos;t about guesswork; it&apos;s about mastering data, risk management, and market mindset. Founded by a professional trader with over 7 years of hands-on experience navigating the high-stakes worlds of Gold and Cryptocurrency, TradeBit India is built to bridge the gap between financial ambition and actual market execution.
            </p>
            <p>
              Having decoded the charts through multiple market cycles, we don&apos;t just trade—we empower. Through our structured, no-BS training programs, we transform beginners into confident, independent, and consistently profitable traders. Your journey to financial freedom through calculated trading starts here.
            </p>
            <ul className="mtags">
              <li>Gold</li>
              <li>Crypto</li>
              <li>7+ Years</li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

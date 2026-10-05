import Accordion from '../components/Accordion.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

// Bracketed answers are placeholders awaiting confirmation.
const QUESTIONS = [
  { title: 'Is the webinar free?', body: '[Confirm: yes, registration for the live masterclass is free.]' },
  {
    title: 'Is this suitable for beginners?',
    body: 'The session starts from fundamentals and builds a process, so newer traders can follow along. Experienced traders will find a structure to organise what they already know.',
  },
  { title: 'Which markets are covered?', body: '[Specify markets covered, e.g. indices, stocks, forex.]' },
  { title: 'Will there be a recording?', body: '[Confirm recording and replay policy.]' },
  {
    title: 'What will I learn?',
    body: 'Market structure, trade selection, risk management and trading psychology, tied together by one framework, plus a live chart breakdown and Q&A.',
  },
  {
    title: 'Is this a trading signal service?',
    body: 'No. This is education. Trade Bit does not provide buy or sell signals, and no results are promised.',
  },
  {
    title: 'What is included in the course?',
    body: '[List verified inclusions and pricing once confirmed. See the curriculum above for topics.]',
  },
]

export default function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <SectionHeading label="12 / Questions">FAQ</SectionHeading>
        <Accordion items={QUESTIONS} className="faq-list" itemClassName="glass g1" />
      </div>
    </section>
  )
}

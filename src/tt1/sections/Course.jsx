import Reveal from '../shared/Reveal.jsx'
import Accordion from '../components/Accordion.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const MODULES = [
  { title: 'Trading foundations', body: 'How markets work, key terms and the tools used throughout the course.' },
  { title: 'Market structure', body: 'Reading trends, ranges, swing points and context across timeframes.' },
  { title: 'Price action', body: 'Reading candles and levels without a stack of indicators.' },
  { title: 'Trade setups', body: 'Defined setups, entry criteria and deciding what to skip.' },
  { title: 'Risk management', body: 'Position sizing, stop placement and planning for losing trades.' },
  { title: 'Trading psychology', body: 'Discipline, routines and handling emotion under pressure.' },
]

// Bridge from the free session to the paid course, followed by the curriculum.
export default function Course() {
  return (
    <section className="intro">
      <div className="wrap">
        <SectionHeading label="07 / Beyond the session">The masterclass is only the beginning.</SectionHeading>
        <Reveal as="p" className="lead shade">
          The webinar introduces the framework. The complete Trade Bit course gives you the structured learning path to
          practise it, step by step. No pressure: attend first and decide after.
        </Reveal>
        <Reveal className="flow shade">
          <span>Free masterclass</span>
          <i aria-hidden="true" />
          <span>Full course</span>
        </Reveal>
        <Reveal className="glass curr-list" id="curriculum">
          <Accordion items={MODULES} numbered />
        </Reveal>
      </div>
    </section>
  )
}

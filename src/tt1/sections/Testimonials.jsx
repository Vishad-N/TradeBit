import { useRef } from 'react'
import { cx } from '../shared/utils.js'
import SectionHeading from '../components/SectionHeading.jsx'

const CARD_GAP = 14

// Placeholders until real, approved student quotes are available. The first card is featured.
const TESTIMONIALS = [1, 2, 3, 4].map((n) => ({
  id: `00${n}`,
  quote: 'Student testimonial goes here.',
  name: '[Student name]',
  detail: '[Trader / experience]',
}))

export default function Testimonials() {
  const scrollerRef = useRef(null)

  const step = (direction) => {
    const scroller = scrollerRef.current
    const card = scroller.querySelector('.tcard')
    scroller.scrollBy({ left: direction * (card.offsetWidth + CARD_GAP), behavior: 'smooth' })
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') step(1)
    if (e.key === 'ArrowLeft') step(-1)
  }

  return (
    <section>
      <div className="wrap">
        <SectionHeading label="09 / Student voices">What our students say</SectionHeading>
        <div
          className="tscroll"
          ref={scrollerRef}
          tabIndex={0}
          role="region"
          aria-label="Student testimonials, swipe or use arrow keys"
          onKeyDown={onKeyDown}
        >
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.id} className={cx('glass tcard', i === 0 ? 'lg' : 'g1')}>
              <span className="case">CASE / {t.id}</span>
              <q>{t.quote}</q>
              <cite>
                <b>{t.name}</b>
                <span>{t.detail}</span>
              </cite>
            </figure>
          ))}
        </div>
        <div className="tctl">
          <button type="button" aria-label="Previous testimonial" onClick={() => step(-1)}>
            ←
          </button>
          <button type="button" aria-label="Next testimonial" onClick={() => step(1)}>
            →
          </button>
        </div>
      </div>
    </section>
  )
}

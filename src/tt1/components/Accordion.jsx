import { useId, useState } from 'react'
import { cx } from '../shared/utils.js'

// One-open-at-a-time disclosure list, used by the curriculum and the FAQ.
// items: [{ title, body }]. `numbered` prefixes each row with 01, 02…
// `itemClassName` lets the FAQ give each row its own glass panel.
export default function Accordion({ items, numbered = false, className, itemClassName }) {
  const [openIndex, setOpenIndex] = useState(-1)
  const baseId = useId()

  return (
    <div className={className}>
      {items.map((item, i) => {
        const open = i === openIndex
        const buttonId = `${baseId}-b${i}`
        const panelId = `${baseId}-p${i}`
        return (
          <div key={item.title} className={cx(itemClassName, 'acc-item', open && 'open')}>
            <button
              type="button"
              className="acc-btn"
              id={buttonId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? -1 : i)}
            >
              {numbered && <span className="n">{String(i + 1).padStart(2, '0')}</span>}
              <span className="t">{item.title}</span>
              <span className="pm" aria-hidden="true" />
            </button>
            {/* inert keeps collapsed text out of the tab order and screen-reader browse mode
                while the panel still animates closed via grid-template-rows */}
            <div className="acc-panel" id={panelId} role="region" aria-labelledby={buttonId} inert={!open}>
              <div>
                <p>{item.body}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

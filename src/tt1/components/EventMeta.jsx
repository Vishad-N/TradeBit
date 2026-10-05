import { Fragment } from 'react'
import { cx } from '../shared/utils.js'

// Dot-separated event facts, e.g. LIVE • ONLINE • 90 MIN.
export default function EventMeta({ items, className }) {
  return (
    <div className={cx('meta', className)}>
      {items.map((item, i) => (
        <Fragment key={item}>
          {i > 0 && <i aria-hidden="true">•</i>}
          <span>{item}</span>
        </Fragment>
      ))}
    </div>
  )
}

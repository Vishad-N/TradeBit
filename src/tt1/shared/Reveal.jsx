import { useRef } from 'react'
import { useInView } from './useInView.js'
import { cx } from './utils.js'

// Fades/slides its content in the first time it scrolls into view (.rv → .rv.in).
export default function Reveal({ as: Tag = 'div', className, delay, style, children, ...rest }) {
  const ref = useRef(null)
  const inView = useInView(ref)
  return (
    <Tag
      ref={ref}
      className={cx(className, 'rv', inView && 'in')}
      style={delay ? { ...style, '--d': delay } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

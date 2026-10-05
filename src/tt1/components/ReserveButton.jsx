import { cx } from '../shared/utils.js'

// Primary conversion link; every one on the page points at the registration form.
export default function ReserveButton({ children, className, block = false, ...rest }) {
  return (
    <a className={cx('btn', block && 'block', className)} href="#register" {...rest}>
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}

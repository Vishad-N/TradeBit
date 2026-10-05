export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const cx = (...classes) => classes.filter(Boolean).join(' ')

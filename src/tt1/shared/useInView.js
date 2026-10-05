import { useEffect, useState } from 'react'

export const REVEAL_OPTIONS = { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }

// Becomes true the first time the element intersects, then stops observing.
// Pass a module-level options object so the observer is not recreated each render.
export function useInView(ref, options = REVEAL_OPTIONS) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, options])

  return inView
}

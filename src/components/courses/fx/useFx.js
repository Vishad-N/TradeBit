import { useEffect, useState } from 'react';

/** Whether heavy visuals (WebGL, large animations) are appropriate: wide screen, no reduced-motion, no data-saver. */
export function useRichFx() {
  const [rich, setRich] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const save = navigator.connection?.saveData;
    const upd = () => setRich(wide.matches && !calm.matches && !save);
    upd();
    wide.addEventListener('change', upd);
    calm.addEventListener('change', upd);
    return () => { wide.removeEventListener('change', upd); calm.removeEventListener('change', upd); };
  }, []);
  return rich;
}

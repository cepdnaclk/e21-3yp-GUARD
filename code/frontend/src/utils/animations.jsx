import { useEffect, useRef, useState } from 'react';

/**
 * Reusable scroll-reveal wrapper using IntersectionObserver.
 * Wraps children and animates them into view when they enter the viewport.
 *
 * Props:
 *   direction: 'up' | 'left' | 'right' | 'scale'  (default: 'up')
 *   delay:     number in ms (default: 0)
 *   className: extra class to pass through
 */
export function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dirClass = {
    up:    'reveal-up',
    left:  'reveal-left',
    right: 'reveal-right',
    scale: 'reveal-scale',
  }[direction] || 'reveal-up';

  return (
    <div
      ref={ref}
      className={`reveal-wrapper ${dirClass} ${visible ? 'revealed' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

/**
 * Thin glowing scroll-progress bar fixed to the very top of the page.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div className="scroll-progress-bar" style={{ width: `${progress}%` }} />;
}

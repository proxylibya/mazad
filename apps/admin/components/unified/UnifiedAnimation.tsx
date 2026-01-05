'use client';

import { useRouter } from 'next/router';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface BaseAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const MOTION = {
  duration: {
    fast: 150,
    normal: 260,
    slow: 420,
    slower: 560,
  },
  easing: {
    standard: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    soft: 'cubic-bezier(0.19, 1, 0.22, 1)',
  },
};

interface PageTransitionProps extends BaseAnimationProps {}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let rafId = window.requestAnimationFrame(() => setVisible(true));

    const handleStart = () => {
      setVisible(false);
    };

    const handleDone = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => setVisible(true));
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);

    return () => {
      window.cancelAnimationFrame(rafId);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router.events]);

  const base = 'min-h-screen transition-opacity will-change-opacity';
  const state = visible ? 'opacity-100' : 'opacity-0';

  return (
    <div
      className={`${base} ${state} ${className}`}
      style={{
        transitionDuration: `${MOTION.duration.slower}ms`,
        transitionTimingFunction: MOTION.easing.soft,
      }}
    >
      {children}
    </div>
  );
}

interface AnimatedSectionProps extends BaseAnimationProps {
  once?: boolean;
}

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  once = true,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [once]);

  const base = 'transform transition-all will-change-transform will-change-opacity';
  const state = visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${MOTION.duration.slow}ms`,
        transitionTimingFunction: MOTION.easing.standard,
      }}
      className={`${base} ${state} ${className}`}
    >
      {children}
    </div>
  );
}

interface AnimatedPresenceProps extends BaseAnimationProps {
  show: boolean;
  variant?: 'pop' | 'fade';
  duration?: keyof typeof MOTION.duration;
}

export function AnimatedPresence({
  show,
  children,
  className = '',
  delay = 0,
  variant = 'pop',
  duration = 'normal',
}: AnimatedPresenceProps) {
  const durationMs = MOTION.duration[duration];
  const [rendered, setRendered] = useState(show);

  useEffect(() => {
    if (show) {
      setRendered(true);
      return;
    }

    const timeout = setTimeout(() => setRendered(false), durationMs);

    return () => clearTimeout(timeout);
  }, [show, durationMs]);

  const base = variant === 'fade' ? 'transition-opacity' : 'transform transition-all';
  const state =
    variant === 'fade'
      ? show
        ? 'opacity-100'
        : 'pointer-events-none opacity-0'
      : show
        ? 'opacity-100 scale-100 translate-y-0'
        : 'pointer-events-none opacity-0 scale-95 translate-y-1';

  if (!rendered && !show) {
    return null;
  }

  return (
    <div
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: MOTION.easing.standard,
      }}
      className={`${base} ${state} ${className}`}
    >
      {children}
    </div>
  );
}

export function RouteProgressBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };

    const handleStart = () => {
      clearTimers();
      setActive(true);
      setProgress(12);

      intervalRef.current = window.setInterval(() => {
        setProgress((p) => {
          const next = p + Math.max(1, (96 - p) * 0.06);
          return next >= 88 ? 88 : next;
        });
      }, 180);
    };

    const handleDone = () => {
      clearTimers();
      setProgress(100);
      finishTimeoutRef.current = window.setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 260);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);

    return () => {
      clearTimers();
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router.events]);

  return (
    <div className={`pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-0.5 ${className}`}>
      <div
        className="ml-auto h-full bg-gradient-to-l from-blue-500 via-indigo-500 to-cyan-400"
        style={{
          width: `${progress}%`,
          opacity: active ? 1 : 0,
          transitionProperty: 'width, opacity',
          transitionDuration: `${MOTION.duration.fast}ms`,
          transitionTimingFunction: MOTION.easing.standard,
        }}
      />
    </div>
  );
}

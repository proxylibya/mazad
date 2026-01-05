import { PageTransition, RouteProgressBar } from '@/components/unified';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Cairo } from 'next/font/google';

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-cairo: ${cairo.style.fontFamily};
        }
      `}</style>
      <RouteProgressBar />
      <PageTransition>
        <Component {...pageProps} />
      </PageTransition>
    </>
  );
}

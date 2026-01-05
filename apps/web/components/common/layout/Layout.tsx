import React from 'react';
import Head from 'next/head';
import OpensooqNavbar from './OpensooqNavbar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'سوق المزاد',
  description = 'منصة المزادات الأولى في ليبيا',
  keywords = 'مزاد سيارات, سيارات للبيع, سيارات ليبيا, مزادات السيارات, سوق السيارات',
  className = '',
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`min-h-screen bg-gray-50 ${className}`} dir="rtl">
        <OpensooqNavbar />
        <main>{children}</main>
      </div>
    </>
  );
};

export default Layout;

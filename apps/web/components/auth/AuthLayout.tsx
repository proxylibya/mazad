import UserIcon from '@heroicons/react/24/outline/UserIcon';
import Head from 'next/head';
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  pageTitle?: string;
  description?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  pageTitle = 'سوق المزاد',
  description = 'منصة المزادات الأولى في ليبيا',
}) => {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="auth-page" dir="rtl">
        <div className="auth-container">
          {/* الشعار والعنوان */}
          <div className="mb-6 text-center">
            <div className="auth-logo">
              <UserIcon className="h-7 w-7 text-white" />
            </div>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          {/* المحتوى */}
          <div className="auth-card">{children}</div>
        </div>
      </div>
    </>
  );
};

export default AuthLayout;

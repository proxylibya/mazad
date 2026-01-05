/**
 * صفحة الإعدادات العامة
 */
import {
  BellIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface Settings {
  currency: string;
  language: string;
  timezone: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface BrandingSettings {
  logoType: 'text' | 'image';
  logoImageUrl: string;
  siteName: string;
  siteDescription: string;
  showLogoInNavbar: boolean;
  showSiteNameInNavbar: boolean;
}

type ThemeMode = 'light' | 'dark' | 'system';
type AnimationMode = 'normal' | 'disabled';
type LayoutWidth = 'normal' | 'wide' | 'full';
type FontScale = 'sm' | 'md' | 'lg';

interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  animations?: AnimationMode;
  textColor?: string;
  fontScale?: FontScale;
  layoutWidth?: LayoutWidth;
}

interface SecuritySettings {
  login: {
    maxLoginAttempts: number;
    lockoutMinutes: number;
    requireTwoFactorForAdmins: boolean;
    allowRememberDevice: boolean;
    loginAlerts: boolean;
  };
  password: {
    minLength: number;
    requireLowercase: boolean;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    expiryEnabled: boolean;
    expiryDays: number;
  };
  session: {
    adminSessionHours: number;
    idleTimeoutMinutes: number;
    maxConcurrentSessions: number;
    notifyOnNewDevice: boolean;
  };
  monitoring: {
    failedLoginAlertThreshold: number;
    suspiciousActivityThreshold: number;
    autoBlockIp: boolean;
    autoBlockIpThreshold: number;
  };
}

interface SiteTeamSettings {
  enabled: boolean;
  userId: string;
  teamName: string;
  phones: string[];
  whatsappPhone: string;
  allowCalls: boolean;
  allowMessages: boolean;
}

type ConfirmActionType =
  | 'maintenance'
  | 'registration'
  | 'securityDefaults'
  | 'autoBlockIp'
  | 'twoFactorAdmins';

interface ConfirmState {
  type: ConfirmActionType;
  nextValue?: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  currency: 'LYD',
  language: 'ar',
  timezone: 'Africa/Tripoli',
  maintenanceMode: false,
  registrationEnabled: true,
  emailNotifications: true,
  smsNotifications: true,
};

const DEFAULT_BRANDING: BrandingSettings = {
  logoType: 'text',
  logoImageUrl: '',
  siteName: 'سوق المزاد',
  siteDescription: 'منصة المزادات الأولى في ليبيا',
  showLogoInNavbar: true,
  showSiteNameInNavbar: true,
};

const DEFAULT_THEME: ThemeSettings = {
  mode: 'system',
  primaryColor: '',
  backgroundColor: '',
  accentColor: '',
  animations: 'normal',
  textColor: '',
  fontScale: 'md',
  layoutWidth: 'normal',
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  login: {
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    requireTwoFactorForAdmins: true,
    allowRememberDevice: true,
    loginAlerts: true,
  },
  password: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: true,
    expiryEnabled: false,
    expiryDays: 90,
  },
  session: {
    adminSessionHours: 8,
    idleTimeoutMinutes: 30,
    maxConcurrentSessions: 5,
    notifyOnNewDevice: true,
  },
  monitoring: {
    failedLoginAlertThreshold: 5,
    suspiciousActivityThreshold: 10,
    autoBlockIp: true,
    autoBlockIpThreshold: 10,
  },
};

const DEFAULT_SITE_TEAM_SETTINGS: SiteTeamSettings = {
  enabled: false,
  userId: 'site_team',
  teamName: 'فريق مزاد',
  phones: [],
  whatsappPhone: '',
  allowCalls: true,
  allowMessages: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [siteTeam, setSiteTeam] = useState<SiteTeamSettings>(DEFAULT_SITE_TEAM_SETTINGS);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  let confirmTitle = '';
  let confirmMessage = '';

  if (confirmState) {
    if (confirmState.type === 'maintenance') {
      if (confirmState.nextValue) {
        confirmTitle = 'تأكيد تفعيل وضع الصيانة';
        confirmMessage =
          'سيتم إيقاف الموقع مؤقتاً للمستخدمين العاديين وقد تتوقف بعض العمليات. هل أنت متأكد من تفعيل وضع الصيانة؟';
      } else {
        confirmTitle = 'تأكيد إلغاء وضع الصيانة';
        confirmMessage =
          'سيعود الموقع للعمل بشكل طبيعي لجميع المستخدمين. هل تريد إلغاء وضع الصيانة؟';
      }
    } else if (confirmState.type === 'registration') {
      if (confirmState.nextValue) {
        confirmTitle = 'تفعيل التسجيل الجديد';
        confirmMessage =
          'سيتم السماح للمستخدمين الجدد بإنشاء حسابات في الموقع. هل تريد تفعيل التسجيل الجديد؟';
      } else {
        confirmTitle = 'إيقاف التسجيل الجديد';
        confirmMessage =
          'لن يتمكن أي مستخدم جديد من إنشاء حساب حتى تعيد تفعيل التسجيل. هل أنت متأكد من إيقاف التسجيل؟';
      }
    } else if (confirmState.type === 'twoFactorAdmins') {
      if (confirmState.nextValue) {
        confirmTitle = 'تفعيل إلزام التحقق الثنائي';
        confirmMessage =
          'سيُطلب من جميع المديرين إعداد التحقق الثنائي عند تسجيل الدخول. قد يحتاج بعضهم إلى خطوات إضافية لإكمال الإعداد. هل تريد المتابعة؟';
      } else {
        confirmTitle = 'تعطيل إلزام التحقق الثنائي';
        confirmMessage =
          'تعطيل هذا الخيار يقلل من مستوى أمان حسابات المديرين ويزيد من خطر الاختراق. يوصى بتركه مفعلاً. هل تريد المتابعة؟';
      }
    } else if (confirmState.type === 'autoBlockIp') {
      if (confirmState.nextValue) {
        confirmTitle = 'تفعيل الحظر التلقائي لعناوين IP';
        confirmMessage =
          'سيتم حظر عناوين IP التي تتجاوز العتبات المحددة. قد يتم حظر بعض المستخدمين الشرعيين إذا تم اعتبار نشاطهم مشبوهاً. تأكد من ضبط العتبات بشكل صحيح. هل تريد المتابعة؟';
      } else {
        confirmTitle = 'تعطيل الحظر التلقائي لعناوين IP';
        confirmMessage =
          'تعطيل هذا الخيار قد يقلل من حماية النظام ضد محاولات الاختراق والهجمات الآلية. هل تريد المتابعة؟';
      }
    } else if (confirmState.type === 'securityDefaults') {
      confirmTitle = 'استعادة إعدادات الأمان الافتراضية';
      confirmMessage =
        'سيتم إعادة تعيين جميع إعدادات الأمان (تسجيل الدخول، كلمات المرور، الجلسات، المراقبة) إلى القيم الافتراضية. لن يتم حفظ التغييرات في النظام إلا بعد الضغط على زر "حفظ التغييرات". هل تريد المتابعة؟';
    }
  }

  const handleConfirmDangerousAction = () => {
    if (!confirmState) return;
    if (confirmState.type === 'maintenance') {
      setSettings((prev) => ({
        ...prev,
        maintenanceMode:
          confirmState.nextValue === undefined ? prev.maintenanceMode : confirmState.nextValue,
      }));
    } else if (confirmState.type === 'registration') {
      setSettings((prev) => ({
        ...prev,
        registrationEnabled:
          confirmState.nextValue === undefined ? prev.registrationEnabled : confirmState.nextValue,
      }));
    } else if (confirmState.type === 'twoFactorAdmins') {
      setSecuritySettings((prev) => ({
        ...prev,
        login: {
          ...prev.login,
          requireTwoFactorForAdmins:
            confirmState.nextValue === undefined
              ? prev.login.requireTwoFactorForAdmins
              : confirmState.nextValue,
        },
      }));
    } else if (confirmState.type === 'autoBlockIp') {
      setSecuritySettings((prev) => ({
        ...prev,
        monitoring: {
          ...prev.monitoring,
          autoBlockIp:
            confirmState.nextValue === undefined
              ? prev.monitoring.autoBlockIp
              : confirmState.nextValue,
        },
      }));
    } else if (confirmState.type === 'securityDefaults') {
      setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
    }
    setConfirmState(null);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/admin/site-branding');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings) {
          setBranding((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
      } catch {}
    };
    const fetchSecuritySettings = async () => {
      try {
        const res = await fetch('/api/admin/security/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.settings) return;
        const incoming = data.settings as Partial<SecuritySettings>;
        setSecuritySettings((prev) => ({
          login: {
            ...prev.login,
            ...(incoming.login || {}),
          },
          password: {
            ...prev.password,
            ...(incoming.password || {}),
          },
          session: {
            ...prev.session,
            ...(incoming.session || {}),
          },
          monitoring: {
            ...prev.monitoring,
            ...(incoming.monitoring || {}),
          },
        }));
      } catch {}
    };
    const fetchTheme = async () => {
      try {
        const res = await fetch('/api/admin/site-theme');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings) {
          setTheme((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
      } catch {}
    };
    const fetchSiteTeam = async () => {
      try {
        const res = await fetch('/api/admin/site-team');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings) {
          setSiteTeam((prev) => ({
            ...prev,
            ...data.settings,
          }));
        }
      } catch {}
    };
    fetchBranding();
    fetchTheme();
    fetchSecuritySettings();
    fetchSiteTeam();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/admin/site-branding', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(branding),
        }),
        fetch('/api/admin/site-theme', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(theme),
        }),
        fetch('/api/admin/security/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(securitySettings),
        }),
        fetch('/api/admin/site-team', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(siteTeam),
        }),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      alert('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setBranding(DEFAULT_BRANDING);
    setTheme(DEFAULT_THEME);
    setSecuritySettings(DEFAULT_SECURITY_SETTINGS);
    setSiteTeam(DEFAULT_SITE_TEAM_SETTINGS);
  };

  const tabs = [
    { id: 'general', label: 'عام', icon: Cog6ToothIcon },
    { id: 'appearance', label: 'المظهر', icon: PaintBrushIcon },
    { id: 'notifications', label: 'الإشعارات', icon: BellIcon },
    { id: 'security', label: 'الأمان', icon: ShieldCheckIcon },
    { id: 'localization', label: 'اللغة والمنطقة', icon: GlobeAltIcon },
    { id: 'site-team', label: 'فريق الموقع', icon: UserGroupIcon },
  ];

  return (
    <AdminLayout title="الإعدادات">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl border border-slate-700 bg-slate-800 p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">الإعدادات العامة</h3>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      اسم الموقع
                    </label>
                    <input
                      type="text"
                      value={branding.siteName}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          siteName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      وصف الموقع
                    </label>
                    <textarea
                      value={branding.siteDescription}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          siteDescription: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setBranding({
                          ...branding,
                          logoType: 'text',
                        })
                      }
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        branding.logoType === 'text'
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-200'
                      }`}
                    >
                      شعار نصي
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBranding({
                          ...branding,
                          logoType: 'image',
                        })
                      }
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        branding.logoType === 'image'
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-slate-600 bg-slate-700 text-slate-200'
                      }`}
                    >
                      شعار صورة
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={branding.showLogoInNavbar}
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            showLogoInNavbar: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      إظهار الشعار في الشريط العلوي
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={branding.showSiteNameInNavbar}
                        onChange={(e) =>
                          setBranding({
                            ...branding,
                            showSiteNameInNavbar: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      إظهار اسم الموقع بجانب الشعار
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-300">معاينة الشعار</p>

                  <div className="flex flex-col gap-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-900">
                      {branding.logoType === 'image' && branding.logoImageUrl ? (
                        <img
                          src={`/api/proxy/images?path=${encodeURIComponent(
                            branding.logoImageUrl.replace(/^\//, ''),
                          )}`}
                          alt={branding.siteName}
                          className="h-14 w-14 rounded object-contain"
                        />
                      ) : (
                        <span className="text-lg font-bold text-blue-500">
                          {branding.siteName.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-base font-semibold text-white">{branding.siteName}</p>
                      <p className="text-xs text-slate-400">
                        الشعار كما يظهر في شريط التنقل في الموقع الرئيسي
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="mb-1 block text-sm font-medium text-slate-300">
                      رفع شعار جديد
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLogoUploading(true);
                        try {
                          const formData = new FormData();
                          formData.append('image', file);
                          const res = await fetch('/api/admin/upload/site-logo', {
                            method: 'POST',
                            body: formData,
                          });
                          const data = await res.json();
                          if (data?.success && data.fileUrl) {
                            setBranding({
                              ...branding,
                              logoType: 'image',
                              logoImageUrl: data.fileUrl,
                            });
                          } else {
                            alert('فشل رفع الشعار');
                          }
                        } catch {
                          alert('حدث خطأ أثناء رفع الشعار');
                        } finally {
                          setLogoUploading(false);
                        }
                      }}
                      className="block w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                    />
                    <p className="text-xs text-slate-400">
                      يدعم جميع صيغ الصور الشائعة مع حجم حتى 5 ميجابايت
                    </p>
                  </div>

                  {branding.logoImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setBranding({
                          ...branding,
                          logoImageUrl: '',
                          logoType: 'text',
                        })
                      }
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      إزالة الشعار الحالي والرجوع للشعار النصي
                    </button>
                  )}

                  {logoUploading && <p className="text-xs text-blue-400">جاري رفع الشعار...</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">وضع الصيانة</p>
                    <p className="text-sm text-slate-400">إيقاف الموقع مؤقتاً للصيانة</p>
                  </div>
                  <button
                    onClick={() =>
                      setConfirmState({
                        type: 'maintenance',
                        nextValue: !settings.maintenanceMode,
                      })
                    }
                    className={`relative h-6 w-11 self-start rounded-full transition-colors md:self-end ${
                      settings.maintenanceMode ? 'bg-red-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings.maintenanceMode ? 'right-0.5' : 'right-5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">التسجيل الجديد</p>
                    <p className="text-sm text-slate-400">السماح بتسجيل مستخدمين جدد</p>
                  </div>
                  <button
                    onClick={() =>
                      setConfirmState({
                        type: 'registration',
                        nextValue: !settings.registrationEnabled,
                      })
                    }
                    className={`relative h-6 w-11 self-start rounded-full transition-colors md:self-end ${
                      settings.registrationEnabled ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings.registrationEnabled ? 'right-0.5' : 'right-5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'site-team' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-white">فريق الموقع</h3>
                <a
                  href="/admin/site-team/inbox"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
                >
                  صندوق الوارد
                </a>
              </div>

              <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={siteTeam.enabled}
                    onChange={(e) => setSiteTeam({ ...siteTeam, enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                  />
                  تفعيل فريق الموقع
                </label>
                <p className="mt-2 text-xs text-slate-400">
                  المعرّف الثابت للحساب:{' '}
                  <span className="font-mono text-slate-200">{siteTeam.userId}</span>
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      اسم الفريق
                    </label>
                    <input
                      type="text"
                      value={siteTeam.teamName}
                      onChange={(e) => setSiteTeam({ ...siteTeam, teamName: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      أرقام الهاتف (سطر لكل رقم)
                    </label>
                    <textarea
                      value={(siteTeam.phones || []).join('\n')}
                      onChange={(e) =>
                        setSiteTeam({
                          ...siteTeam,
                          phones: e.target.value
                            .split(/\r?\n/)
                            .map((p) => p.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={5}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      رقم واتساب
                    </label>
                    <input
                      type="text"
                      value={siteTeam.whatsappPhone}
                      onChange={(e) => setSiteTeam({ ...siteTeam, whatsappPhone: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                    <p className="mb-3 text-sm font-medium text-white">خيارات التواصل</p>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={siteTeam.allowCalls}
                          onChange={(e) =>
                            setSiteTeam({ ...siteTeam, allowCalls: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                        />
                        السماح بالمكالمات
                      </label>

                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={siteTeam.allowMessages}
                          onChange={(e) =>
                            setSiteTeam({ ...siteTeam, allowMessages: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                        />
                        السماح بالرسائل
                      </label>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                    <p className="text-sm font-medium text-white">ملاحظة</p>
                    <p className="mt-2 text-sm text-slate-400">
                      عند اختيار “منشور بواسطة فريق مزاد” أثناء إنشاء إعلان، سيتم ربط الإعلان بحساب
                      فريق الموقع.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">إعدادات الإشعارات</h3>

              <div className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                <div>
                  <p className="font-medium text-white">إشعارات البريد الإلكتروني</p>
                  <p className="text-sm text-slate-400">إرسال إشعارات عبر البريد</p>
                </div>
                <button
                  onClick={() =>
                    setSettings({ ...settings, emailNotifications: !settings.emailNotifications })
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.emailNotifications ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      settings.emailNotifications ? 'right-0.5' : 'right-5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                <div>
                  <p className="font-medium text-white">إشعارات الرسائل القصيرة</p>
                  <p className="text-sm text-slate-400">إرسال إشعارات عبر SMS</p>
                </div>
                <button
                  onClick={() =>
                    setSettings({ ...settings, smsNotifications: !settings.smsNotifications })
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.smsNotifications ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      settings.smsNotifications ? 'right-0.5' : 'right-5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">اللغة والمنطقة</h3>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">العملة</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="LYD">دينار ليبي (LYD)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">اللغة</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  المنطقة الزمنية
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Africa/Tripoli">طرابلس (GMT+2)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">إعدادات المظهر</h3>

              <div className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-300">وضع المظهر</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="theme-mode"
                          value="system"
                          checked={theme.mode === 'system'}
                          onChange={() =>
                            setTheme({
                              ...theme,
                              mode: 'system',
                            })
                          }
                          className="h-4 w-4 text-blue-500"
                        />
                        حسب إعداد النظام (System)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="theme-mode"
                          value="light"
                          checked={theme.mode === 'light'}
                          onChange={() =>
                            setTheme({
                              ...theme,
                              mode: 'light',
                            })
                          }
                          className="h-4 w-4 text-blue-500"
                        />
                        وضع نهاري (فاتح)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="theme-mode"
                          value="dark"
                          checked={theme.mode === 'dark'}
                          onChange={() =>
                            setTheme({
                              ...theme,
                              mode: 'dark',
                            })
                          }
                          className="h-4 w-4 text-blue-500"
                        />
                        وضع ليلي (داكن)
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        اللون الأساسي
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-none">
                          <div
                            className="absolute inset-0 rounded border border-slate-600"
                            style={{
                              backgroundColor: theme.primaryColor || '#2563eb',
                            }}
                          />
                          <input
                            type="color"
                            value={theme.primaryColor || '#2563eb'}
                            onChange={(e) =>
                              setTheme({
                                ...theme,
                                primaryColor: e.target.value,
                              })
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={theme.primaryColor}
                          onChange={(e) =>
                            setTheme({
                              ...theme,
                              primaryColor: e.target.value,
                            })
                          }
                          placeholder="#2563eb"
                          className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        لون الخلفية
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-none">
                          <div
                            className="absolute inset-0 rounded border border-slate-600"
                            style={{
                              backgroundColor: theme.backgroundColor || '#0f172a',
                            }}
                          />
                          <input
                            type="color"
                            value={theme.backgroundColor || '#0f172a'}
                            onChange={(e) =>
                              setTheme({
                                ...theme,
                                backgroundColor: e.target.value,
                              })
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={theme.backgroundColor}
                          onChange={(e) =>
                            setTheme({
                              ...theme,
                              backgroundColor: e.target.value,
                            })
                          }
                          placeholder="#0f172a"
                          className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        لون العناصر البارزة
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-none">
                          <div
                            className="absolute inset-0 rounded border border-slate-600"
                            style={{
                              backgroundColor: theme.accentColor || '#f97316',
                            }}
                          />
                          <input
                            type="color"
                            value={theme.accentColor || '#f97316'}
                            onChange={(e) =>
                              setTheme({
                                ...theme,
                                accentColor: e.target.value,
                              })
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        <input
                          type="text"
                          value={theme.accentColor}
                          onChange={(e) =>
                            setTheme({
                              ...theme,
                              accentColor: e.target.value,
                            })
                          }
                          placeholder="#f97316"
                          className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-300">الحركات والانتقالات</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="animations"
                          value="normal"
                          checked={(theme.animations || 'normal') === 'normal'}
                          onChange={() =>
                            setTheme({
                              ...theme,
                              animations: 'normal',
                            })
                          }
                          className="h-4 w-4 text-blue-500"
                        />
                        حركات افتراضية سلسة
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="animations"
                          value="disabled"
                          checked={theme.animations === 'disabled'}
                          onChange={() =>
                            setTheme({
                              ...theme,
                              animations: 'disabled',
                            })
                          }
                          className="h-4 w-4 text-blue-500"
                        />
                        تعطيل جميع الحركات لتحسين الأداء
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        لون النص الأساسي
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={theme.textColor || '#e5e7eb'}
                          onChange={(e) =>
                            setTheme({
                              ...theme,
                              textColor: e.target.value,
                            })
                          }
                          className="h-10 w-10 cursor-pointer rounded border border-slate-600 bg-slate-700"
                        />
                        <input
                          type="text"
                          value={theme.textColor}
                          onChange={(e) =>
                            setTheme({
                              ...theme,
                              textColor: e.target.value,
                            })
                          }
                          placeholder="#e5e7eb"
                          className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-300">حجم النص العام</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setTheme({
                              ...theme,
                              fontScale: 'sm',
                            })
                          }
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                            theme.fontScale === 'sm'
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-200'
                          }`}
                        >
                          صغير
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTheme({
                              ...theme,
                              fontScale: 'md',
                            })
                          }
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                            theme.fontScale === 'md'
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-200'
                          }`}
                        >
                          افتراضي
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTheme({
                              ...theme,
                              fontScale: 'lg',
                            })
                          }
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                            theme.fontScale === 'lg'
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-600 bg-slate-700 text-slate-200'
                          }`}
                        >
                          كبير
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-300">عرض محتوى الصفحات</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          setTheme({
                            ...theme,
                            layoutWidth: 'normal',
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                          theme.layoutWidth === 'normal'
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-200'
                        }`}
                      >
                        افتراضي
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTheme({
                            ...theme,
                            layoutWidth: 'wide',
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                          theme.layoutWidth === 'wide'
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-200'
                        }`}
                      >
                        عريض
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTheme({
                            ...theme,
                            layoutWidth: 'full',
                          })
                        }
                        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                          theme.layoutWidth === 'full'
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-600 bg-slate-700 text-slate-200'
                        }`}
                      >
                        عرض كامل
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-300">معاينة المظهر</p>
                  <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-4">
                    <div
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: theme.backgroundColor || '#0f172a',
                      }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: theme.primaryColor || '#2563eb',
                            }}
                          >
                            <span className="text-sm font-bold text-white">SM</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">سوق المزاد</p>
                            <p className="text-xs text-slate-300">مثال لشريط التنقل الرئيسي</p>
                          </div>
                        </div>
                        <button
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{
                            borderColor: theme.accentColor || '#f97316',
                            color: theme.accentColor || '#f97316',
                          }}
                        >
                          زر رئيسي
                        </button>
                      </div>

                      <div className="space-y-2 rounded-lg bg-slate-800/70 p-3">
                        <div className="h-3 w-32 rounded bg-slate-600" />
                        <div className="h-2 w-24 rounded bg-slate-700" />
                        <div className="mt-3 flex gap-2">
                          <div
                            className="h-9 flex-1 rounded-lg"
                            style={{
                              background:
                                theme.primaryColor && theme.accentColor
                                  ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`
                                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            }}
                          />
                          <div className="h-9 w-24 rounded-lg bg-slate-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    هذه المعاينة توضح تأثير الإعدادات على الألوان الأساسية في الموقع.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">إعدادات الأمان المتقدمة</h3>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'securityDefaults',
                    })
                  }
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-700"
                >
                  استعادة إعدادات الأمان الافتراضية
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">أمان تسجيل الدخول</p>
                    <p className="text-sm text-slate-400">
                      التحكم في سياسة المحاولات الفاشلة وطلب التحقق الثنائي
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        الحد الأقصى لمحاولات تسجيل الدخول
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={securitySettings.login.maxLoginAttempts}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            login: {
                              ...prev.login,
                              maxLoginAttempts: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        مدة حظر الحساب (دقائق)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={securitySettings.login.lockoutMinutes}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            login: {
                              ...prev.login,
                              lockoutMinutes: Number(e.target.value) || 5,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm text-slate-200">
                      <span>إلزام التحقق الثنائي لجميع المديرين</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            type: 'twoFactorAdmins',
                            nextValue: !securitySettings.login.requireTwoFactorForAdmins,
                          })
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          securitySettings.login.requireTwoFactorForAdmins
                            ? 'bg-emerald-500'
                            : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            securitySettings.login.requireTwoFactorForAdmins
                              ? 'right-0.5'
                              : 'right-5'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between text-sm text-slate-200">
                      <span>السماح بتذكر الجهاز الموثوق</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            login: {
                              ...prev.login,
                              allowRememberDevice: !prev.login.allowRememberDevice,
                            },
                          }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          securitySettings.login.allowRememberDevice
                            ? 'bg-blue-500'
                            : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            securitySettings.login.allowRememberDevice ? 'right-0.5' : 'right-5'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between text-sm text-slate-200">
                      <span>تنبيهات عند تسجيل الدخول من موقع جديد</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            login: {
                              ...prev.login,
                              loginAlerts: !prev.login.loginAlerts,
                            },
                          }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          securitySettings.login.loginAlerts ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            securitySettings.login.loginAlerts ? 'right-0.5' : 'right-5'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">سياسة كلمات المرور</p>
                    <p className="text-sm text-slate-400">
                      تحديد قوة كلمة المرور وصلاحيتها لحسابات المديرين
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        الحد الأدنى للطول
                      </label>
                      <input
                        type="number"
                        min={6}
                        max={64}
                        value={securitySettings.password.minLength}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              minLength: Number(e.target.value) || 6,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        انتهاء صلاحية كلمة المرور (أيام)
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={365}
                        disabled={!securitySettings.password.expiryEnabled}
                        value={securitySettings.password.expiryDays}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              expiryDays: Number(e.target.value) || 90,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={securitySettings.password.requireLowercase}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              requireLowercase: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      أحرف صغيرة
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={securitySettings.password.requireUppercase}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              requireUppercase: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      أحرف كبيرة
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={securitySettings.password.requireNumbers}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              requireNumbers: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      أرقام
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={securitySettings.password.requireSymbols}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              requireSymbols: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      رموز خاصة
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={securitySettings.password.expiryEnabled}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            password: {
                              ...prev.password,
                              expiryEnabled: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      تفعيل انتهاء صلاحية كلمة المرور
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">أمان الجلسات</p>
                    <p className="text-sm text-slate-400">
                      التحكم في مدة جلسة المدير وعدد الجلسات المتزامنة
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        مدة جلسة المدير (ساعات)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={securitySettings.session.adminSessionHours}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            session: {
                              ...prev.session,
                              adminSessionHours: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        مهلة خمول الجلسة (دقائق)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={securitySettings.session.idleTimeoutMinutes}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            session: {
                              ...prev.session,
                              idleTimeoutMinutes: Number(e.target.value) || 5,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        الحد الأقصى للجلسات المتزامنة لكل مدير
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={securitySettings.session.maxConcurrentSessions}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            session: {
                              ...prev.session,
                              maxConcurrentSessions: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-300">
                          تنبيه عند تسجيل الدخول من جهاز جديد
                        </p>
                        <p className="text-xs text-slate-400">
                          إرسال تنبيه أمني عند اكتشاف جهاز جديد للمدير
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            session: {
                              ...prev.session,
                              notifyOnNewDevice: !prev.session.notifyOnNewDevice,
                            },
                          }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          securitySettings.session.notifyOnNewDevice
                            ? 'bg-emerald-500'
                            : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            securitySettings.session.notifyOnNewDevice ? 'right-0.5' : 'right-5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div>
                    <p className="font-medium text-white">مراقبة الأنشطة الأمنية</p>
                    <p className="text-sm text-slate-400">
                      ضبط عتبات التنبيه والحظر التلقائي لعناوين IP عالية الخطورة
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        تنبيه بعد عدد محاولات فاشلة
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={securitySettings.monitoring.failedLoginAlertThreshold}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            monitoring: {
                              ...prev.monitoring,
                              failedLoginAlertThreshold: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        تنبيه بعد أنشطة مشبوهة
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={securitySettings.monitoring.suspiciousActivityThreshold}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            monitoring: {
                              ...prev.monitoring,
                              suspiciousActivityThreshold: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-sm text-slate-200">
                      <span>تفعيل الحظر التلقائي لعناوين IP عالية الخطورة</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            type: 'autoBlockIp',
                            nextValue: !securitySettings.monitoring.autoBlockIp,
                          })
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          securitySettings.monitoring.autoBlockIp ? 'bg-red-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            securitySettings.monitoring.autoBlockIp ? 'right-0.5' : 'right-5'
                          }`}
                        />
                      </button>
                    </label>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-300">
                        عدد الأحداث قبل الحظر التلقائي
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        disabled={!securitySettings.monitoring.autoBlockIp}
                        value={securitySettings.monitoring.autoBlockIpThreshold}
                        onChange={(e) =>
                          setSecuritySettings((prev) => ({
                            ...prev,
                            monitoring: {
                              ...prev.monitoring,
                              autoBlockIpThreshold: Number(e.target.value) || 1,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              استعادة الإعدادات الافتراضية
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmTitle}
        message={confirmMessage}
        variant="danger"
        onCancel={() => setConfirmState(null)}
        onConfirm={handleConfirmDangerousAction}
      />
    </AdminLayout>
  );
}

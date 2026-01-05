import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  EyeIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  HeartIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  StarIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { AdvancedFooter, OpensooqNavbar } from '../components/common';
import { ForwardIcon } from '../components/ui/MissingIcons';

const AboutPage = () => {
  const stats = [
    {
      number: '50+',
      label: 'مركز فحص معتمد',
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
    },
    {
      number: '15',
      label: 'دولة حول العالم',
      icon: GlobeAltIcon,
      color: 'text-green-600',
    },
    {
      number: '100,000+',
      label: 'سيارة تم فحصها',
      icon: TrophyIcon,
      color: 'text-purple-600',
    },
    {
      number: '95%',
      label: 'رضا العملاء',
      icon: HeartIcon,
      color: 'text-red-600',
    },
  ];

  const values = [
    {
      icon: ShieldCheckIcon,
      title: 'الثقة والشفافية',
      description:
        'نؤمن بأن الثقة هي أساس كل علاقة تجارية ناجحة، لذلك نلتزم بالشفافية الكاملة في جميع تعاملاتنا.',
      color: 'text-blue-600 bg-blue-100',
    },
    {
      icon: TrophyIcon,
      title: 'الجودة والتميز',
      description:
        'نسعى دائماً لتقديم أعلى معايير الجودة في خدماتنا ونعمل على التحسين المستمر لتحقيق التميز.',
      color: 'text-green-600 bg-green-100',
    },
    {
      icon: UserGroupIcon,
      title: 'خدمة العملاء',
      description:
        'العميل هو محور اهتمامنا، ونعمل على تقديم تجربة استثنائية تلبي احتياجاته وتتجاوز توقعاته.',
      color: 'text-purple-600 bg-purple-100',
    },
    {
      icon: LightBulbIcon,
      title: 'الابتكار والتطوير',
      description:
        'نستثمر في أحدث التقنيات والحلول المبتكرة لتطوير خدماتنا وتحسين تجربة المستخدمين.',
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  const team = [
    {
      name: 'أحمد محمد الصالح',
      position: 'الرئيس التنفيذي',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
      description: 'خبرة 15 سنة في صناعة السيارات والتقنيات المالية',
    },
    {
      name: 'فاطمة علي النجار',
      position: 'مديرة العمليات',
      image:
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face',
      description: 'متخصصة في إدارة العمليات وتطوير الأعمال',
    },
    {
      name: 'محمد عبدالله القاسم',
      position: 'مدير التقنية',
      image:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
      description: 'خبير في تطوير المنصات الرقمية والذكاء الاصطناعي',
    },
    {
      name: 'سارة أحمد المنصوري',
      position: 'مديرة التسويق',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
      description: 'متخصصة في التسويق الرقمي واستراتيجيات النمو',
    },
  ];

  return (
    <>
      <Head>
        <title>عنا | سوق المزاد</title>
        <meta
          name="description"
          content="تعرف على قصتنا ورؤيتنا في تطوير صناعة مزادات السيارات في ليبيا والمنطقة العربية"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="text-center">
              <h1 className="mb-6 text-4xl font-bold md:text-5xl">
                نحن نعيد تشكيل مستقبل مزادات السيارات
              </h1>
              <p className="mx-auto mb-8 max-w-3xl text-xl text-blue-100">
                منصة رائدة تجمع بين التقنيات المتطورة والخبرة العميقة لتقديم تجربة مزادات سيارات
                استثنائية وموثوقة
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-semibold text-blue-900 transition-colors hover:bg-gray-100"
              >
                تواصل معنا
                <ForwardIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`h-16 w-16 ${stat.color} mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100`}
                  >
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div className="mb-2 text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-6 text-3xl font-bold text-gray-900">قصتنا</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    بدأت رحلتنا في عام 2020 برؤية واضحة: تطوير منصة مزادات سيارات حديثة وموثوقة تخدم
                    السوق الليبي والعربي. لاحظنا الحاجة الماسة لحلول تقنية متطورة في صناعة السيارات
                    المستعملة.
                  </p>
                  <p>
                    من خلال فريق من الخبراء في التقنية وصناعة السيارات، طورنا منصة شاملة تجمع بين
                    المزادات الحية، السوق الفوري، وخدمات الفحص المعتمدة تحت سقف واحد.
                  </p>
                  <p>
                    اليوم، نفخر بكوننا المنصة الرائدة في ليبيا مع شبكة متنامية من الشركاء في المنطقة
                    العربية، ونواصل العمل على تحقيق رؤيتنا في أن نصبح المرجع الأول لمزادات السيارات
                    في المنطقة.
                  </p>
                </div>
              </div>
              <div className="relative h-96">
                <Image
                  src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="قصتنا"
                  fill
                  className="rounded-lg object-cover shadow-lg"
                />
                <div className="absolute inset-0 rounded-lg bg-blue-900/20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="bg-gray-50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center">
                  <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <EyeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">رؤيتنا</h3>
                </div>
                <p className="leading-relaxed text-gray-700">
                  أن نكون المنصة الرائدة والأكثر ثقة لمزادات السيارات في المنطقة العربية، نقدم تجربة
                  استثنائية تجمع بين التقنيات المتطورة والشفافية الكاملة، ونساهم في تطوير صناعة
                  السيارات المستعملة بمعايير عالمية.
                </p>
              </div>

              <div className="rounded-lg bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center">
                  <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                    <HandRaisedIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">رسالتنا</h3>
                </div>
                <p className="leading-relaxed text-gray-700">
                  نلتزم بتقديم منصة مزادات سيارات موثوقة وشفافة تربط بين البائعين والمشترين بطريقة
                  آمنة وفعالة. نسعى لتوفير أفضل الخدمات من خلال التقنيات المبتكرة والفحص المعتمد
                  والدعم المتميز لبناء مجتمع موثوق لتجارة السيارات.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">قيمنا</h2>
              <p className="mx-auto max-w-2xl text-gray-600">
                القيم التي نؤمن بها وتوجه عملنا في كل ما نقوم به
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`h-12 w-12 rounded-lg ${value.color} mb-4 flex items-center justify-center`}
                  >
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-gray-50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">فريقنا</h2>
              <p className="mx-auto max-w-2xl text-gray-600">
                تعرف على الفريق المتميز الذي يقود رؤيتنا ويحقق أهدافنا
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {team.map((member, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="mb-1 text-lg font-semibold text-gray-900">{member.name}</h3>
                    <p className="mb-3 font-medium text-blue-600">{member.position}</p>
                    <p className="text-sm text-gray-600">{member.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="py-16">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">إنجازاتنا</h2>
              <p className="mx-auto max-w-2xl text-gray-600">
                نفخر بالإنجازات التي حققناها في رحلتنا نحو التميز
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <TrophyIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  أول منصة مزادات رقمية في ليبيا
                </h3>
                <p className="text-sm text-gray-600">
                  رواد في تقديم حلول المزادات الرقمية المتطورة
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">شهادات الجودة الدولية</h3>
                <p className="text-sm text-gray-600">حاصلون على شهادات معتمدة في الجودة والأمان</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                  <StarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  تقييم 5 نجوم من العملاء
                </h3>
                <p className="text-sm text-gray-600">أعلى تقييمات الرضا من عملائنا الكرام</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-900 py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">انضم إلى رحلتنا</h2>
            <p className="mb-8 text-xl text-blue-100">
              كن جزءاً من مستقبل مزادات السيارات في المنطقة العربية
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-900 transition-colors hover:bg-gray-100"
              >
                ابدأ الآن
              </Link>
              <Link
                href="/partnership"
                className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-blue-900"
              >
                شراكة معنا
              </Link>
            </div>
          </div>
        </div>

        <AdvancedFooter />
      </div>
    </>
  );
};

export default AboutPage;

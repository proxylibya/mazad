import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckBadgeIcon from '@heroicons/react/24/outline/CheckBadgeIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import HandThumbDownIcon from '@heroicons/react/24/outline/HandThumbDownIcon';
import HandThumbUpIcon from '@heroicons/react/24/outline/HandThumbUpIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import TagIcon from '@heroicons/react/24/outline/TagIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Head from 'next/head';
import { useState } from 'react';
import { OpensooqNavbar } from '../components/common';
import { quickDecodeName } from '../utils/universalNameDecoder';

// دالة تنسيق التاريخ
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// نوع بيانات المراجعة للعرض
interface DisplayReview {
  id: number;
  userName: string;
  userAvatar: string;
  isVerified: boolean;
  rating: number;
  carTitle: string;
  carImage: string;
  reviewText: string;
  date: string;
  helpful: number;
  notHelpful: number;
  category: string;
  dealerName: string | null;
  verified: boolean;
  images: string[];
}

// صفحة التقييمات والمراجعات - صفحة عرض نموذجية
// ملاحظة: التقييمات الفعلية تُعرض في صفحات التفاصيل عبر مكون ReviewsAndRatings
const ReviewsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddReview, setShowAddReview] = useState(false);

  // بيانات تجريبية للعرض النموذجي
  const reviews: DisplayReview[] = [
    {
      id: 1,
      userName: 'أحمد محمد',
      userAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      isVerified: true,
      rating: 5,
      carTitle: 'تويوتا كامري 2022',
      carImage: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=300&h=200&fit=crop',
      reviewText:
        'تجربة ممتازة في الشراء من المزاد. السيارة كانت بحالة ممتازة كما هو موصوف تماماً. فريق العمل محترف جداً والتسليم كان سريع.',
      date: '2024-01-15',
      helpful: 24,
      notHelpful: 2,
      category: 'purchase',
      dealerName: 'معرض النجمة الذهبية',
      verified: true,
      images: [
        'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=300&fit=crop',
      ],
    },
    {
      id: 2,
      userName: 'فاطمة علي',
      userAvatar:
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      isVerified: true,
      rating: 4,
      carTitle: 'هوندا أكورد 2021',
      carImage: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=300&h=200&fit=crop',
      reviewText:
        'سيارة جيدة جداً وسعر مناسب. كان هناك بعض الخدوش الصغيرة لم تُذكر في الوصف لكن بشكل عام راضية عن الشراء.',
      date: '2024-01-10',
      helpful: 18,
      notHelpful: 1,
      category: 'purchase',
      dealerName: 'معرض الأمان للسيارات',
      verified: true,
      images: [],
    },
    {
      id: 3,
      userName: 'محمد سالم',
      userAvatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isVerified: false,
      rating: 5,
      carTitle: 'نيسان التيما 2023',
      carImage: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=300&h=200&fit=crop',
      reviewText:
        'أفضل تجربة شراء سيارة في حياتي! الموقع سهل الاستخدام والمزاد كان عادل وشفاف. أنصح الجميع بالتجربة.',
      date: '2024-01-08',
      helpful: 31,
      notHelpful: 0,
      category: 'platform',
      dealerName: null,
      verified: true,
      images: ['https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=300&fit=crop'],
    },
    {
      id: 4,
      userName: 'سارة أحمد',
      userAvatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      isVerified: true,
      rating: 3,
      carTitle: 'شيفروليه كروز 2020',
      carImage: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=300&h=200&fit=crop',
      reviewText:
        'السيارة جيدة لكن كان هناك تأخير في التسليم. خدمة العملاء تعاملت مع المشكلة بشكل جيد وتم حل الموضوع.',
      date: '2024-01-05',
      helpful: 12,
      notHelpful: 3,
      category: 'delivery',
      dealerName: 'معرض الخليج للسيارات',
      verified: true,
      images: [],
    },
    {
      id: 5,
      userName: 'عبدالله حسن',
      userAvatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      isVerified: true,
      rating: 5,
      carTitle: 'فورد إكسبلورر 2022',
      carImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&h=200&fit=crop',
      reviewText:
        'سيارة رائعة وخدمة ممتازة. التمويل كان سهل والإجراءات سريعة. شكراً لفريق العمل المحترف.',
      date: '2024-01-03',
      helpful: 28,
      notHelpful: 1,
      category: 'financing',
      dealerName: 'معرض الفخامة للسيارات',
      verified: true,
      images: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
      ],
    },
  ];

  // فلترة المراجعات
  const getFilteredReviews = () => {
    let filtered = reviews;

    // فلترة حسب التقييم
    if (filterRating !== 'all') {
      filtered = filtered.filter((review) => review.rating === parseInt(filterRating));
    }

    // فلترة حسب البحث
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.carTitle.toLowerCase().includes(query) ||
          review.userName.toLowerCase().includes(query) ||
          review.reviewText.toLowerCase().includes(query),
      );
    }

    return filtered;
  };

  const filteredReviews = getFilteredReviews();

  // حساب متوسط التقييم
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  // حساب توزيع التقييمات
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
    percentage:
      (reviews.filter((review) => review.rating === rating).length / reviews.length) * 100,
  }));

  return (
    <>
      <Head>
        <title>التقييمات والمراجعات - مزاد السيارات</title>
        <meta name="description" content="اقرأ تقييمات ومراجعات المشترين للسيارات وشارك تجربتك" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="mb-3 flex items-center gap-4 text-4xl font-bold">
                  <StarIcon className="h-10 w-10 text-yellow-300" />
                  التقييمات والمراجعات
                </h1>
                <p className="text-lg text-blue-100">اقرأ تجارب المشترين وشارك تجربتك</p>
              </div>
              <button
                onClick={() => setShowAddReview(true)}
                className="flex items-center gap-3 rounded-xl bg-white px-8 py-4 font-medium text-blue-600 shadow-lg transition-colors hover:bg-gray-50"
              >
                <PlusIcon className="h-5 w-5" />
                إضافة مراجعة
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* إحصائيات عامة */}
          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <StarIcon className="h-7 w-7 text-yellow-600" />
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </div>
              <div className="mb-3 text-sm text-gray-600">متوسط التقييم</div>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIconSolid
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <ChatBubbleLeftRightIcon className="h-7 w-7 text-blue-600" />
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-900">{reviews.length}</div>
              <div className="text-sm text-gray-600">إجمالي المراجعات</div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckBadgeIcon className="h-7 w-7 text-green-600" />
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-900">
                {reviews.filter((r) => r.verified).length}
              </div>
              <div className="text-sm text-gray-600">مراجعات موثقة</div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
                <TrophyIcon className="h-7 w-7 text-purple-600" />
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-900">
                {Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">تقييمات إيجابية</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar - Statistics */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-lg font-bold text-gray-900">إحصائيات التقييم</h3>

                {/* متوسط التقييم */}
                <div className="mb-6 text-center">
                  <div className="mb-2 text-4xl font-bold text-yellow-500">
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="mb-2 flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIconSolid
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">من أصل {reviews.length} مراجعة</div>
                </div>

                {/* توزيع التقييمات */}
                <div className="space-y-2">
                  {ratingDistribution.map((item) => (
                    <div key={item.rating} className="flex items-center gap-2">
                      <div className="flex w-12 items-center gap-1">
                        <span className="text-sm">{item.rating}</span>
                        <StarIconSolid className="h-3 w-3 text-yellow-400" />
                      </div>
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-yellow-400"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-sm text-gray-600">{item.count}</span>
                    </div>
                  ))}
                </div>

                {/* فلاتر */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="mb-3 font-medium text-gray-900">فلترة حسب التقييم</h4>
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع التقييمات</option>
                    <option value="5">5 نجوم</option>
                    <option value="4">4 نجوم</option>
                    <option value="3">3 نجوم</option>
                    <option value="2">نجمتان</option>
                    <option value="1">نجمة واحدة</option>
                  </select>
                </div>

                {/* فلترة حسب الفئة */}
                <div className="mt-4">
                  <h4 className="mb-3 font-medium text-gray-900">فلترة حسب الفئة</h4>
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">جميع الفئات</option>
                    <option value="purchase">تجربة الشراء</option>
                    <option value="platform">المنصة</option>
                    <option value="delivery">التسليم</option>
                    <option value="financing">التمويل</option>
                    <option value="support">خدمة العملاء</option>
                    <option value="inspection">الفحص</option>
                    <option value="issue">مشاكل</option>
                  </select>
                </div>

                {/* إحصائيات إضافية */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="mb-3 font-medium text-gray-900">إحصائيات إضافية</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">مراجعات بصور</span>
                      <span className="text-sm font-medium">
                        {reviews.filter((r) => r.images.length > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">مراجعات موثقة</span>
                      <span className="text-sm font-medium">
                        {reviews.filter((r) => r.verified).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">متوسط المفيدة</span>
                      <span className="text-sm font-medium">
                        {Math.round(
                          reviews.reduce((acc, r) => acc + r.helpful, 0) / reviews.length,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* بحث */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="mb-3 font-medium text-gray-900">البحث</h4>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                    <input
                      type="text"
                      placeholder="ابحث في المراجعات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Reviews */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  المراجعات ({filteredReviews.length})
                </h2>
              </div>

              {/* Reviews List */}
              <div className="space-y-8">
                {filteredReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {filteredReviews.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl">[التحرير]</div>
                  <h3 className="mb-2 text-xl font-medium text-gray-900">لا توجد مراجعات</h3>
                  <p className="text-gray-600">جرب تغيير الفلاتر أو البحث عن شيء آخر</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Review Modal */}
        {showAddReview && <AddReviewModal onClose={() => setShowAddReview(false)} />}
      </div>
    </>
  );
};

// مكون كارت المراجعة
const ReviewCard = ({ review }) => {
  const [helpful, setHelpful] = useState(review.helpful);
  const [likes, setLikes] = useState(review.likes);
  const [dislikes, setDislikes] = useState(review.dislikes);

  const handleHelpful = (type) => {
    if (type === 'like') {
      setLikes(helpful ? likes - 1 : likes + 1);
      setHelpful(!helpful);
    } else {
      setDislikes(dislikes + 1);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="relative">
          <img
            src={review.userAvatar}
            alt={quickDecodeName(review.userName)}
            className="h-14 w-14 rounded-full border-2 border-gray-100 object-cover"
          />
          {review.isVerified && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
              <CheckBadgeIcon className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h4 className="text-lg font-semibold text-gray-900">
              {quickDecodeName(review.userName)}
            </h4>
            {review.verified && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
                <CheckCircleIcon className="h-3 w-3" />
                مشتري موثق
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{formatDate(review.date)}</span>
            </div>
            {review.dealerName && (
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                <span>{review.dealerName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIconSolid
                key={star}
                className={`h-5 w-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <div className="text-sm font-medium text-gray-600">{review.rating}/5</div>
        </div>
      </div>

      {/* Car Info */}
      <div className="mb-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
        <img
          src={review.carImage}
          alt={review.carTitle}
          className="h-16 w-20 rounded-lg border border-gray-200 object-cover"
        />
        <div className="flex-1">
          <h5 className="font-medium text-gray-900">{review.carTitle}</h5>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                review.category === 'purchase'
                  ? 'bg-blue-100 text-blue-800'
                  : review.category === 'platform'
                    ? 'bg-green-100 text-green-800'
                    : review.category === 'delivery'
                      ? 'bg-orange-100 text-orange-800'
                      : review.category === 'financing'
                        ? 'bg-purple-100 text-purple-800'
                        : review.category === 'support'
                          ? 'bg-yellow-100 text-yellow-800'
                          : review.category === 'inspection'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-red-100 text-red-800'
              }`}
            >
              {review.category === 'purchase'
                ? 'تجربة الشراء'
                : review.category === 'platform'
                  ? 'المنصة'
                  : review.category === 'delivery'
                    ? 'التسليم'
                    : review.category === 'financing'
                      ? 'التمويل'
                      : review.category === 'support'
                        ? 'خدمة العملاء'
                        : review.category === 'inspection'
                          ? 'الفحص'
                          : 'مشكلة'}
            </span>
          </div>
        </div>
      </div>

      {/* Review Content */}
      <div className="mb-6">
        <p className="text-base leading-relaxed text-gray-700">{review.reviewText}</p>
      </div>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="mb-6">
          <h6 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
            <CameraIcon className="h-5 w-5 text-gray-600" />
            صور المراجعة ({review.images.length})
          </h6>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {review.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`صورة ${index + 1}`}
                className="h-24 w-24 flex-shrink-0 cursor-pointer rounded-xl border-2 border-gray-200 object-cover transition-colors hover:border-blue-300"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleHelpful('like')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-colors ${
              helpful
                ? 'border border-green-200 bg-green-100 text-green-700'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HandThumbUpIcon className="h-4 w-4" />
            <span className="text-sm font-medium">مفيد ({review.helpful})</span>
          </button>
          <button
            onClick={() => handleHelpful('dislike')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50"
          >
            <HandThumbDownIcon className="h-4 w-4" />
            <span className="text-sm font-medium">غير مفيد ({review.notHelpful})</span>
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50">
            <HeartIcon className="h-4 w-4" />
            <span className="text-sm font-medium">حفظ</span>
          </button>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <span>
              منذ{' '}
              {Math.floor((Date.now() - new Date(review.date).getTime()) / (1000 * 60 * 60 * 24))}{' '}
              يوم
            </span>
          </div>
          {review.verified && (
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="h-4 w-4 text-green-500" />
              <span>مشتري موثق</span>
            </div>
          )}
        </div>
      </div>

      {/* معلومات إضافية */}
      {(review.dealerName || review.category === 'issue') && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between text-sm">
            {review.dealerName && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-gray-600">
                <TagIcon className="h-4 w-4" />
                <span>
                  تم الشراء من: <span className="font-medium">{review.dealerName}</span>
                </span>
              </div>
            )}
            {review.category === 'issue' && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-600">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="font-medium">تقرير مشكلة</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// مكون إضافة مراجعة
const AddReviewModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    carTitle: '',
    rating: 5,
    category: 'purchase',
    content: '',
    dealerName: '',
    wouldRecommend: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // هنا يمكن إضافة منطق حفظ المراجعة

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">إضافة مراجعة جديدة</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* اختيار السيارة */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">السيارة</label>
              <select
                value={formData.carTitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, carTitle: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">اختر السيارة</option>
                <option value="تويوتا كامري 2022">تويوتا كامري 2022</option>
                <option value="هوندا أكورد 2021">هوندا أكورد 2021</option>
                <option value="نيسان التيما 2023">نيسان التيما 2023</option>
                <option value="شيفروليه كروز 2020">شيفروليه كروز 2020</option>
                <option value="فورد إكسبلورر 2022">فورد إكسبلورر 2022</option>
              </select>
            </div>

            {/* نوع التقييم */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">نوع التقييم</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="purchase">تجربة الشراء</option>
                <option value="platform">المنصة</option>
                <option value="delivery">التسليم</option>
                <option value="financing">التمويل</option>
                <option value="support">خدمة العملاء</option>
                <option value="inspection">الفحص</option>
                <option value="issue">مشكلة</option>
              </select>
            </div>

            {/* اسم المعرض */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                اسم المعرض (اختياري)
              </label>
              <input
                type="text"
                value={formData.dealerName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dealerName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="اسم المعرض أو التاجر"
              />
            </div>

            {/* التقييم */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">التقييم</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                    className="focus:outline-none"
                  >
                    <StarIconSolid
                      className={`h-8 w-8 ${
                        star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="mr-2 text-sm text-gray-600">({formData.rating}/5)</span>
              </div>
            </div>

            {/* محتوى المراجعة */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                تفاصيل المراجعة
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="شارك تجربتك مع هذه السيارة..."
                required
              />
            </div>

            {/* التوصية */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">
                هل توصي بهذه التجربة؟
              </label>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="recommend"
                    checked={formData.wouldRecommend === true}
                    onChange={() => setFormData((prev) => ({ ...prev, wouldRecommend: true }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">نعم، أوصي بها</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="recommend"
                    checked={formData.wouldRecommend === false}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        wouldRecommend: false,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">لا، لا أوصي بها</span>
                </label>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex items-center gap-3 border-t pt-6">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                نشر المراجعة
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;

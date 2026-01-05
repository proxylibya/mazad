/**
 * Prisma Selectors المحسّنة
 * تحديد الحقول المطلوبة فقط لتحسين الأداء
 * لا يؤثر على التصميم - فقط يحسن السرعة
 */

import { Prisma } from '@prisma/client';

/**
 * User Selectors
 */
export const selectUserBasic = {
  id: true,
  name: true,
  phone: true,
  email: true,
  profileImage: true,
  role: true,
  accountType: true,
  verified: true,
  rating: true,
  createdAt: true,
} satisfies Prisma.usersSelect;

export const selectUserWithWallet = {
  ...selectUserBasic,
  wallet: {
    select: {
      id: true,
      localWallet: {
        select: {
          balance: true,
          currency: true,
        },
      },
      globalWallet: {
        select: {
          balance: true,
          currency: true,
        },
      },
      cryptoWallet: {
        select: {
          balance: true,
          currency: true,
          address: true,
        },
      },
    },
  },
} satisfies Prisma.usersSelect;

/**
 * Car Selectors
 */
export const selectCarBasic = {
  id: true,
  title: true,
  brand: true,
  model: true,
  year: true,
  price: true,
  images: true,
  location: true,
  status: true,
  condition: true,
  mileage: true,
  fuelType: true,
  transmission: true,
  color: true,
  createdAt: true,
} satisfies Prisma.carsSelect;

export const selectCarListing = {
  ...selectCarBasic,
  description: true,
  features: true,
  views: true,
  featured: true,
  seller: {
    select: selectUserBasic,
  },
} satisfies Prisma.carsSelect;

export const selectCarDetails = {
  ...selectCarListing,
  interiorFeatures: true,
  exteriorFeatures: true,
  technicalFeatures: true,
  bodyType: true,
  interiorColor: true,
  seatCount: true,
  regionalSpecs: true,
  vehicleType: true,
  manufacturingCountry: true,
  chassisNumber: true,
  engineNumber: true,
  customsStatus: true,
  licenseStatus: true,
  insuranceStatus: true,
  contactPhone: true,
  locationLat: true,
  locationLng: true,
  locationAddress: true,
  hasInspectionReport: true,
  inspectionReportType: true,
} satisfies Prisma.carsSelect;

/**
 * Auction Selectors
 */
export const selectAuctionBasic = {
  id: true,
  title: true,
  startPrice: true,
  currentPrice: true,
  startDate: true,
  endDate: true,
  status: true,
  featured: true,
  views: true,
  totalBids: true,
  createdAt: true,
} satisfies Prisma.auctionsSelect;

export const selectAuctionPreview = {
  ...selectAuctionBasic,
  cars: {
    select: selectCarBasic,
  },
  users: {
    select: {
      id: true,
      name: true,
      profileImage: true,
      rating: true,
    },
  },
} satisfies Prisma.auctionsSelect;

export const selectAuctionDetails = {
  ...selectAuctionBasic,
  description: true,
  cars: {
    select: selectCarDetails,
  },
  users: {
    select: selectUserBasic,
  },
  bids: {
    select: {
      id: true,
      amount: true,
      createdAt: true,
      users: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
    },
    orderBy: {
      amount: 'desc' as const,
    },
    take: 10,
  },
} satisfies Prisma.auctionsSelect;

/**
 * Showroom Selectors
 */
export const selectShowroomBasic = {
  id: true,
  name: true,
  description: true,
  city: true,
  area: true,
  images: true,
  phone: true,
  verified: true,
  featured: true,
  rating: true,
  reviewsCount: true,
  totalCars: true,
  activeCars: true,
  createdAt: true,
} satisfies Prisma.showroomsSelect;

export const selectShowroomDetails = {
  ...selectShowroomBasic,
  vehicleTypes: true,
  vehicleCount: true,
  address: true,
  coordinates: true,
  detailedAddress: true,
  email: true,
  website: true,
  openingHours: true,
  specialties: true,
  establishedYear: true,
  views: true,
  soldCars: true,
  owner: {
    select: selectUserBasic,
  },
} satisfies Prisma.showroomsSelect;

/**
 * Transaction Selectors
 */
export const selectTransactionBasic = {
  id: true,
  amount: true,
  type: true,
  status: true,
  currency: true,
  walletType: true,
  description: true,
  reference: true,
  createdAt: true,
  completedAt: true,
} satisfies Prisma.transactionsSelect;

export const selectTransactionDetails = {
  ...selectTransactionBasic,
  fees: true,
  originalAmount: true,
  originalCurrency: true,
  exchangeRate: true,
  metadata: true,
  blockchainTxHash: true,
  wallet: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.transactionsSelect;

/**
 * Review Selectors
 */
export const selectReviewBasic = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  isVerified: true,
  reviewer: {
    select: {
      id: true,
      name: true,
      profileImage: true,
    },
  },
} satisfies Prisma.reviewsSelect;

/**
 * Message Selectors
 */
export const selectMessageBasic = {
  id: true,
  content: true,
  type: true,
  status: true,
  createdAt: true,
  users: {
    select: {
      id: true,
      name: true,
      profileImage: true,
    },
  },
} satisfies Prisma.messagesSelect;

/**
 * Notification Selectors
 */
export const selectNotificationBasic = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  createdAt: true,
  metadata: true,
} satisfies Prisma.notificationsSelect;

/**
 * Transport Service Selectors
 */
export const selectTransportBasic = {
  id: true,
  title: true,
  description: true,
  truckType: true,
  capacity: true,
  serviceArea: true,
  pricePerKm: true,
  contactPhone: true,
  images: true,
  features: true,
  status: true,
  createdAt: true,
} satisfies Prisma.transport_servicesSelect;

export const selectTransportDetails = {
  ...selectTransportBasic,
  availableDays: true,
  commission: true,
  users: {
    select: selectUserBasic,
  },
} satisfies Prisma.transport_servicesSelect;

/**
 * Company Selectors
 */
export const selectCompanyBasic = {
  id: true,
  name: true,
  description: true,
  logo: true,
  city: true,
  phone: true,
  verified: true,
  featured: true,
  rating: true,
  reviewsCount: true,
  businessType: true,
  createdAt: true,
} satisfies Prisma.companiesSelect;

/**
 * Helper Functions
 */

/**
 * إنشاء where condition للاستعلامات الشائعة
 */
export const commonWhereConditions = {
  activeCars: {
    status: 'AVAILABLE' as const,
  },
  activeAuctions: {
    status: 'ACTIVE' as const,
  },
  verifiedUsers: {
    verified: true,
  },
  featuredItems: {
    featured: true,
  },
};

/**
 * إعدادات Pagination الافتراضية
 */
export const defaultPagination = {
  take: 20,
  skip: 0,
};

export const paginationSettings = {
  cars: { take: 20 },
  auctions: { take: 20 },
  messages: { take: 50 },
  notifications: { take: 30 },
  transactions: { take: 20 },
  reviews: { take: 10 },
};

/**
 * ترتيب افتراضي
 */
export const defaultOrdering = {
  newest: { createdAt: 'desc' as const },
  oldest: { createdAt: 'asc' as const },
  priceHighToLow: { price: 'desc' as const },
  priceLowToHigh: { price: 'asc' as const },
  mostViewed: { views: 'desc' as const },
  topRated: { rating: 'desc' as const },
};

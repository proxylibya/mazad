import crypto from 'crypto';

/**
 * Generate a unique USDT TRC20 address for a user
 * This is a simplified implementation for demo purposes
 * In production, you should use proper TRON SDK or API
 */
export const generateTRC20Address = (userId: string): string => {
  try {
    // Create a deterministic seed based on user ID and a secret
    const secret = process.env.WALLET_SECRET || 'default-secret-key';
    const seed = crypto.createHash('sha256').update(`${userId}-${secret}`).digest('hex');

    // Generate address using Base58 alphabet (TRON addresses start with 'T')
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = 'T';

    // Use the seed to generate a consistent address for the same user
    for (let i = 0; i < 33; i++) {
      const index = parseInt(seed.substr(i * 2, 2), 16) % alphabet.length;
      address += alphabet[index];
    }

    return address;
  } catch (error) {
    console.error('Error generating TRC20 address:', error);
    // Fallback to random generation
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = 'T';
    for (let i = 0; i < 33; i++) {
      address += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return address;
  }
};

/**
 * Generate a unique Solana address for a user (Mock)
 */
export const generateSolanaAddress = (userId: string): string => {
  try {
    const secret = process.env.WALLET_SECRET || 'default-secret-key';
    const seed = crypto
      .createHash('sha256')
      .update(`${userId}-${secret}-sol`)
      .digest('hex');
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
      const index = parseInt(seed.substr(i % 20, 2), 16) % alphabet.length;
      address += alphabet[index];
    }
    return address;
  } catch {
    // Fallback
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) address += alphabet[Math.floor(Math.random() * alphabet.length)];
    return address;
  }
};

/**
 * Generate a unique BEP20/ETH address for a user (Mock)
 */
export const generateBep20Address = (userId: string): string => {
  try {
    const secret = process.env.WALLET_SECRET || 'default-secret-key';
    const seed = crypto
      .createHash('sha256')
      .update(`${userId}-${secret}-bep`)
      .digest('hex');
    return `0x${seed.substr(0, 40)}`;
  } catch {
    // Fallback
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) address += hex[Math.floor(Math.random() * hex.length)];
    return address;
  }
};

/**
 * Validate Solana address format
 */
export const validateSolanaAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  // Solana addresses are base58 encoded strings, typically 44 chars (can be 32-44)
  const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44}$/;
  return base58Regex.test(address);
};

/**
 * Validate BEP20 address format
 */
export const validateBep20Address = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  // BEP20 is same as ETH: 0x + 40 hex chars
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
};

/**
 * Validate TRC20 address format
 */
export const validateTRC20Address = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  // TRC20 addresses start with 'T' and are 34 characters long (base58)
  const trc20Regex = /^T[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$/;
  return trc20Regex.test(address);
};

export type LocalWalletAttributes = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  currency: 'LYD';
  features: string[];
  limits: {
    min: number;
    max: number;
    daily: number;
    monthly: number;
  };
  fees: {
    deposit: number;
    withdrawal: number;
    transfer: number;
  };
};

export type GlobalWalletAttributes = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  currency: 'USD';
  features: string[];
  limits: {
    min: number;
    max: number;
    daily: number;
    monthly: number;
  };
  fees: {
    deposit: number;
    withdrawal: number;
    transfer: number;
  };
};

export type CryptoWalletAttributes = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  currency: string;
  address: string;
  network: 'TRC20' | 'SOLANA' | 'BEP20';
  features: string[];
  limits: {
    min: number;
    max: number;
    daily: number;
    monthly: number;
  };
  fees: {
    deposit: number;
    withdrawal: number;
    networkFee: number;
  };
  confirmations: {
    required: number;
    fast: number;
  };
};

export function generateWalletAttributes(walletType: 'LOCAL', userId: string): LocalWalletAttributes;
export function generateWalletAttributes(walletType: 'GLOBAL', userId: string): GlobalWalletAttributes;
export function generateWalletAttributes(
  walletType: 'CRYPTO',
  userId: string,
  network?: 'TRC20' | 'SOLANA' | 'BEP20',
): CryptoWalletAttributes;
export function generateWalletAttributes(
  walletType: 'LOCAL' | 'GLOBAL' | 'CRYPTO',
  userId: string,
  network?: 'TRC20' | 'SOLANA' | 'BEP20',
): LocalWalletAttributes | GlobalWalletAttributes | CryptoWalletAttributes {
  const baseAttributes = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  const resolvedNetwork: 'TRC20' | 'SOLANA' | 'BEP20' = network ?? 'TRC20';

  switch (walletType) {
    case 'LOCAL':
      return {
        ...baseAttributes,
        currency: 'LYD',
        features: ['تحويل بنكي محلي', 'تعبئة رصيد ليبيانا', 'تعبئة رصيد مدار', 'دعم فوري'],
        limits: {
          min: 10,
          max: 50000,
          daily: 10000,
          monthly: 100000,
        },
        fees: {
          deposit: 0.02, // 2%
          withdrawal: 0.025, // 2.5%
          transfer: 0.01, // 1%
        },
      };

    case 'GLOBAL':
      return {
        ...baseAttributes,
        currency: 'USD',
        features: ['PayPal', 'Payoneer', 'Wise', 'تحويل دولي'],
        limits: {
          min: 5,
          max: 10000,
          daily: 5000,
          monthly: 50000,
        },
        fees: {
          deposit: 0.034, // 3.4%
          withdrawal: 0.04, // 4%
          transfer: 0.025, // 2.5%
        },
      };

    case 'CRYPTO':
      let address = '';
      let currency = '';
      let features = ['إيداع فوري', 'أمان عالي'];
      let networkFee = 1;

      if (resolvedNetwork === 'SOLANA') {
        address = generateSolanaAddress(userId);
        currency = 'USDT-SOL';
        features = ['سرعة فائقة', 'رسوم شبه معدومة', 'شبكة حديثة'];
        networkFee = 0.01;
      } else if (resolvedNetwork === 'BEP20') {
        address = generateBep20Address(userId);
        currency = 'USDT-BEP20';
        features = ['شبكة واسعة الانتشار', 'رسوم منخفضة', 'دعم المنصات'];
        networkFee = 0.1;
      } else {
        // TRC20 (Default)
        address = generateTRC20Address(userId);
        currency = 'USDT-TRC20';
        features = ['رسوم منخفضة', 'استقرار عالي', 'الأكثر استخداماً'];
        networkFee = 1;
      }

      return {
        ...baseAttributes,
        currency,
        address,
        network: resolvedNetwork,
        features,
        limits: {
          min: resolvedNetwork === 'SOLANA' ? 5 : 10,
          max: 100000,
          daily: 50000,
          monthly: 500000,
        },
        fees: {
          deposit: 0.01, // 1%
          withdrawal: 0.015, // 1.5%
          networkFee,
        },
        confirmations: {
          required: resolvedNetwork === 'SOLANA' ? 32 : resolvedNetwork === 'BEP20' ? 15 : 20,
          fast: resolvedNetwork === 'SOLANA' ? 1 : 6,
        },
      };

    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
};

/**
 * Format wallet balance with proper currency symbol
 */
export const formatWalletBalance = (balance: number, currency: string): string => {
  const symbols = {
    LYD: 'د.ل',
    USD: '$',
    USDT: 'USDT',
    'USDT-TRC20': 'USDT',
  };

  const symbol = symbols[currency as keyof typeof symbols] || currency;

  return `${balance.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
};

/**
 * Calculate transaction fees based on wallet type and amount
 */
export const calculateTransactionFees = (
  amount: number,
  walletType: 'LOCAL' | 'GLOBAL' | 'CRYPTO',
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER',
): { fee: number; netAmount: number; feePercentage: number; } => {
  const feeRates = {
    LOCAL: {
      DEPOSIT: 0.02,
      WITHDRAWAL: 0.025,
      TRANSFER: 0.01,
    },
    GLOBAL: {
      DEPOSIT: 0.034,
      WITHDRAWAL: 0.04,
      TRANSFER: 0.025,
    },
    CRYPTO: {
      DEPOSIT: 0.01,
      WITHDRAWAL: 0.015,
      TRANSFER: 0.01,
    },
  };

  const feePercentage = feeRates[walletType][transactionType];
  const fee = amount * feePercentage;
  const netAmount = transactionType === 'DEPOSIT' ? amount - fee : amount;

  return {
    fee,
    netAmount,
    feePercentage,
  };
};

/**
 * Generate QR code data for wallet address
 */
export const generateWalletQRData = (
  address: string,
  amount?: number,
  currency?: string,
): string => {
  if (!address) return '';

  // For TRON addresses, use the tron: URI scheme
  if (address.startsWith('T')) {
    let qrData = `tron:${address}`;
    if (amount && currency) {
      qrData += `?amount=${amount}&token=${currency}`;
    }
    return qrData;
  }

  // For other addresses, return as-is
  return address;
};

/**
 * Validate transaction limits
 */
export const validateTransactionLimits = (
  amount: number,
  walletType: 'LOCAL' | 'GLOBAL' | 'CRYPTO',
  userLimits?: {
    dailyUsed: number;
    monthlyUsed: number;
  },
): { isValid: boolean; error?: string; } => {
  const limits = {
    LOCAL: { min: 10, max: 50000, daily: 10000, monthly: 100000 },
    GLOBAL: { min: 5, max: 10000, daily: 5000, monthly: 50000 },
    CRYPTO: { min: 10, max: 100000, daily: 50000, monthly: 500000 },
  };

  const walletLimits = limits[walletType];

  if (amount < walletLimits.min) {
    return {
      isValid: false,
      error: `الحد الأدنى للمعاملة هو ${walletLimits.min}`,
    };
  }

  if (amount > walletLimits.max) {
    return {
      isValid: false,
      error: `الحد الأقصى للم��املة هو ${walletLimits.max}`,
    };
  }

  if (userLimits) {
    if (userLimits.dailyUsed + amount > walletLimits.daily) {
      return {
        isValid: false,
        error: `تجاوز الحد اليومي المسموح (${walletLimits.daily})`,
      };
    }

    if (userLimits.monthlyUsed + amount > walletLimits.monthly) {
      return {
        isValid: false,
        error: `تجاوز الحد الشهري المسموح (${walletLimits.monthly})`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Generate transaction reference
 */
export const generateTransactionReference = (
  walletType: 'LOCAL' | 'GLOBAL' | 'CRYPTO',
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER',
): string => {
  const prefix = {
    LOCAL: 'LCL',
    GLOBAL: 'GLB',
    CRYPTO: 'CRY',
  };

  const typePrefix = {
    DEPOSIT: 'DEP',
    WITHDRAWAL: 'WTH',
    TRANSFER: 'TRF',
  };

  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();

  return `${prefix[walletType]}-${typePrefix[transactionType]}-${timestamp}-${random}`;
};

// @ts-nocheck
/**
 * 📱 نظام الرسائل النصية الموحد
 * يدير جميع عمليات إرسال الرسائل النصية
 */

import prisma from '@/lib/prisma';

interface SMSConfig {
  provider: 'twilio' | 'mock';
  from: string;
  defaultCountryCode: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

// SMS Templates
const templates: Record<string, (vars: any) => string> = {
  otp: (vars: any) =>
    `رمز التحقق الخاص بك في سوق مزاد: ${vars.code}. صالح لمدة 10 دقائق.`,

  welcome: (vars: any) =>
    `مرحباً ${vars.name || 'بك'} في سوق مزاد! يمكنك الآن البدء في المزايدة.`,

  bidAccepted: (vars: any) =>
    `تهانينا! فزت بالمزاد على ${vars.carTitle} بقيمة ${vars.amount} د.ل`,

  passwordReset: (vars: any) =>
    `رمز إعادة تعيين كلمة المرور: ${vars.code}. لا تشارك هذا الرمز.`
};

export class SMSManager {
  private config: SMSConfig;
  private twilioClient: any;

  constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER || 'mock') as any,
      from: process.env.SMS_FROM || '+1234567890',
      defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '+218'
    };

    this.initializeProvider();
  }

  private initializeProvider() {
    switch (this.config.provider) {
      case 'twilio':
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          const twilio = require('twilio');
          this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
        }
        break;
    }
  }

  async send(to: string, message: string): Promise<SMSResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number');
      }

      let result: SMSResult;

      switch (this.config.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(formattedPhone, message);
          break;
        default:
          result = await this.sendViaMock(formattedPhone, message);
      }

      await this.logSMS(formattedPhone, message, result);
      return result;
    } catch (error: any) {
      console.error('[SMSManager] Send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<SMSResult> {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    const result = await this.twilioClient.messages.create({
      body: message,
      from: this.config.from,
      to
    });

    return {
      success: true,
      messageId: result.sid,
      cost: result.price
    };
  }

  private async sendViaMock(to: string, message: string): Promise<SMSResult> {
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
    return {
      success: true,
      messageId: 'mock-' + Date.now()
    };
  }

  async sendOTP(to: string, code: string): Promise<SMSResult> {
    const message = templates.otp({ code });
    return this.send(to, message);
  }

  async sendWelcome(to: string, name?: string): Promise<SMSResult> {
    const message = templates.welcome({ name });
    return this.send(to, message);
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (!cleaned.startsWith('218')) {
      cleaned = '218' + cleaned;
    }

    return '+' + cleaned;
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+218(9[1-6])\d{7}$/;
    return phoneRegex.test(phone);
  }

  private async logSMS(to: string, message: string, result: SMSResult): Promise<void> {
    try {
      await prisma.sms_logs.create({
        data: {
          recipient: to,
          message: message.substring(0, 160),
          status: result.success ? 'SENT' : 'FAILED',
          messageId: result.messageId,
          error: result.error,
          cost: result.cost || 0
        }
      });
    } catch {
      // Silently fail if table doesn't exist
    }
  }
}

let smsManager: SMSManager;

export function getSMSManager(): SMSManager {
  if (!smsManager) {
    smsManager = new SMSManager();
  }
  return smsManager;
}

export default getSMSManager();

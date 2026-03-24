import { SubscriptionFeatures } from '@/types/subscription';

export const SUBSCRIPTION_CONFIG = {
  // Set this to true to enable test mode in development
  isTestMode: import.meta.env.DEV,
  
  // Number of days for the trial period
  trialPeriod: 30,
  
  // Subscription plans configuration
  plans: {
    basic: {
      id: 'basic',
      name: 'Basic Plan',
      price: 5000000, // 50,000 TZS (in cents)
      description: 'Perfect for small pharmacies',
      testPrice: 50000, // 500 TZS (in cents) for testing
      features: {
        pos: true,
        inventoryManagement: true,
        stockAdjustment: true,
        crm: false,
        pharmacyAds: false,
        auditReports: 'standard',
        creditManagement: false,
        maxStaffAccounts: 3,
        maxBranches: 1,
        advancedNotifications: false
      } as SubscriptionFeatures
    },
    medium: {
      id: 'medium',
      name: 'Medium Plan',
      price: 10000000, // 100,000 TZS (in cents)
      description: 'Ideal for growing pharmacies',
      testPrice: 100000, // 1,000 TZS (in cents) for testing
      features: {
        pos: true,
        inventoryManagement: true,
        stockAdjustment: true,
        crm: true,
        pharmacyAds: true,
        auditReports: 'advanced',
        creditManagement: true,
        maxStaffAccounts: 10,
        maxBranches: 3,
        advancedNotifications: true
      } as SubscriptionFeatures
    },
    premium: {
      id: 'premium',
      name: 'Premium Plan',
      price: 20000000, // 200,000 TZS (in cents)
      description: 'For large pharmacy chains',
      testPrice: 200000, // 2,000 TZS (in cents) for testing
      features: {
        pos: true,
        inventoryManagement: true,
        stockAdjustment: true,
        crm: true,
        pharmacyAds: true,
        auditReports: 'advanced',
        creditManagement: true,
        maxStaffAccounts: 'unlimited',
        maxBranches: 'unlimited',
        advancedNotifications: true
      } as SubscriptionFeatures
    }
  }
} as const;

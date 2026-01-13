import { useAuth } from '@/contexts/AuthContext';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/types/subscription';
import { supabase } from '@/integrations/supabase/client';

export const useSubscription = () => {
  const { userSubscription } = useAuth();

  const hasFeature = (feature: keyof typeof SUBSCRIPTION_PLANS.premium.features) => {
    if (!userSubscription) return false;
    return SUBSCRIPTION_PLANS[userSubscription.plan].features[feature];
  };

  const canAccessPlan = (requiredPlan: SubscriptionPlan) => {
    if (!userSubscription) return false;
    
    const planLevels: Record<SubscriptionPlan, number> = {
      'basic': 1,
      'medium': 2,
      'premium': 3
    };

    return planLevels[userSubscription.plan] >= planLevels[requiredPlan];
  };

  const getMaxStaffAccounts = () => {
    if (!userSubscription) return 0;
    const { maxStaffAccounts } = SUBSCRIPTION_PLANS[userSubscription.plan].features;
    return maxStaffAccounts === 'unlimited' ? Infinity : maxStaffAccounts;
  };

  const getMaxBranches = () => {
    if (!userSubscription) return 0;
    const { maxBranches } = SUBSCRIPTION_PLANS[userSubscription.plan].features;
    return maxBranches === 'unlimited' ? Infinity : maxBranches;
  };

  // Get current counts from the database
  const getCurrentCounts = async () => {
    if (!userSubscription) return { staffCount: 0, branchCount: 0 };
    
    const { count: staffCount } = await supabase
      .from('staff_members')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', userSubscription.userId);

    const { count: branchCount } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', userSubscription.userId);

    return {
      staffCount: staffCount || 0,
      branchCount: branchCount || 0
    };
  };

  return {
    hasFeature,
    canAccessPlan,
    getMaxStaffAccounts,
    getMaxBranches,
    getCurrentCounts,
    currentPlan: userSubscription?.plan,
    isActive: userSubscription?.status === 'active',
    isTrial: userSubscription?.status === 'trial',
    isExpired: userSubscription?.status === 'expired',
    subscription: {
      ...userSubscription,
      currentStaffCount: 0, // This will be updated by useEffect in the component
      currentBranchCount: 0
    },
  };
};

export default useSubscription;

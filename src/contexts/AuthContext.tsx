import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/auditService';
import { UserSubscription, SubscriptionPlan, SUBSCRIPTION_PLANS } from '@/types/subscription';
import { emailService } from '@/services/emailService';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'individual' | 'retail' | 'wholesale' | 'lab' | 'delivery';
  // Common fields
  phone?: string;
  address?: string;
  createdAt?: string;
  
  // Individual user fields
  dateOfBirth?: string;
  emergencyContact?: string;
  
  // Retail pharmacy fields
  pharmacyName?: string;
  licenseNumber?: string;
  pharmacistName?: string;
  
  // Wholesale pharmacy fields
  businessName?: string;
  businessLicense?: string;
  taxId?: string;
  
  // Lab fields
  labName?: string;
  labLicense?: string;
  specializations?: string[];
  operatingHours?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userSubscription: UserSubscription | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
  logout: () => void;
  register: (userData: Partial<User> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  getDashboardRoute: (user?: User | null) => string;
  updateSubscription: (plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get dashboard route based on user role
  const getDashboardRoute = (userData?: User | null): string => {
    const currentUser = userData || user;
    if (!currentUser) return '/';
    
    switch (currentUser.role) {
      case 'admin': return '/admin';
      case 'individual': return '/individual';
      case 'retail': return '/pharmacy';
      case 'wholesale': return '/wholesale';
      case 'lab': return '/lab';
      case 'delivery': return '/delivery';
      default: return '/';
    }
  };

  // Convert Supabase profile to our User type
  const convertProfileToUser = (profile: any, supabaseUser: SupabaseUser): User => {
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      phone: profile.phone,
      address: profile.address,
      createdAt: profile.created_at,
      dateOfBirth: profile.date_of_birth,
      emergencyContact: profile.emergency_contact,
      pharmacyName: profile.pharmacy_name,
      licenseNumber: profile.license_number,
      pharmacistName: profile.pharmacist_name,
      businessName: profile.business_name,
      businessLicense: profile.business_license,
      taxId: profile.tax_id,
      labName: profile.lab_name,
      labLicense: profile.lab_license,
      specializations: profile.specializations,
      operatingHours: profile.operating_hours,
    };
  };

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Check and link staff invitation on registration/login
  const checkAndLinkStaffInvitation = async (userId: string, email: string) => {
    try {
      // Find any pending staff invitation for this email
      const { data: staffInvitation, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('email', email.toLowerCase())
        .is('user_id', null)
        .maybeSingle();

      if (error) {
        console.error('Error checking staff invitation:', error);
        return null;
      }

      if (staffInvitation) {
        // Link the user to the staff member record
        const { error: updateError } = await supabase
          .from('staff_members')
          .update({
            user_id: userId,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', staffInvitation.id);

        if (updateError) {
          console.error('Error linking staff member:', updateError);
          return null;
        }

        console.log('Staff invitation linked successfully:', staffInvitation);
        return staffInvitation;
      }

      return null;
    } catch (error) {
      console.error('Error in checkAndLinkStaffInvitation:', error);
      return null;
    }
  };

  // Create UserSubscription from profile
  const createUserSubscription = (profile: any): UserSubscription | null => {
    if (!profile.subscription_status) return null;

    return {
      id: profile.id,
      userId: profile.id,
      plan: (profile.subscription_plan as 'basic' | 'medium' | 'premium') || 'premium',
      status: (profile.subscription_status as 'trial' | 'active' | 'expired' | 'cancelled') || 'trial',
      startDate: profile.subscription_start_date || new Date().toISOString(),
      trialEndDate: profile.subscription_trial_end_date || new Date().toISOString(),
      currentPeriodEnd: profile.subscription_period_end || new Date().toISOString(),
      cancelAtPeriodEnd: profile.subscription_cancel_at_period_end || false,
      lastPaymentDate: profile.subscription_last_payment_date,
      nextBillingDate: profile.subscription_next_billing_date || new Date().toISOString(),
    };
  };

  // Initialize complimentary subscription
  const initializeComplimentarySubscription = async (userId: string) => {
    try {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial',
          subscription_plan: 'premium',
          subscription_start_date: now.toISOString(),
          subscription_trial_end_date: trialEndDate.toISOString(),
          subscription_period_end: trialEndDate.toISOString(),
          subscription_cancel_at_period_end: false,
          subscription_next_billing_date: trialEndDate.toISOString(),
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error initializing complimentary subscription:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile when authenticated
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              // Check and link any pending staff invitation
              const staffInvitation = await checkAndLinkStaffInvitation(
                session.user.id, 
                session.user.email || profile.email
              );
              
              if (staffInvitation) {
                console.log('User linked to pharmacy:', staffInvitation.pharmacy_id);
              }

              // Initialize complimentary subscription if none exists
              if (!profile.subscription_status) {
                await initializeComplimentarySubscription(session.user.id);
                // Fetch updated profile
                const updatedProfile = await fetchUserProfile(session.user.id);
                if (updatedProfile) {
                  const userData = convertProfileToUser(updatedProfile, session.user);
                  setUser(userData);
                  setUserSubscription(createUserSubscription(updatedProfile));
                }
              } else {
                const userData = convertProfileToUser(profile, session.user);
                setUser(userData);
                setUserSubscription(createUserSubscription(profile));
              }
            }
          }, 0);
        } else {
          setUser(null);
          setUserSubscription(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(async profile => {
          if (profile) {
            // Check and link any pending staff invitation
            await checkAndLinkStaffInvitation(
              session.user.id, 
              session.user.email || profile.email
            );

            // Initialize complimentary subscription if none exists
            if (!profile.subscription_status) {
              await initializeComplimentarySubscription(session.user.id);
              const updatedProfile = await fetchUserProfile(session.user.id);
              if (updatedProfile) {
                const userData = convertProfileToUser(updatedProfile, session.user);
                setUser(userData);
                setUserSubscription(createUserSubscription(updatedProfile));
              }
            } else {
              const userData = convertProfileToUser(profile, session.user);
              setUser(userData);
              setUserSubscription(createUserSubscription(profile));
            }
          }
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; redirectTo?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setIsLoading(false);
        import("@/hooks/use-toast").then(({ toast }) => {
          toast({
            title: "Login error",
            description: error.message,
            variant: "destructive",
          });
        });
        return { success: false, error: error.message };
      }
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          const userData = convertProfileToUser(profile, data.user);
          setUser(userData);
          setSession(data.session);

          // Log successful login
          auditService.logLogin();

          // Toast on successful login
          import("@/hooks/use-toast").then(({ toast }) => {
            toast({
              title: "Login successful",
              description: `Welcome back, ${userData.name || userData.email}!`,
              variant: "default",
            });
          });

          // Begin: Robust redirect logic ...
          const redirectTo = getDashboardRoute(userData);
          setTimeout(() => {
            if (window?.location?.pathname !== redirectTo) {
              window.location.replace(redirectTo);
            }
          }, 100);
          setIsLoading(false);
          return { success: true, redirectTo };
        }
      }
      setIsLoading(false);
      return { success: true, redirectTo: "/" };
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Login error",
          description: "An error occurred during login. Please try again.",
          variant: "destructive",
        });
      });
      return { success: false, error: "An error occurred during login. Please try again." };
    }
  };

  const register = async (userData: Partial<User> & { password: string }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      // Prepare metadata for the trigger
      const userMetadata = {
        name: userData.name,
        role: userData.role || 'individual',
        phone: userData.phone,
        address: userData.address,
        dateOfBirth: userData.dateOfBirth,
        emergencyContact: userData.emergencyContact,
        pharmacyName: userData.pharmacyName,
        licenseNumber: userData.licenseNumber,
        pharmacistName: userData.pharmacistName,
        businessName: userData.businessName,
        businessLicense: userData.businessLicense,
        taxId: userData.taxId,
        labName: userData.labName,
        labLicense: userData.labLicense,
        specializations: userData.specializations?.join(','),
        operatingHours: userData.operatingHours,
      };

      // Use the actual site URL for the redirect
      const redirectUrl = `${window.location.origin}/auth-callback`;
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email!,
        password: userData.password,
        options: {
          data: userMetadata,
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }
      if (data) {
        // Send welcome email using Resend
        try {
          await emailService.sendWelcomeEmail(
            userData.email!,
            userData.name,
            userData.role
          );
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }
      
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return { success: false, error: 'An error occurred during registration. Please try again.' };
    }
  };

  const logout = async () => {
    // Log logout before signing out
    await auditService.logLogout();
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Toast on logout
    import("@/hooks/use-toast").then(({ toast }) => {
      toast({
        title: "Logged out",
        description: "You have been logged out.",
        variant: "default",
      });
    });
  };

  const updateSubscription = async (plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    try {
      const now = new Date();
      const complimentaryEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days complimentary
      const nextBillingDate = new Date(complimentaryEndDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Next billing after complimentary

      const newSubscription: UserSubscription = {
        id: user.id, // Using user.id as the subscription ID since it's in the profiles table
        userId: user.id,
        plan,
        status: 'trial',
        startDate: now.toISOString(),
        trialEndDate: complimentaryEndDate.toISOString(),
        currentPeriodEnd: complimentaryEndDate.toISOString(),
        cancelAtPeriodEnd: false,
        nextBillingDate: nextBillingDate.toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial',
          subscription_plan: plan,
          subscription_start_date: now.toISOString(),
          subscription_trial_end_date: complimentaryEndDate.toISOString(),
          subscription_period_end: complimentaryEndDate.toISOString(),
          subscription_cancel_at_period_end: false,
          subscription_next_billing_date: nextBillingDate.toISOString(),
          max_staff_accounts: SUBSCRIPTION_PLANS[plan].features.maxStaffAccounts === 'unlimited' ? -1 : SUBSCRIPTION_PLANS[plan].features.maxStaffAccounts,
          max_branches: SUBSCRIPTION_PLANS[plan].features.maxBranches === 'unlimited' ? -1 : SUBSCRIPTION_PLANS[plan].features.maxBranches
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setUserSubscription(newSubscription);
      
      // Show success toast
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Subscription updated",
          description: "Your subscription has been updated successfully.",
          variant: "default",
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating subscription:', error);
      // Show error toast
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Error updating subscription",
          description: "There was an error updating your subscription. Please try again.",
          variant: "destructive",
        });
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userSubscription,
      login,
      logout,
      register,
      isLoading,
      getDashboardRoute,
      updateSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
};

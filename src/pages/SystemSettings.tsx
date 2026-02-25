import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Settings, Shield, Bell, Download, FileText, User, MessageSquare, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker, { LocationData } from "@/components/delivery/LocationPicker";

const SystemSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [settings, setSettings] = useState({
    theme: 'system',
    language: 'en',
    timezone: 'Africa/Dar_es_Salaam',
    currency: 'TZS',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
    },
    privacy: {
      profileVisibility: 'business_only',
      dataSharing: false,
      analyticsTracking: true,
    },
    business: {
      taxRate: 18,
      paymentTerms: '30 days',
      lowStockThreshold: 10,
      autoReorder: false,
    },
    whatsapp: {
      phoneNumberId: '',
      businessAccountId: '',
      accessToken: '',
      verifyToken: 'bepawa_whatsapp_verify_9c4f2c5d',
      templateName: 'hello_world',
    },
    resend: {
      apiKey: '',
      fromEmail: 'notifications@bepawaa.com',
    },
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSaveWhatsAppSettings = async () => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('update-whatsapp-credentials', {
        body: {
          accessToken: settings.whatsapp.accessToken,
          phoneNumberId: settings.whatsapp.phoneNumberId,
          verifyToken: settings.whatsapp.verifyToken,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "WhatsApp credentials validated ✓",
        description: "Your credentials are valid. Make sure to update the Supabase secrets (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID) in Project Settings → Edge Functions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to validate WhatsApp settings. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save operating hours and address to profile
      const updates: Record<string, any> = {};
      if ((settings as any).operatingHours !== undefined) {
        updates.operating_hours = (settings as any).operatingHours;
      }
      if ((settings as any).address !== undefined) {
        updates.address = (settings as any).address;
      }
      
      if (Object.keys(updates).length > 0 && user) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (error) throw error;
      }
      
      toast({
        title: "Settings saved",
        description: "Your settings have been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // Here you would call the backup service
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      
      toast({
        title: "Export started",
        description: "Your data export has been initiated. You'll receive an email when it's ready.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start data export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">System Settings</h1>
          <p className="text-gray-600 text-lg">Manage your account preferences and system configuration</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data & Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={settings.language} onValueChange={(value) => setSettings({...settings, language: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Dar_es_Salaam">East Africa Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={settings.currency} onValueChange={(value) => setSettings({...settings, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TZS">Tanzanian Shilling (TZS)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, email: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Receive browser push notifications</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={settings.notifications.push}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, push: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={settings.notifications.sms}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, sms: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing-notifications">Marketing Communications</Label>
                    <p className="text-sm text-gray-500">Receive product updates and promotional content</p>
                  </div>
                  <Switch
                    id="marketing-notifications"
                    checked={settings.notifications.marketing}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, marketing: checked }
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <Select 
                    value={settings.privacy.profileVisibility} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      privacy: { ...settings.privacy, profileVisibility: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="business_only">Business Network Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-sharing">Data Sharing</Label>
                    <p className="text-sm text-gray-500">Allow sharing anonymized data for platform improvements</p>
                  </div>
                  <Switch
                    id="data-sharing"
                    checked={settings.privacy.dataSharing}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, dataSharing: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics-tracking">Analytics Tracking</Label>
                    <p className="text-sm text-gray-500">Help us improve the platform with usage analytics</p>
                  </div>
                  <Switch
                    id="analytics-tracking"
                    checked={settings.privacy.analyticsTracking}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        privacy: { ...settings.privacy, analyticsTracking: checked }
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Operating Hours */}
                <div className="space-y-2">
                  <Label htmlFor="operating-hours">Operating Hours</Label>
                  <Input
                    id="operating-hours"
                    placeholder="8:00 AM - 9:00 PM"
                    value={(settings as any).operatingHours || user?.operatingHours || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      operatingHours: e.target.value
                    } as any)}
                  />
                  <p className="text-sm text-muted-foreground">Displayed on your public pharmacy/business profile</p>
                </div>

                {/* Business Location with Map */}
                {(user?.role === 'retail' || user?.role === 'wholesale' || user?.role === 'lab') && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Business Location
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Update your exact location on the map for accurate delivery calculations and directory listings
                    </p>
                    <LocationPicker
                      onLocationSelect={async (location) => {
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({
                              address: location.address,
                              latitude: location.latitude,
                              longitude: location.longitude,
                            })
                            .eq('id', user.id);
                          if (error) throw error;
                          toast({
                            title: "Location updated",
                            description: "Your business location has been saved successfully.",
                          });
                        } catch (err: any) {
                          toast({
                            title: "Error",
                            description: err.message || "Failed to update location.",
                            variant: "destructive",
                          });
                        }
                      }}
                      initialLocation={
                        user?.address
                          ? { latitude: 0, longitude: 0, address: user.address }
                          : undefined
                      }
                      placeholder="Search for your business location..."
                    />
                  </div>
                )}

                {/* Fallback plain address for non-business roles */}
                {user?.role !== 'retail' && user?.role !== 'wholesale' && user?.role !== 'lab' && (
                  <div className="space-y-2">
                    <Label htmlFor="business-address">Address</Label>
                    <Input
                      id="business-address"
                      placeholder="Enter your address"
                      value={(settings as any).address || user?.address || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        address: e.target.value
                      } as any)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      value={settings.business.taxRate}
                      onChange={(e) => setSettings({
                        ...settings,
                        business: { ...settings.business, taxRate: Number(e.target.value) }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment-terms">Default Payment Terms</Label>
                    <Select 
                      value={settings.business.paymentTerms} 
                      onValueChange={(value) => setSettings({
                        ...settings,
                        business: { ...settings.business, paymentTerms: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="15 days">15 days</SelectItem>
                        <SelectItem value="30 days">30 days</SelectItem>
                        <SelectItem value="60 days">60 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
                  <Input
                    id="low-stock-threshold"
                    type="number"
                    value={settings.business.lowStockThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      business: { ...settings.business, lowStockThreshold: Number(e.target.value) }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-reorder">Automatic Reordering</Label>
                    <p className="text-sm text-gray-500">Automatically create purchase orders when stock is low</p>
                  </div>
                  <Switch
                    id="auto-reorder"
                    checked={settings.business.autoReorder}
                    onCheckedChange={(checked) => 
                      setSettings({
                        ...settings,
                        business: { ...settings.business, autoReorder: checked }
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business API Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Webhook Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Webhook URL:</span>
                      <code className="ml-2 bg-blue-100 px-2 py-1 rounded">
                        https://frgblvloxhcnwrgvjazk.supabase.co/functions/v1/whatsapp-webhook
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Verify Token:</span>
                      <code className="ml-2 bg-blue-100 px-2 py-1 rounded">
                        {settings.whatsapp.verifyToken}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-number-id">Phone Number ID</Label>
                    <Input
                      id="phone-number-id"
                      type="text"
                      placeholder="Enter your WhatsApp Phone Number ID"
                      value={settings.whatsapp.phoneNumberId}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, phoneNumberId: e.target.value }
                      })}
                    />
                    <p className="text-sm text-gray-500">
                      Find this in your Meta Business App → WhatsApp → API Setup
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-account-id">Business Account ID</Label>
                    <Input
                      id="business-account-id"
                      type="text"
                      placeholder="Enter your WhatsApp Business Account ID"
                      value={settings.whatsapp.businessAccountId}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, businessAccountId: e.target.value }
                      })}
                    />
                    <p className="text-sm text-gray-500">
                      Your WhatsApp Business Account ID from Meta Business Manager
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-token">Access Token</Label>
                    <Input
                      id="access-token"
                      type="password"
                      placeholder="Enter your WhatsApp Access Token"
                      value={settings.whatsapp.accessToken}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, accessToken: e.target.value }
                      })}
                    />
                    <p className="text-sm text-gray-500">
                      Generate a permanent token from Meta Business Suite
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-token">Verify Token</Label>
                    <Input
                      id="verify-token"
                      type="text"
                      value={settings.whatsapp.verifyToken}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, verifyToken: e.target.value }
                      })}
                    />
                    <p className="text-sm text-gray-500">
                      Use this token when setting up the webhook in Meta
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-name">Message Template Name</Label>
                    <Input
                      id="template-name"
                      type="text"
                      placeholder="hello_world"
                      value={settings.whatsapp.templateName}
                      onChange={(e) => setSettings({
                        ...settings,
                        whatsapp: { ...settings.whatsapp, templateName: e.target.value }
                      })}
                    />
                    <p className="text-sm text-gray-500">
                      Name of your approved message template (e.g., hello_world)
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleSaveWhatsAppSettings} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    Save WhatsApp Settings
                  </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                  <h3 className="font-medium text-amber-900 mb-2">⚠️ Important Setup Steps</h3>
                  <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
                    <li>Create a Meta Business App at developers.facebook.com</li>
                    <li>Add WhatsApp to your app and configure a phone number</li>
                    <li>Generate a permanent access token (not a temporary one)</li>
                    <li>Configure the webhook URL above in your Meta app</li>
                    <li>Subscribe to 'messages' webhook events</li>
                    <li>Create and approve message templates in Meta Business Suite</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Export & Backup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Export All Data</h3>
                      <p className="text-sm text-gray-500">Download a complete copy of your data</p>
                    </div>
                    <Button onClick={handleExportData} disabled={isLoading}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Backup History</h3>
                      <p className="text-sm text-gray-500">View and download previous backups</p>
                    </div>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="font-medium text-red-800">Delete Account</h3>
                    <p className="text-sm text-red-600 mb-3">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-8">
          <Button onClick={handleSaveSettings} disabled={isLoading} size="lg">
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

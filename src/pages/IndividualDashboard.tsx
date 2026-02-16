import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  User, 
  Search, 
  Building, 
  TestTube, 
  Upload, 
  Clock, 
  Package, 
  Heart, 
  FileText,
  MapPin,
  Phone,
  Star,
  MessageCircle
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  DashboardLayout,
  StatsCard,
  QuickActionCard,
  DashboardSection,
  ActivityCard,
  EmptyStateCard,
} from "@/components/dashboard";

import { useAuth } from "@/contexts/AuthContext";
import { useIndividualDashboard } from "@/hooks/useIndividualDashboard";
import LabResults from "@/components/individual/LabResults";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSubscription } from "@/hooks/useNotifications";

interface Pharmacy {
  id: string;
  name: string;
  location: string;
  phone: string;
  rating: number;
  open: boolean;
}

const IndividualDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isLoading, isError, stats, recentOrders } = useIndividualDashboard();
  const [nearbyPharmacies, setNearbyPharmacies] = useState<Pharmacy[]>([]);

  useNotificationSubscription();

  useEffect(() => {
    if (!user || user.role !== 'individual') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    async function fetchNearbyPharmacies() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, business_name, name, region, city, phone, address, is_approved')
        .eq('role', 'retail')
        .eq('is_approved', true)
        .limit(4);

      if (!error && Array.isArray(data)) {
        setNearbyPharmacies(
          data.map((p: any) => ({
            id: p.id,
            name: p.business_name || p.name || "Pharmacy",
            location: p.address || ((p.city && p.region) ? `${p.city}, ${p.region}` : 'Location not set'),
            phone: p.phone || 'N/A',
            rating: 4.5,
            open: true,
          }))
        );
      }
    }
    fetchNearbyPharmacies();
  }, []);

  if (!user || user.role !== 'individual') return null;

  const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case 'delivered': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name || 'there'}`}
      subtitle="Your personal health dashboard"
      icon={<User className="h-6 w-6" />}
      badge="Patient Portal"
      isLoading={isLoading}
      isError={isError}
    >
      {/* Bepawa Care CTA */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-emerald-500/5">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="p-6 lg:col-span-2 space-y-4">
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                New • Mental Health Support
              </Badge>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Bepawa Care</h3>
                <p className="text-muted-foreground">
                  Confidential, stigma-free therapy — anywhere in Tanzania. Chat 24/7 or book a licensed counselor.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="gap-2">
                  <Link to="/bepawa-care">
                    <Heart className="h-4 w-4" />
                    Explore Bepawa Care
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <a href="https://wa.me/255744969325" target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-500/20 rounded-r-lg" />
              <img
                src="https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?auto=format&fit=crop&w=800&q=80"
                alt="Mental health support"
                className="w-full h-full object-cover rounded-r-lg opacity-80"
                loading="lazy"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          subtitle="All time"
          icon={<Package className="h-5 w-5" />}
          variant="primary"
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pendingOrders}
          subtitle="In progress"
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatsCard
          title="Saved Items"
          value={stats.savedItems}
          subtitle="Wishlist"
          icon={<Heart className="h-5 w-5" />}
          variant="danger"
        />
        <StatsCard
          title="Active Prescriptions"
          value={stats.activePrescriptions}
          subtitle="Current"
          icon={<FileText className="h-5 w-5" />}
          variant="success"
        />
      </div>

      {/* Quick Actions */}
      <DashboardSection
        title="Quick Actions"
        description="What would you like to do?"
        icon={<Search className="h-4 w-4" />}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Browse Medicines"
            description="Search our catalog"
            icon={<Search className="h-5 w-5" />}
            href="/catalog"
            variant="primary"
          />
          <QuickActionCard
            title="Find Pharmacies"
            description="Nearby locations"
            icon={<Building className="h-5 w-5" />}
            href="/pharmacy-directory"
            variant="info"
          />
          <QuickActionCard
            title="Find Labs"
            description="Book lab tests"
            icon={<TestTube className="h-5 w-5" />}
            href="/lab-directory"
            variant="success"
          />
          <QuickActionCard
            title="PrEP & PEP"
            description="HIV prevention"
            icon={<Heart className="h-5 w-5" />}
            href="/prep-pep"
            variant="warning"
          />
          <QuickActionCard
            title="HIV Self-Test Kits"
            description="Order discreetly"
            icon={<Package className="h-5 w-5" />}
            href="/dashboard/personal-health#hiv"
            variant="warning"
          />
          <QuickActionCard
            title="Circumcision"
            description="Book safely"
            icon={<Star className="h-5 w-5" />}
            href="/dashboard/personal-health#circumcision"
            variant="info"
          />
          <QuickActionCard
            title="Prescriptions"
            description="Upload & manage"
            icon={<Upload className="h-5 w-5" />}
            href="/prescriptions"
          />
          <QuickActionCard
            title="Order History"
            description="View past orders"
            icon={<Clock className="h-5 w-5" />}
            href="/order-history"
          />
        </div>
      </DashboardSection>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Nearby Pharmacies */}
        <DashboardSection
          title="Nearby Pharmacies"
          description="Quick access to local pharmacies"
          icon={<Building className="h-4 w-4" />}
          action={{ label: "View All", href: "/pharmacy-directory" }}
        >
          {nearbyPharmacies.length === 0 ? (
            <EmptyStateCard
              icon={<Building className="h-6 w-6" />}
              title="No pharmacies found"
              description="We couldn't find any pharmacies nearby"
            />
          ) : (
            <div className="space-y-3">
              {nearbyPharmacies.map((pharmacy) => (
                <Card key={pharmacy.id} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{pharmacy.name}</h4>
                          <Badge variant="outline" className={pharmacy.open ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground"}>
                            {pharmacy.open ? "Open" : "Closed"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {pharmacy.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-500" />
                            {pharmacy.rating}
                          </span>
                        </div>
                        {pharmacy.phone !== 'N/A' && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {pharmacy.phone}
                          </span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/pharmacy/${pharmacy.id}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Recent Orders */}
        <DashboardSection
          title="Recent Orders"
          description="Your latest order activity"
          icon={<Package className="h-4 w-4" />}
          action={{ label: "View All", href: "/my-orders" }}
        >
          {recentOrders.length === 0 ? (
            <EmptyStateCard
              icon={<Package className="h-6 w-6" />}
              title="No orders yet"
              description="Start shopping to see your orders here"
              action={{ label: "Browse Medicines", href: "/catalog" }}
            />
          ) : (
            <div className="space-y-3">
              {recentOrders.slice(0, 4).map((order: any) => (
                <ActivityCard
                  key={order.id}
                  title={`Order #${order.order_number || order.id.slice(0, 8)}`}
                  subtitle={`TZS ${order.total_amount?.toLocaleString() || 0}`}
                  timestamp={new Date(order.created_at).toLocaleDateString()}
                  status={{
                    label: order.status?.replace(/-/g, ' ').toUpperCase() || 'PENDING',
                    variant: getStatusVariant(order.status),
                  }}
                  icon={<Package className="h-5 w-5" />}
                />
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Lab Results */}
      <DashboardSection
        title="Lab Results"
        description="Your recent lab test results"
        icon={<TestTube className="h-4 w-4" />}
        action={{ label: "View All", href: "/lab-directory" }}
      >
        <LabResults />
      </DashboardSection>
    </DashboardLayout>
  );
};

export default IndividualDashboard;

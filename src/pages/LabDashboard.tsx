import { useState } from "react";
import { 
  TestTube, 
  Calendar, 
  FileText, 
  BarChart3, 
  Bell, 
  Users,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import {
  DashboardLayout,
  StatsCard,
  DashboardSection,
  ActivityCard,
  EmptyStateCard,
} from "@/components/dashboard";

import { useAuth } from "@/contexts/AuthContext";
import { useLabDashboard } from "@/hooks/useLabDashboard";
import { useTodaysAppointments } from "@/hooks/useAppointments";
import AppointmentScheduler from "@/components/lab/AppointmentScheduler";
import AppointmentCalendar from "@/components/lab/AppointmentCalendar";
import LabResultsManager from "@/components/lab/LabResultsManager";
import LabTestCatalog from "@/components/lab/LabTestCatalog";
import LabAnalytics from "@/components/lab/LabAnalytics";
import SmartNotifications from "@/components/lab/SmartNotifications";
import PatientManagement from "@/components/lab/PatientManagement";

const LabDashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useLabDashboard();
  const { data: appointments, isLoading: appointmentsLoading } = useTodaysAppointments('lab');
  const [activeTab, setActiveTab] = useState("overview");
  const [showAppointmentScheduler, setShowAppointmentScheduler] = useState(false);
  
  const todayAppointments = appointments || [];
  const pendingResults = data?.testResults?.filter(result => 
    result.status === 'pending' || result.status === 'scheduled'
  ) || [];

  const stats = data?.stats || { 
    todayAppointments: 0, 
    pendingResults: 0, 
    urgentTests: 0, 
    completedToday: 0 
  };

  const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': case 'scheduled': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  return (
    <DashboardLayout
      title="Laboratory Dashboard"
      subtitle={`Welcome back, ${user?.name || user?.email || 'Lab Manager'}`}
      icon={<TestTube className="h-6 w-6" />}
      badge="Laboratory"
      isLoading={isLoading || appointmentsLoading}
      isError={isError}
      error={error as Error}
      onRetry={refetch}
      actions={
        <Button onClick={() => setShowAppointmentScheduler(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="rounded-xl border border-border bg-card p-1">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 bg-transparent gap-1">
            {[
              { value: "overview", icon: Activity, label: "Overview" },
              { value: "appointments", icon: Calendar, label: "Appointments" },
              { value: "results", icon: FileText, label: "Results" },
              { value: "catalog", icon: TestTube, label: "Catalog" },
              { value: "analytics", icon: BarChart3, label: "Analytics" },
              { value: "notifications", icon: Bell, label: "Notifications" },
              { value: "patients", icon: Users, label: "Patients" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 py-2.5 px-3 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Today's Appointments"
              value={stats.todayAppointments}
              subtitle="Scheduled tests"
              icon={<Calendar className="h-5 w-5" />}
              variant="primary"
            />
            <StatsCard
              title="Pending Results"
              value={stats.pendingResults}
              subtitle="Ready to send"
              icon={<FileText className="h-5 w-5" />}
              variant="warning"
            />
            <StatsCard
              title="Urgent Tests"
              value={stats.urgentTests}
              subtitle="Priority cases"
              icon={<AlertCircle className="h-5 w-5" />}
              variant="danger"
            />
            <StatsCard
              title="Completed Today"
              value={stats.completedToday}
              subtitle="Tests finished"
              icon={<CheckCircle className="h-5 w-5" />}
              variant="success"
            />
          </div>

          {/* Today's Overview */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Appointments */}
            <DashboardSection
              title="Today's Appointments"
              icon={<Calendar className="h-4 w-4" />}
              action={{ label: "View Calendar", onClick: () => setActiveTab("appointments") }}
            >
              <Card className="border-border">
                <CardContent className="p-4">
                  {todayAppointments.length === 0 ? (
                    <EmptyStateCard
                      icon={<Calendar className="h-6 w-6" />}
                      title="No appointments today"
                      description="All clear for today!"
                    />
                  ) : (
                    <div className="space-y-3">
                      {todayAppointments.slice(0, 5).map((appointment: any) => (
                        <ActivityCard
                          key={appointment.id}
                          title={appointment.patientName || 'Unknown Patient'}
                          subtitle={appointment.service_type}
                          timestamp={appointment.appointment_time}
                          status={{
                            label: appointment.status,
                            variant: getStatusVariant(appointment.status),
                          }}
                          icon={<Clock className="h-5 w-5" />}
                        />
                      ))}
                      {todayAppointments.length > 5 && (
                        <Button 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => setActiveTab("appointments")}
                        >
                          View all {todayAppointments.length} appointments
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </DashboardSection>

            {/* Pending Results */}
            <DashboardSection
              title="Pending Results"
              icon={<FileText className="h-4 w-4" />}
              action={{ label: "Manage Results", onClick: () => setActiveTab("results") }}
            >
              <Card className="border-border">
                <CardContent className="p-4">
                  {pendingResults.length === 0 ? (
                    <EmptyStateCard
                      icon={<CheckCircle className="h-6 w-6" />}
                      title="All results up to date"
                      description="Great job staying on top of things!"
                    />
                  ) : (
                    <div className="space-y-3">
                      {pendingResults.slice(0, 5).map((result: any) => (
                        <ActivityCard
                          key={result.id}
                          title={result.patientName || 'Unknown Patient'}
                          subtitle={result.testType}
                          timestamp={result.completedDate}
                          status={{
                            label: result.status,
                            variant: getStatusVariant(result.status),
                          }}
                          icon={<FileText className="h-5 w-5" />}
                        />
                      ))}
                      {pendingResults.length > 5 && (
                        <Button 
                          variant="ghost" 
                          className="w-full" 
                          onClick={() => setActiveTab("results")}
                        >
                          View all {pendingResults.length} pending results
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </DashboardSection>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Appointment Management</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Schedule and manage laboratory appointments
                  </p>
                </div>
                <Button onClick={() => setShowAppointmentScheduler(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <AppointmentCalendar />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Lab Results Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create, manage, and track laboratory test results
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <LabResultsManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Lab Test Catalog</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage available laboratory tests and their specifications
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <LabTestCatalog />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Analytics & Reporting</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive insights into laboratory operations
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <LabAnalytics />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Smart Notifications</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure automated notifications for patients and staff
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <SmartNotifications />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-6 mt-0">
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground">Patient Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage patient profiles, medical history, and records
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <PatientManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Appointment Scheduler Modal */}
      <AppointmentScheduler
        isOpen={showAppointmentScheduler}
        onClose={() => setShowAppointmentScheduler(false)}
        onAppointmentCreated={() => refetch()}
        lab={user ? { id: user.id, name: user.name || user.email } : undefined}
      />
    </DashboardLayout>
  );
};

export default LabDashboard;

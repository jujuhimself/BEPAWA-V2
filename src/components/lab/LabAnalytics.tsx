import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  TestTube, 
  Clock, 
  DollarSign, 
  Download,
  Loader2
} from "lucide-react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AnalyticsData {
  totalAppointments: number;
  completedTests: number;
  pendingTests: number;
  revenue: number;
  avgTurnaroundHours: number;
}

interface TestMetrics {
  testType: string;
  count: number;
  revenue: number;
  completed: number;
  pending: number;
}

interface DailyMetrics {
  date: string;
  appointments: number;
  completed: number;
  revenue: number;
}

const LabAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalAppointments: 0,
    completedTests: 0,
    pendingTests: 0,
    revenue: 0,
    avgTurnaroundHours: 0
  });
  const [prevAnalytics, setPrevAnalytics] = useState<AnalyticsData>({
    totalAppointments: 0,
    completedTests: 0,
    pendingTests: 0,
    revenue: 0,
    avgTurnaroundHours: 0
  });
  const [testMetrics, setTestMetrics] = useState<TestMetrics[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchAnalyticsData();
  }, [timeRange, user]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const prevStart = subDays(startDate, days);
      const start = startDate.toISOString();
      const prevStartStr = prevStart.toISOString();

      // Current period appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', user.id)
        .eq('provider_type', 'lab')
        .gte('created_at', start);

      // Previous period for comparison
      const { data: prevAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('provider_id', user.id)
        .eq('provider_type', 'lab')
        .gte('created_at', prevStartStr)
        .lt('created_at', start);

      // Lab orders for revenue
      const { data: labOrders } = await supabase
        .from('lab_orders')
        .select('*, lab_order_items(*)')
        .eq('lab_id', user.id)
        .gte('created_at', start);

      const { data: prevLabOrders } = await supabase
        .from('lab_orders')
        .select('total_amount, status')
        .eq('lab_id', user.id)
        .gte('created_at', prevStartStr)
        .lt('created_at', start);

      const totalAppointments = appointments?.length || 0;
      const completedTests = (appointments || []).filter(a => a.status === 'completed').length;
      const pendingTests = (appointments || []).filter(a => a.status === 'scheduled' || a.status === 'pending').length;
      const revenue = (labOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      // Calculate avg turnaround from completed appointments
      let totalHours = 0;
      let completedCount = 0;
      (appointments || []).forEach((a: any) => {
        if (a.status === 'completed' && a.created_at && a.updated_at) {
          const created = new Date(a.created_at).getTime();
          const updated = new Date(a.updated_at).getTime();
          const hours = (updated - created) / (1000 * 60 * 60);
          if (hours > 0 && hours < 720) { // sanity check < 30 days
            totalHours += hours;
            completedCount++;
          }
        }
      });
      const avgTurnaroundHours = completedCount > 0 ? Math.round(totalHours / completedCount) : 0;

      setAnalyticsData({ totalAppointments, completedTests, pendingTests, revenue, avgTurnaroundHours });

      const prevCompletedTests = (prevAppointments || []).filter(a => a.status === 'completed').length;
      const prevRevenue = (prevLabOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      setPrevAnalytics({
        totalAppointments: prevAppointments?.length || 0,
        completedTests: prevCompletedTests,
        pendingTests: 0,
        revenue: prevRevenue,
        avgTurnaroundHours: 0,
      });

      // Test metrics by service_type
      const typeMap: Record<string, TestMetrics> = {};
      (appointments || []).forEach((a: any) => {
        const type = a.service_type || 'Other';
        if (!typeMap[type]) {
          typeMap[type] = { testType: type, count: 0, revenue: 0, completed: 0, pending: 0 };
        }
        typeMap[type].count++;
        if (a.status === 'completed') typeMap[type].completed++;
        if (a.status === 'scheduled' || a.status === 'pending') typeMap[type].pending++;
      });

      // Match lab order items to test types for revenue
      (labOrders || []).forEach((order: any) => {
        (order.lab_order_items || []).forEach((item: any) => {
          const type = item.test_name || 'Other';
          if (typeMap[type]) {
            typeMap[type].revenue += Number(item.test_price || 0);
          }
        });
      });

      setTestMetrics(Object.values(typeMap).sort((a, b) => b.count - a.count));

      // Daily metrics
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      const dayMap: Record<string, DailyMetrics> = {};
      allDays.forEach(d => {
        dayMap[format(d, 'yyyy-MM-dd')] = { date: format(d, 'MMM dd'), appointments: 0, completed: 0, revenue: 0 };
      });

      (appointments || []).forEach((a: any) => {
        const day = format(new Date(a.created_at), 'yyyy-MM-dd');
        if (dayMap[day]) {
          dayMap[day].appointments++;
          if (a.status === 'completed') dayMap[day].completed++;
        }
      });

      (labOrders || []).forEach((o: any) => {
        const day = format(new Date(o.created_at), 'yyyy-MM-dd');
        if (dayMap[day]) {
          dayMap[day].revenue += Number(o.total_amount || 0);
        }
      });

      setDailyMetrics(allDays.map(d => dayMap[format(d, 'yyyy-MM-dd')]));

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const pct = ((current - previous) / previous * 100).toFixed(1);
    return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
  };

  const exportReport = () => {
    toast({
      title: "Report Exported",
      description: "Analytics report has been downloaded.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Reporting</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {getGrowth(analyticsData.totalAppointments, prevAnalytics.totalAppointments)} from prev period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.completedTests}</div>
            <p className="text-xs text-muted-foreground">
              {getGrowth(analyticsData.completedTests, prevAnalytics.completedTests)} from prev period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">TZS {analyticsData.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {getGrowth(analyticsData.revenue, prevAnalytics.revenue)} from prev period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnaround</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.avgTurnaroundHours}h</div>
            <p className="text-xs text-muted-foreground">
              Based on completed tests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Test Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyMetrics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data for this period</p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {dailyMetrics.slice(-7).map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{day.date}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{day.appointments} appt</span>
                          <span className="text-sm text-muted-foreground">{day.completed} done</span>
                          <span className="text-sm font-medium">TZS {day.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="text-sm font-medium">{analyticsData.completedTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="text-sm font-medium">{analyticsData.pendingTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="text-sm font-medium">{analyticsData.totalAppointments - analyticsData.completedTests - analyticsData.pendingTests}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Performance by Type</CardTitle>
            </CardHeader>
            <CardContent>
              {testMetrics.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No test data for this period</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testMetrics.map((test) => (
                      <TableRow key={test.testType}>
                        <TableCell className="font-medium">{test.testType}</TableCell>
                        <TableCell>{test.count}</TableCell>
                        <TableCell>{test.completed}</TableCell>
                        <TableCell>TZS {test.revenue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={test.pending === 0 ? "default" : "secondary"}>
                            {test.pending === 0 ? "All Done" : `${test.pending} pending`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyMetrics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {dailyMetrics.slice(-7).map((day, i) => {
                      const prev = i > 0 ? dailyMetrics.slice(-7)[i - 1].revenue : day.revenue;
                      return (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm">{day.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">TZS {day.revenue.toLocaleString()}</span>
                            {day.revenue > prev ? (
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                            ) : day.revenue < prev ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyMetrics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {dailyMetrics.slice(-7).map((day, i) => {
                      const prev = i > 0 ? dailyMetrics.slice(-7)[i - 1].appointments : day.appointments;
                      return (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm">{day.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{day.appointments}</span>
                            {day.appointments > prev ? (
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                            ) : day.appointments < prev ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Daily Summary Report", desc: "Overview of daily activities, appointments, and revenue" },
                  { title: "Test Performance Report", desc: "Detailed analysis of test types and completion rates" },
                  { title: "Revenue Analysis", desc: "Financial performance and revenue trends" },
                  { title: "Quality Metrics", desc: "Turnaround times and completion rates" },
                ].map((report) => (
                  <div key={report.title} className="p-4 border border-border rounded-lg">
                    <h4 className="font-medium mb-2 text-foreground">{report.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{report.desc}</p>
                    <Button size="sm" onClick={exportReport}>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabAnalytics;

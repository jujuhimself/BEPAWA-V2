import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Download, FileText, BarChart3, TrendingUp, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { inventoryService } from "@/services/inventoryService";
import type { DateRange } from "react-day-picker";

const InventoryReports = () => {
  const [reportType, setReportType] = useState("stock-levels");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [format, setFormat] = useState("csv");
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<Array<{ name: string; date: string; format: string; blob: Blob }>>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const reportTypes = [
    { value: "stock-levels", label: "Current Stock Levels", icon: Package },
    { value: "low-stock", label: "Low Stock Alert Report", icon: BarChart3 },
    { value: "expiry-report", label: "Product Expiry Report", icon: FileText },
    { value: "movement-history", label: "Inventory Movement History", icon: TrendingUp },
  ];

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) setDateRange(range);
  };

  const generateCSV = (headers: string[], rows: string[][]): Blob => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReport = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      let blob: Blob;
      const selectedReport = reportTypes.find(r => r.value === reportType);
      const reportName = selectedReport?.label || reportType;
      const dateStr = new Date().toISOString().split('T')[0];

      if (reportType === 'stock-levels') {
        const products = await inventoryService.getProducts(user.role);
        const headers = ['Name', 'Category', 'Stock', 'Min Stock', 'Buy Price', 'Sell Price', 'Status', 'Expiry Date'];
        const rows = products.map(p => [p.name, p.category, String(p.stock), String(p.min_stock), String(p.buy_price), String(p.sell_price), p.status, p.expiry_date || '']);
        blob = generateCSV(headers, rows);
      } else if (reportType === 'low-stock') {
        const products = await inventoryService.getLowStockProducts();
        const headers = ['Name', 'Category', 'Current Stock', 'Min Stock Level', 'Status'];
        const rows = products.map(p => [p.name, p.category, String(p.stock), String(p.min_stock), p.status]);
        blob = generateCSV(headers, rows);
      } else if (reportType === 'expiry-report') {
        const products = await inventoryService.getExpiringProducts(90);
        const headers = ['Name', 'Category', 'Stock', 'Expiry Date', 'Status'];
        const rows = products.map(p => [p.name, p.category, String(p.stock), p.expiry_date || '', p.status]);
        blob = generateCSV(headers, rows);
      } else {
        const movements = await inventoryService.getInventoryMovements();
        const headers = ['Date', 'Product ID', 'Type', 'Quantity', 'Reason'];
        const rows = movements.map(m => [m.created_at, m.product_id, m.movement_type, String(m.quantity), m.reason || '']);
        blob = generateCSV(headers, rows);
      }

      const filename = `${reportType}_${dateStr}.csv`;
      downloadBlob(blob, filename);

      setRecentReports(prev => [{ name: reportName, date: dateStr, format: 'CSV', blob }, ...prev].slice(0, 10));

      toast({ title: "Report Generated", description: `${reportName} has been downloaded.` });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({ title: "Error", description: "Failed to generate report. Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Generate Inventory Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{type.label}</div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <DatePickerWithRange date={dateRange} onDateChange={handleDateRangeChange} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={generateReport} disabled={generating} className="flex items-center gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Generate & Download'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { type: 'stock-levels', label: 'Current Stock', desc: 'Real-time inventory levels', color: 'bg-primary/10', iconColor: 'text-primary', Icon: Package },
          { type: 'low-stock', label: 'Low Stock Alert', desc: 'Items below minimum', color: 'bg-destructive/10', iconColor: 'text-destructive', Icon: BarChart3 },
          { type: 'expiry-report', label: 'Expiry Report', desc: 'Products nearing expiry', color: 'bg-accent/50', iconColor: 'text-accent-foreground', Icon: FileText },
        ].map(({ type, label, desc, color, iconColor, Icon }) => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setReportType(type); generateReport(); }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${color} p-2 rounded-lg`}><Icon className={`h-5 w-5 ${iconColor}`} /></div>
                <div><h3 className="font-medium">{label}</h3><p className="text-sm text-muted-foreground">{desc}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reports (session-based) */}
      {recentReports.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Reports</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.date} • {report.format}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => downloadBlob(report.blob, `${report.name.replace(/\s+/g, '_')}_${report.date}.csv`)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryReports;

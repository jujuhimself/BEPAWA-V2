import { useState, useEffect } from "react";
import { inventoryForecastService, InventoryForecast } from "@/services/inventoryForecastService";
import { inventoryService, Product } from "@/services/inventoryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ExportButton from "@/components/ExportButton";
import DateRangeFilter from "@/components/DateRangeFilter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PharmacyForecast() {
  const { user } = useAuth();
  const [forecasted_demand, setForecastedDemand] = useState("");
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [date, setDate] = useState("");
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [filtered, setFiltered] = useState<InventoryForecast[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    inventoryForecastService.fetchForecasts().then(setForecasts);
    if (user) {
      inventoryService.getProducts(user.role).then(setProducts);
    }
  }, [user]);

  useEffect(() => {
    setFiltered(
      forecasts.filter(f => {
        const dt = new Date(f.forecast_date);
        const fromOk = !from || (dt >= new Date(from));
        const toOk = !to || (dt <= new Date(to));
        return fromOk && toOk && f.user_id === user?.id;
      })
    );
  }, [forecasts, from, to, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !forecasted_demand || !productId || !date) return;
    try {
      await inventoryForecastService.addForecast({
        user_id: user.id,
        product_id: productId,
        forecast_date: date,
        forecasted_demand: Number(forecasted_demand)
      });
      setForecastedDemand("");
      setProductName("");
      setProductId("");
      setDate("");
      toast({ title: "Forecast logged" });
      inventoryForecastService.fetchForecasts().then(setForecasts);
    } catch {
      toast({ title: "Error logging forecast", variant: "destructive" });
    }
  }

  // Prepare chart data
  const chartData = filtered.map(f => ({
    date: f.forecast_date,
    Forecast: f.forecasted_demand,
    Actual: f.actual ?? null
  }));

  // Autocomplete logic
  const filteredProducts = productSearch.length === 0
    ? []
    : products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4 text-blue-800">Inventory Forecasting (Pharmacy)</h1>
      <p className="mb-6 text-gray-700">
        <b>What is this?</b> <br />
        Inventory forecasting helps you predict how much stock you'll need in the future. This tool lets you log your expected demand for each product, see trends, and compare with actual sales. <br />
        <span className="text-blue-600">Tip:</span> Use this to avoid running out of stock or over-ordering.
      </p>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log a New Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm font-medium">Product <span className="text-gray-400">(type to search by name)</span></label>
            <div className="relative">
              <Input
                placeholder="Start typing product name..."
                value={productName}
                onChange={e => {
                  setProductName(e.target.value);
                  setProductSearch(e.target.value);
                  setShowDropdown(true);
                  setProductId("");
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
                required
              />
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-10 bg-white border border-gray-200 rounded shadow w-full max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                      onClick={() => {
                        setProductName(p.name);
                        setProductId(p.id);
                        setShowDropdown(false);
                      }}
                    >
                      {p.name} <span className="text-gray-400">({p.category})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="text-sm font-medium">Forecast Date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            <label className="text-sm font-medium">Expected Demand <span className="text-gray-400">(How many units do you expect to sell?)</span></label>
            <Input
              type="number"
              value={forecasted_demand}
              onChange={e => setForecastedDemand(e.target.value)}
              placeholder="Forecasted Demand"
              min="0"
              required
            />
            <Button type="submit" disabled={!productId}>Log Forecast</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Forecast Trends & Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div>No forecast data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="Forecast" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <ExportButton data={filtered} filename="pharmacy-forecasts.csv" disabled={filtered.length === 0} />
          </div>
          {filtered.length === 0 ? (
            <div>No forecasts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Date</th>
                    <th>Forecast</th>
                    <th>Actual</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 20).map(f => (
                    <tr key={f.id}>
                      <td>{f.product_name || f.product_id}</td>
                      <td>{f.forecast_date}</td>
                      <td>{f.forecasted_demand}</td>
                      <td>{f.actual ?? "-"}</td>
                      <td>{f.id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
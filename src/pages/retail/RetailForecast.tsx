
import { useState, useEffect } from "react";
import { inventoryForecastService, InventoryForecast } from "@/services/inventoryForecastService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ExportButton from "@/components/ExportButton";
import DateRangeFilter from "@/components/DateRangeFilter";
import UserSelect from "@/components/UserSelect";

export default function RetailForecast() {
  const { user } = useAuth();
  const [forecasted_demand, setForecastedDemand] = useState("");
  const [product_id, setProductId] = useState("");
  const [date, setDate] = useState("");
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [filtered, setFiltered] = useState<InventoryForecast[]>([]);
  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    inventoryForecastService.fetchForecasts().then(setForecasts);
  }, []);

  useEffect(() => {
    setFiltered(
      forecasts.filter(f => {
        const dt = new Date(f.forecast_date);
        const fromOk = !from || (dt >= new Date(from));
        const toOk = !to || (dt <= new Date(to));
        const userOk = !userId || f.user_id === userId;
        return fromOk && toOk && userOk;
      })
    );
  }, [forecasts, from, to, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !forecasted_demand || !product_id || !date) return;
    try {
      await inventoryForecastService.addForecast({
        user_id: user.id,
        product_id,
        forecast_date: date,
        forecasted_demand: Number(forecasted_demand)
      });
      setForecastedDemand("");
      setProductId("");
      setDate("");
      toast({ title: "Forecast logged" });
      inventoryForecastService.fetchForecasts().then(setForecasts);
    } catch {
      toast({ title: "Error logging forecast", variant: "destructive" });
    }
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Log Inventory Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              placeholder="Product ID"
              value={product_id}
              onChange={e => setProductId(e.target.value)}
              required
            />
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            <Input
              type="number"
              value={forecasted_demand}
              onChange={e => setForecastedDemand(e.target.value)}
              placeholder="Forecasted Demand"
              min="0"
              required
            />
            <Button type="submit">Log Forecast</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Recent Forecasts
            <span className="float-right">
              <ExportButton data={filtered} filename="forecasts.csv" disabled={filtered.length === 0} />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
            <UserSelect value={userId} onChange={setUserId} user={user} />
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
                    <th>User</th>
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
                      <td className="text-blue-800">{f.user_id?.slice(0, 8)}</td>
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

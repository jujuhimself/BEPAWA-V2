import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Clock, Package, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { dataService } from "@/services/dataService";
import { orderService } from "@/services/orderService";

interface OrderHistory {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  orderDate: string;
  image: string;
}

const QuickReorder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      if (!user) return;
      setLoadingOrders(true);
      setEmptyMessage(null);
      try {
        const orders = await dataService.getOrders(user.id, user.role);
        if (!orders || orders.length === 0) {
          setOrderHistory([]);
          setEmptyMessage("Your recent orders will appear here once you place an order.");
          setLoadingOrders(false);
          return;
        }
        const recentOrders = orders
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        const allItems: OrderHistory[] = [];
        for (const order of recentOrders) {
          const items = await orderService.getOrderItems(order.id);
          if (items && items.length > 0) {
            items.forEach(item => {
              allItems.push({
                id: item.id,
                productId: item.product_id || item.id,
                productName: item.product_name,
                quantity: item.quantity,
                price: item.unit_price,
                orderDate: order.created_at,
                image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400"
              });
            });
          }
        }
        if (allItems.length === 0) {
          setEmptyMessage("Your recent order items will appear here once you purchase products.");
        }
        setOrderHistory(allItems);
      } catch (err) {
        setEmptyMessage("Failed to load order history. Please try again later.");
      }
      setLoadingOrders(false);
    };
    fetchOrderHistory();
  }, [user]);

  const quickReorder = async (item: OrderHistory) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to reorder items",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Reordered successfully",
        description: `${item.productName} (x${item.quantity}) has been added to your cart`,
      });
    }, 1000);
  };

  if (!user) return null;

  if (loadingOrders) {
    return (
      <Card className="w-full bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            Quick Reorder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading your recent orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (emptyMessage) {
    return (
      <Card className="w-full bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            Quick Reorder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 dark:bg-muted/10 rounded-lg border-2 border-dashed border-border">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          Quick Reorder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orderHistory.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div>
                  <h4 className="font-medium text-sm text-foreground">{item.productName}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>Qty: {item.quantity}</span>
                    <Badge variant="outline" className="text-xs border-border">
                      {new Date(item.orderDate).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => quickReorder(item)}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <ShoppingCart className="h-3 w-3" />
                Reorder
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickReorder;

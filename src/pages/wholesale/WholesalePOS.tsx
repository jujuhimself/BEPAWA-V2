import { useEffect, useState } from "react";
import { posService, PosSale } from "@/services/posService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ExportButton from "@/components/ExportButton";
import DateRangeFilter from "@/components/DateRangeFilter";
import UserSelect from "@/components/UserSelect";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";

interface CartItem {
  product: Tables<'products'>;
  quantity: number;
  unitPrice: number;
}

export default function WholesalePOS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<PosSale[]>([]);
  const [filtered, setFiltered] = useState<PosSale[]>([]);
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [method, setMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userId, setUserId] = useState("");
  const [payType, setPayType] = useState("");

  // Fetch products and sales on component mount
  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchSales();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products for wholesaler:', user?.id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('wholesaler_id', user?.id)
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      
      console.log('Products fetched from POS:', data?.length || 0, 'products');
      console.log('Products data:', data);
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error loading products",
        description: "Could not load products for POS",
        variant: "destructive",
      });
    }
  };

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_sales')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: "Error loading sales",
        description: "Could not load sales history",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setFiltered(
      sales.filter(s => {
        const dateOk = (!from || new Date(s.sale_date) >= new Date(from)) &&
          (!to || new Date(s.sale_date) <= new Date(to));
        const userOk = !userId || s.user_id === userId;
        const pmOk = !payType || s.payment_method === payType;
        return dateOk && userOk && pmOk;
      })
    );
  }, [sales, from, to, userId, payType]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Tables<'products'>) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({
          title: "Stock limit reached",
          description: `Only ${product.stock} units available`,
          variant: "destructive",
        });
      }
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice: Number(product.sell_price)
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = cart.find(item => item.product.id === productId);
    if (!item) return;

    if (quantity <= 0) {
      removeFromCart(productId);
    } else if (quantity <= item.product.stock) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    } else {
      toast({
        title: "Stock limit reached",
        description: `Only ${item.product.stock} units available`,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || cart.length === 0) {
      toast({
        title: "Invalid sale",
        description: "Please add items to cart",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = getCartTotal();
      
      // Create the sale - user.id is org id, authUserId is the actual staff/user
      const saleData = await posService.createSale(
        {
          user_id: user.id,
          sale_date: new Date().toISOString(),
          total_amount: totalAmount,
          payment_method: method,
          customer_name: customerName || undefined,
          ...(user.isStaff ? { sold_by_user_id: user.authUserId } : {}),
        } as any,
        cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice,
        }))
      );

      // Update product stock
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product.id);
      }

      // Create inventory movement record
      for (const item of cart) {
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product.id,
            quantity: -item.quantity, // Negative for sales
            movement_type: 'sale',
            reason: `POS sale - ${saleData.id}`,
            user_id: user.id,
          });
      }

      toast({
        title: "Sale completed",
        description: `Sale of ${totalAmount.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS' })} recorded`,
      });

      clearCart();
      fetchProducts(); // Refresh product stock
      fetchSales(); // Refresh sales list
    } catch (error) {
      console.error('Error creating sale:', error);
      toast({
        title: "Error completing sale",
        description: "Could not process the sale",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sales.length > 0) {
      const allIds = new Set<string>();
      sales.forEach(s => {
        allIds.add(s.user_id);
        if ((s as any).sold_by_user_id) allIds.add((s as any).sold_by_user_id);
      });
      supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', Array.from(allIds))
        .then(({ data }) => {
          const map: Record<string, string> = {};
          (data || []).forEach((p: any) => {
            map[p.id] = p.name || p.email || p.id;
          });
          setUserProfiles(map);
        });
    }
  }, [sales]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Product Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      Stock: {product.stock} | {Number(product.sell_price).toLocaleString('en-TZ', { style: 'currency', currency: 'TZS' })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cart and Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.unitPrice.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS' })} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total:</span>
                    <span>{getCartTotal().toLocaleString('en-TZ', { style: 'currency', currency: 'TZS' })}</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Customer name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-PESA</option>
                      <option value="card">Card</option>
                      <option value="credit">Credit</option>
                    </select>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isLoading}>
                        {isLoading ? "Processing..." : "Complete Sale"}
                      </Button>
                      <Button type="button" variant="outline" onClick={clearCart}>
                        Clear Cart
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sales History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Recent Sales
              <span className="float-right">
                <ExportButton
                  data={filtered}
                  filename="wholesale-sales.csv"
                  disabled={filtered.length === 0}
                />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <DateRangeFilter from={from} to={to} setFrom={setFrom} setTo={setTo} />
              <UserSelect value={userId} onChange={setUserId} user={user} />
              <div>
                <label className="text-sm mr-1">Payment Method:</label>
                <select 
                  className="border rounded px-2 py-1 text-sm"
                  value={payType} 
                  onChange={e => setPayType(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-PESA</option>
                  <option value="card">Card</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map(sale => (
                    <tr key={sale.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(sale.sale_date).toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{sale.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{userProfiles[(sale as any).sold_by_user_id || sale.user_id] || sale.user_id}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{Number(sale.total_amount).toLocaleString('en-TZ', { style: 'currency', currency: 'TZS' })}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{sale.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

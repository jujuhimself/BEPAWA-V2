
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ShoppingCart, DollarSign, Receipt, Building, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useInventory";

interface CartItem {
  id: string;
  name: string;
  wholesalePrice: number;
  retailPrice: number;
  quantity: number;
  stock: number;
  isWholesale: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  vat_rate: number;
  wht_rate: number;
}

const WholesaleAdvancedPOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerType, setCustomerType] = useState<"wholesale" | "retail">("retail");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pos");

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code, vat_rate, wht_rate')
        .eq('parent_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setBranches((data || []) as Branch[]);
      if (data && data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching branches:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    const price = customerType === 'wholesale' ? product.buy_price * 1.1 : product.sell_price;
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} units available`,
          variant: "destructive",
        });
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, {
          id: product.id,
          name: product.name,
          wholesalePrice: product.buy_price * 1.1,
          retailPrice: product.sell_price,
          quantity: 1,
          stock: product.stock,
          isWholesale: customerType === 'wholesale'
        }]);
      }
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      const item = cart.find(item => item.id === id);
      if (item && newQuantity <= item.stock) {
        setCart(cart.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        ));
      }
    }
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.isWholesale ? item.wholesalePrice : item.retailPrice;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getCurrentBranch = () => branches.find(b => b.id === selectedBranch);

  const getTaxAmount = () => {
    const branch = getCurrentBranch();
    if (!branch) return 0;
    return getSubtotal() * (branch.vat_rate / 100);
  };

  const getTotalAmount = () => {
    return getSubtotal() + getTaxAmount();
  };

  const processSale = async () => {
    if (!user || cart.length === 0 || !selectedBranch) return;

    try {
      const branch = getCurrentBranch();
      if (!branch) throw new Error('No branch selected');

      // Create POS sale
      const { data: saleData, error: saleError } = await supabase
        .from('pos_sales')
        .insert({
          user_id: user.id,
          total_amount: getTotalAmount(),
          payment_method: paymentMethod,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update inventory
      for (const item of cart) {
        const price = item.isWholesale ? item.wholesalePrice : item.retailPrice;
        
        await supabase
          .from('pos_sale_items')
          .insert({
            pos_sale_id: saleData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: price,
            total_price: price * item.quantity,
          });

        // Update product stock
        await supabase
          .from('products')
          .update({ 
            stock: item.stock - item.quantity 
          })
          .eq('id', item.id);

        // Log inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            user_id: user.id,
            product_id: item.id,
            movement_type: 'out',
            quantity: item.quantity,
            reason: `POS Sale - ${saleData.id}`,
            created_by: user.id
          });
      }

      toast({
        title: "Sale Completed",
        description: `Sale processed successfully. Total: TZS ${getTotalAmount().toLocaleString()}`,
      });

      // Reset form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerTaxId("");
      setPaymentMethod("cash");
      setIsCheckoutOpen(false);

    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Advanced Wholesale POS</h2>
          <p className="text-gray-600">Multi-branch POS with wholesale/retail pricing</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {branch.name} ({branch.code})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Cart: {cart.length} items
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pos">POS System</TabsTrigger>
          <TabsTrigger value="settings">Tax Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Products</CardTitle>
                    <div className="flex gap-2">
                      <Select value={customerType} onValueChange={(value: "wholesale" | "retail") => setCustomerType(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.sku}</p>
                          </div>
                          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                            {product.stock} in stock
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-lg font-bold">
                              TZS {customerType === 'wholesale' 
                                ? (product.buy_price * 1.1).toLocaleString() 
                                : product.sell_price.toLocaleString()}
                            </div>
                            {customerType === 'wholesale' && (
                              <div className="text-sm text-gray-500">
                                Retail: TZS {product.sell_price.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => addToCart(product)}
                            disabled={product.stock === 0}
                            size="sm"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Shopping Cart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Cart is empty</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              TZS {(item.isWholesale ? item.wholesalePrice : item.retailPrice).toLocaleString()}
                              {item.isWholesale && <Badge variant="secondary" className="ml-2">Wholesale</Badge>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>TZS {getSubtotal().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({getCurrentBranch()?.vat_rate || 0}%):</span>
                          <span>TZS {getTaxAmount().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>TZS {getTotalAmount().toLocaleString()}</span>
                        </div>
                      </div>
                      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full" disabled={!selectedBranch}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Checkout
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Complete Sale</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Customer Name</label>
                                <Input
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  placeholder="Enter customer name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Customer Phone</label>
                                <Input
                                  value={customerPhone}
                                  onChange={(e) => setCustomerPhone(e.target.value)}
                                  placeholder="Enter phone number"
                                />
                              </div>
                            </div>
                            {customerType === 'wholesale' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">Tax ID (Optional)</label>
                                <Input
                                  value={customerTaxId}
                                  onChange={(e) => setCustomerTaxId(e.target.value)}
                                  placeholder="Enter tax identification"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-medium mb-1">Payment Method</label>
                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="credit">Credit</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="border rounded-lg p-4 bg-gray-50">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>TZS {getSubtotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>VAT ({getCurrentBranch()?.vat_rate || 0}%):</span>
                                  <span>TZS {getTaxAmount().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                  <span>Total:</span>
                                  <span>TZS {getTotalAmount().toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <Button onClick={processSale} className="w-full">
                              <Receipt className="h-4 w-4 mr-2" />
                              Complete Sale
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Branch Tax Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {branches.map((branch) => (
                <div key={branch.id} className="border rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-2">{branch.name} ({branch.code})</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
                      <Input
                        type="number"
                        value={branch.vat_rate}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">WHT Rate (%)</label>
                      <Input
                        type="number"
                        value={branch.wht_rate}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WholesaleAdvancedPOS;

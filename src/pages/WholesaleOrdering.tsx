import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Package, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { creditService } from '@/services/creditService';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  supplier: string;
  min_order_qty?: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const WholesaleOrdering = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [payWithCredit, setPayWithCredit] = useState(false);
  const [creditAccount, setCreditAccount] = useState<any>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch only wholesale products from wholesaler users
        const { data: wholesalerProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'wholesale');

        const wholesalerIds = (wholesalerProfiles || []).map((p: any) => p.id);

        if (wholesalerIds.length === 0) {
          setProducts([]);
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('user_id', wholesalerIds)
          .eq('is_wholesale_product', true)
          .order('name');

        if (error) {
          console.error('Error fetching products:', error);
          toast({
            title: "Error",
            description: "Failed to load products",
            variant: "destructive",
          });
          return;
        }

        const transformedProducts = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.sell_price || 0,
          stock: item.stock,
          description: item.description || '',
          supplier: item.supplier || '',
          min_order_qty: item.min_stock_level || 1
        }));

        setProducts(transformedProducts);
      } catch (error: any) {
        console.error('Unexpected error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      }
    };

    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching suppliers:', error);
          toast({
            title: "Error",
            description: "Failed to load suppliers",
            variant: "destructive",
          });
          return;
        }

        setSuppliers(data || []);
      } catch (error: any) {
        console.error('Unexpected error fetching suppliers:', error);
        toast({
          title: "Error",
          description: "Failed to load suppliers",
          variant: "destructive",
        });
      }
    };

    if (user) {
      fetchProducts();
      fetchSuppliers();
    }
  }, [user, toast]);

  useEffect(() => {
    async function fetchCreditAccount() {
      if (!user || !selectedSupplier) {
        setCreditAccount(null);
        return;
      }
      const accounts = await creditService.fetchAccounts();
      const account = accounts.find(acc => acc.wholesaler_user_id === selectedSupplier && acc.retailer_id === user.id);
      setCreditAccount(account || null);
    }
    fetchCreditAccount();
  }, [user, selectedSupplier]);

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setOrderItems(prev => prev.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setOrderItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price
      }]);
    }

    toast({
      title: "Added to order",
      description: `${product.name} added to your order`,
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId);
      return;
    }

    setOrderItems(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
        : item
    ));
  };

  const removeFromOrder = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const submitOrder = async () => {
    if (!user || orderItems.length === 0 || !selectedSupplier) {
      toast({
        title: "Error",
        description: "Please select a supplier and add items to your order",
        variant: "destructive",
      });
      return;
    }
    if (payWithCredit) {
      if (!creditAccount || creditAccount.status !== 'active') {
        toast({ title: 'Credit Error', description: 'No active credit account with this wholesaler.', variant: 'destructive' });
        return;
      }
      if (creditAccount.credit_limit - creditAccount.current_balance < getTotalAmount()) {
        toast({ title: 'Credit Limit Exceeded', description: 'Not enough available credit for this order.', variant: 'destructive' });
        return;
      }
    }
    setIsLoading(true);

    try {
      // Create purchase order
      const orderData = {
        user_id: user.id,
        supplier_id: selectedSupplier,
        total_amount: getTotalAmount(),
        status: 'pending',
        po_number: `PO-${Date.now()}`,
        order_date: new Date().toISOString().split('T')[0],
        notes: notes || null
      };

      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsData = orderItems.map(item => ({
        purchase_order_id: order.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Order submitted!",
        description: `Purchase order ${order.po_number} has been submitted successfully`,
      });

      // Reset form
      setOrderItems([]);
      setSelectedSupplier("");
      setNotes("");

      // If payWithCredit, update credit balance
      if (payWithCredit && creditAccount) {
        await creditService.updateAccountBalance(creditAccount.id, creditAccount.current_balance + getTotalAmount());
      }

    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Wholesale Ordering</h1>
          <p className="text-gray-600 text-lg">Order products from wholesale suppliers</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Product Catalog */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-gray-600">{product.category}</p>
                        <p className="text-sm text-gray-500">by {product.supplier}</p>
                      </div>
                      <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                        Stock: {product.stock}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-700 mb-4 text-sm">{product.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">
                        TZS {product.price.toLocaleString()}
                      </span>
                      <Button
                        onClick={() => addToOrder(product)}
                        disabled={product.stock === 0}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No items in order</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {orderItems.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product_name}</h4>
                            <p className="text-gray-600 text-xs">TZS {item.unit_price.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>TZS {getTotalAmount().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="payWithCredit"
                        checked={payWithCredit}
                        onChange={e => setPayWithCredit(e.target.checked)}
                        disabled={!creditAccount || creditAccount.status !== 'active'}
                      />
                      <Label htmlFor="payWithCredit" className="cursor-pointer">
                        Pay with Credit
                        {creditAccount && creditAccount.status === 'active' && (
                          <span className="ml-2 text-xs text-green-700">Available: TZS {(creditAccount.credit_limit - creditAccount.current_balance).toLocaleString()}</span>
                        )}
                      </Label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={submitOrder}
                      disabled={isLoading || !selectedSupplier}
                    >
                      {isLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Order
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleOrdering;

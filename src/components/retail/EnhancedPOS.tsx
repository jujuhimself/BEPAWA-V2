
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Minus, ShoppingCart, Receipt, CreditCard, Banknote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  sell_price: number;
  stock: number;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Receipt {
  id: string;
  items: CartItem[];
  total: number;
  payment_method: string;
  customer_name?: string;
  staff_name: string;
  timestamp: string;
}

const EnhancedPOS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setFilteredProducts(
      products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, products]);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setStaffName(data?.name || data?.email || user.id);
        });
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      // Staff users operate as their employer (user.id is already the employer's id)
      const ownerId = user.id;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`user_id.eq.${ownerId},pharmacy_id.eq.${ownerId}`)
        .gt('stock', 0)
        .order('name');

      if (error) throw error;

      const transformedProducts = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        sell_price: item.sell_price || 0,
        stock: item.stock,
        sku: item.sku || ''
      }));

      setProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} units available`,
          variant: "destructive",
        });
        return;
      }
      
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.sell_price }
          : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity: 1,
        total: product.sell_price
      }]);
    }

    toast({
      title: "Added to cart",
      description: `${product.name} added to cart`,
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock} units available`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.sell_price }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const processSale = async () => {
    if (!user || cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create POS sale record - user.id is employer id for staff
      const ownerId = user.id;
      const saleData = {
        user_id: ownerId,
        total_amount: getCartTotal(),
        payment_method: paymentMethod,
        customer_name: customerName || null,
        sale_date: new Date().toISOString()
      };

      const { data: sale, error: saleError } = await supabase
        .from('pos_sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update inventory
      for (const item of cart) {
        // Add sale item
        await supabase
          .from('pos_sale_items')
          .insert({
            pos_sale_id: sale.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.sell_price,
            total_price: item.total
          });

        // Update product stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.stock - item.quantity })
          .eq('id', item.id);

        if (stockError) throw stockError;

        // Create inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            user_id: ownerId,
            product_id: item.id,
            movement_type: 'out',
            quantity: item.quantity,
            reason: `POS Sale${user.isStaff ? ` (by staff: ${staffName})` : ''}`,
            created_by: ownerId
          });
      }

      // Generate receipt
      const receipt: Receipt = {
        id: sale.id,
        items: cart,
        total: getCartTotal(),
        payment_method: paymentMethod,
        customer_name: customerName,
        staff_name: staffName,
        timestamp: new Date().toLocaleString()
      };

      setCurrentReceipt(receipt);
      setShowReceipt(true);

      // Clear cart and form
      setCart([]);
      setCustomerName("");
      setPaymentMethod("cash");

      // Refresh products to update stock levels
      fetchProducts();

      toast({
        title: "Sale completed!",
        description: `Sale of TZS ${getCartTotal().toLocaleString()} processed successfully`,
      });

    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    }
  };

  const printReceipt = () => {
    if (!currentReceipt) return;
    
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${currentReceipt.id}</title>
          <style>
            body { font-family: monospace; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PHARMACY RECEIPT</h2>
            <p>Date: ${currentReceipt.timestamp}</p>
            <p>Receipt ID: ${currentReceipt.id}</p>
            ${currentReceipt.customer_name ? `<p>Customer: ${currentReceipt.customer_name}</p>` : ''}
            <p>Staff: ${currentReceipt.staff_name}</p>
          </div>
          <div class="items">
            ${currentReceipt.items.map(item => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>TZS ${item.total.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <div class="item">
              <span>Total:</span>
              <span>TZS ${currentReceipt.total.toLocaleString()}</span>
            </div>
            <div class="item">
              <span>Payment:</span>
              <span>${currentReceipt.payment_method.toUpperCase()}</span>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);
    
    receiptWindow.document.close();
    receiptWindow.print();
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Product Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-600">{product.category}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                      Stock: {product.stock}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-600">
                      TZS {product.sell_price.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart and Checkout */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium">{item.name}</h5>
                        <p className="text-xs text-gray-600">TZS {item.sell_price.toLocaleString()} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                    <span>TZS {getCartTotal().toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Customer Name (Optional)</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="flex items-center gap-2"
                  >
                    <Banknote className="h-4 w-4" />
                    Cash
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Card
                  </Button>
                  <Button
                    variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('mpesa')}
                    className="col-span-2"
                  >
                    M-PESA
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={processSale}
                size="lg"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Complete Sale - TZS {getCartTotal().toLocaleString()}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>
          {currentReceipt && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold">PHARMACY RECEIPT</h3>
                <p className="text-sm text-gray-600">Receipt ID: {currentReceipt.id}</p>
                <p className="text-sm text-gray-600">{currentReceipt.timestamp}</p>
                {currentReceipt.customer_name ? (
                  <p className="text-sm text-gray-600">Customer: {currentReceipt.customer_name}</p>
                ) : (
                  <p className="text-sm text-gray-600">Customer: Walk-in</p>
                )}
                <p className="text-sm text-gray-600">Staff: {currentReceipt.staff_name}</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReceipt.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>TZS {item.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>TZS {currentReceipt.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment:</span>
                  <span>{currentReceipt.payment_method.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={printReceipt} className="flex-1">
                  Print Receipt
                </Button>
                <Button variant="outline" onClick={() => setShowReceipt(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPOS;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Package, Clock, CheckCircle, Truck, CreditCard, MapPin, Phone, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { creditService } from '@/services/creditService';
import { useCreateCODOrder } from '@/hooks/useDelivery';
import LocationPicker, { LocationData } from '@/components/delivery/LocationPicker';
import {
  calculateDeliveryFee,
  calculateDistance,
  formatTZS,
  MAX_DELIVERY_DISTANCE_KM,
  DELIVERY_PRICE_TIERS
} from '@/utils/deliveryPricing';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  supplier: string;
  min_order_qty?: number;
  wholesaler_id?: string;
  user_id?: string;
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

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'credit'>('cod');
  const [payWithCredit, setPayWithCredit] = useState(false);
  const [creditAccount, setCreditAccount] = useState<any>(null);

  // COD delivery details
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [wholesalerLocation, setWholesalerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const createCODOrder = useCreateCODOrder();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
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
          toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
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
          min_order_qty: item.min_stock_level || 1,
          wholesaler_id: item.wholesaler_id,
          user_id: item.user_id,
        }));

        setProducts(transformedProducts);
      } catch (error: any) {
        console.error('Unexpected error fetching products:', error);
        toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
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
          return;
        }

        setSuppliers(data || []);
      } catch (error: any) {
        console.error('Unexpected error fetching suppliers:', error);
      }
    };

    if (user) {
      fetchProducts();
      fetchSuppliers();
    }
  }, [user, toast]);

  // Fetch wholesaler location when supplier selected (for COD distance calc)
  useEffect(() => {
    if (!selectedSupplier) {
      setWholesalerLocation(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', selectedSupplier)
        .single();
      if (data?.latitude && data?.longitude) {
        setWholesalerLocation({ latitude: data.latitude, longitude: data.longitude });
      } else {
        setWholesalerLocation(null);
      }
    })();
  }, [selectedSupplier]);

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

    toast({ title: "Added to order", description: `${product.name} added to your order` });
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

  const getDeliveryFee = () => calculateDeliveryFee(deliveryDistance);

  const submitCODOrder = async () => {
    if (!user || orderItems.length === 0) return;

    if (!deliveryLocation || !deliveryPhone) {
      toast({
        title: 'Missing Information',
        description: 'Please select a delivery location and provide phone number',
        variant: 'destructive'
      });
      return;
    }

    // Determine the wholesaler (pharmacy_id for delivery context)
    const wholesalerId = selectedSupplier || orderItems[0]?.product_id
      ? products.find(p => p.id === orderItems[0]?.product_id)?.user_id
      : undefined;

    if (!wholesalerId) {
      toast({ title: 'Error', description: 'Unable to determine wholesaler.', variant: 'destructive' });
      return;
    }

    const deliveryFee = getDeliveryFee();
    const totalWithDelivery = getTotalAmount() + deliveryFee;

    createCODOrder.mutate({
      user_id: user.id,
      items: orderItems.map(item => ({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        manufacturer: '',
        category: 'wholesale',
      })),
      total_amount: totalWithDelivery,
      delivery_address: deliveryLocation.address,
      delivery_phone: deliveryPhone,
      delivery_notes: deliveryNotes || notes,
      pharmacy_id: wholesalerId,
      delivery_fee: deliveryFee,
      delivery_coordinates: {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude
      }
    }, {
      onSuccess: () => {
        setOrderItems([]);
        setSelectedSupplier("");
        setNotes("");
        setDeliveryLocation(null);
        setDeliveryPhone('');
        setDeliveryNotes('');
        setDeliveryDistance(0);
        toast({
          title: "COD Order submitted!",
          description: "Your order has been placed. The wholesaler will confirm and arrange delivery.",
        });
      }
    });
  };

  const submitPurchaseOrder = async () => {
    if (!user || orderItems.length === 0 || !selectedSupplier) {
      toast({ title: "Error", description: "Please select a supplier and add items", variant: "destructive" });
      return;
    }
    if (payWithCredit) {
      if (!creditAccount || creditAccount.status !== 'active') {
        toast({ title: 'Credit Error', description: 'No active credit account with this wholesaler.', variant: 'destructive' });
        return;
      }
      if (creditAccount.credit_limit - creditAccount.current_balance < getTotalAmount()) {
        toast({ title: 'Credit Limit Exceeded', description: 'Not enough available credit.', variant: 'destructive' });
        return;
      }
    }
    setIsLoading(true);

    try {
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

      setOrderItems([]);
      setSelectedSupplier("");
      setNotes("");

      if (payWithCredit && creditAccount) {
        await creditService.updateAccountBalance(creditAccount.id, creditAccount.current_balance + getTotalAmount());
      }
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({ title: "Error", description: error.message || "Failed to submit order", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (paymentMethod === 'cod') {
      submitCODOrder();
    } else {
      submitPurchaseOrder();
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
                      <Button onClick={() => addToOrder(product)} disabled={product.stock === 0} size="sm">
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
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {orderItems.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product_name}</h4>
                            <p className="text-gray-600 text-xs">TZS {item.unit_price.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button variant="outline" size="sm" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method Tabs */}
                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cod' | 'credit')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cod" className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          COD
                        </TabsTrigger>
                        <TabsTrigger value="credit" className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          Credit
                        </TabsTrigger>
                      </TabsList>

                      {/* COD Tab */}
                      <TabsContent value="cod" className="space-y-3 mt-3">
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 shrink-0" />
                            Pay cash when your order is delivered
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-sm">
                            <Phone className="h-3.5 w-3.5" /> Phone *
                          </Label>
                          <Input
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            placeholder="+255 7XX XXX XXX"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3.5 w-3.5" /> Delivery Location *
                          </Label>
                          <LocationPicker
                            onLocationSelect={(location) => {
                              setDeliveryLocation(location);
                              if (wholesalerLocation) {
                                const distance = calculateDistance(
                                  wholesalerLocation.latitude, wholesalerLocation.longitude,
                                  location.latitude, location.longitude
                                );
                                setDeliveryDistance(distance);
                              }
                            }}
                            pharmacyLocation={wholesalerLocation || undefined}
                            placeholder="Search delivery location..."
                          />
                          {deliveryLocation && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{deliveryDistance.toFixed(1)} km</Badge>
                                  <span className="text-xs text-muted-foreground">from wholesaler</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm text-primary">{formatTZS(getDeliveryFee())}</p>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Info className="h-3 w-3" /> fee
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="font-medium mb-1">Delivery Pricing</p>
                                        <ul className="text-xs space-y-0.5">
                                          {DELIVERY_PRICE_TIERS.map((tier, i) => (
                                            <li key={i}>{tier.minKm}-{tier.maxKm} km: {formatTZS(tier.price)}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                              {deliveryDistance > MAX_DELIVERY_DISTANCE_KM && (
                                <p className="text-xs text-amber-600 mt-1">⚠️ Beyond standard delivery range</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Delivery Notes</Label>
                          <Textarea
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Special instructions for delivery..."
                            className="h-16"
                          />
                        </div>
                      </TabsContent>

                      {/* Credit Tab */}
                      <TabsContent value="credit" className="space-y-3 mt-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="payWithCredit"
                            checked={payWithCredit}
                            onChange={e => setPayWithCredit(e.target.checked)}
                            disabled={!creditAccount || creditAccount.status !== 'active'}
                          />
                          <Label htmlFor="payWithCredit" className="cursor-pointer text-sm">
                            Pay with Credit
                            {creditAccount && creditAccount.status === 'active' && (
                              <span className="ml-2 text-xs text-green-700">
                                Available: TZS {(creditAccount.credit_limit - creditAccount.current_balance).toLocaleString()}
                              </span>
                            )}
                          </Label>
                        </div>
                        {!creditAccount && (
                          <p className="text-xs text-muted-foreground">
                            No credit account with this supplier. Select a supplier first or apply for credit.
                          </p>
                        )}
                        <div className="space-y-2">
                          <Label className="text-sm">Order Notes</Label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any special instructions..."
                            className="h-16"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Totals */}
                    <div className="border-t pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>TZS {getTotalAmount().toLocaleString()}</span>
                      </div>
                      {paymentMethod === 'cod' && deliveryLocation && (
                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee:</span>
                          <span>{formatTZS(getDeliveryFee())}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>TZS {(getTotalAmount() + (paymentMethod === 'cod' && deliveryLocation ? getDeliveryFee() : 0)).toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSubmit}
                      disabled={
                        isLoading ||
                        createCODOrder.isPending ||
                        (paymentMethod === 'credit' && !selectedSupplier) ||
                        (paymentMethod === 'cod' && (!deliveryLocation || !deliveryPhone))
                      }
                    >
                      {isLoading || createCODOrder.isPending ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : paymentMethod === 'cod' ? (
                        <>
                          <Truck className="h-4 w-4 mr-2" />
                          Place COD Order
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Purchase Order
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

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ShoppingCart, Minus, Plus, Trash2, Truck, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { orderService } from '@/services/orderService';
import { inventoryService } from '@/services/inventoryService';
import { useCreateCODOrder } from '@/hooks/useDelivery';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  manufacturer: string;
  category: string;
  pharmacy_id?: string;
}

const Cart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardDetails, setCardDetails] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [cardLoading, setCardLoading] = useState(false);
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
  
  // COD delivery details
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  const createCODOrder = useCreateCODOrder();

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('items')
        .eq('user_id', user.id)
        .eq('status', 'cart')
        .eq('role', user.role)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.items && Array.isArray(data.items)) {
        setCartItems(data.items as unknown as CartItem[]);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (!user) return;
    if (newQuantity < 1) return;
    let newCartItems = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          items: newCartItems as unknown as Json[],
          total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('role', user.role)
        .eq('status', 'cart');
      if (error) throw error;
      setCartItems(newCartItems);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update cart', variant: 'destructive' });
    }
  };

  const removeItem = async (productId: string) => {
    if (!user) return;
    let newCartItems = cartItems.filter((item) => item.id !== productId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          items: newCartItems as unknown as Json[],
          total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('role', user.role)
        .eq('status', 'cart');
      if (error) throw error;
      setCartItems(newCartItems);
      toast({ title: 'Item removed', description: 'Item has been removed from your cart' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          items: [] as unknown as Json[],
          total_amount: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('role', user.role)
        .eq('status', 'cart');
      if (error) throw error;
      setCartItems([]);
      toast({ title: 'Cart cleared', description: 'All items have been removed from your cart' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear cart', variant: 'destructive' });
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    // Standard delivery fee for COD
    return 2500;
  };

  const handleCODCheckout = async () => {
    if (!user) return;
    if (!deliveryAddress || !deliveryPhone) {
      toast({ 
        title: 'Missing Information', 
        description: 'Please provide delivery address and phone number', 
        variant: 'destructive' 
      });
      return;
    }

    // Get the pharmacy_id from cart items (assuming all items are from same pharmacy)
    const pharmacyId = cartItems[0]?.pharmacy_id;
    if (!pharmacyId) {
      toast({ 
        title: 'Error', 
        description: 'Unable to determine pharmacy. Please try again.', 
        variant: 'destructive' 
      });
      return;
    }

    createCODOrder.mutate({
      user_id: user.id,
      items: cartItems,
      total_amount: getTotalPrice() + getDeliveryFee(),
      delivery_address: deliveryAddress,
      delivery_phone: deliveryPhone,
      delivery_notes: deliveryNotes,
      pharmacy_id: pharmacyId
    }, {
      onSuccess: async () => {
        await clearCart();
        navigate('/my-orders');
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your cart and checkout.</h2>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading cart...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some products to get started</p>
            <Button onClick={() => navigate('/catalog')} size="lg">
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isIndividual = user.role === 'individual';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-gray-600 text-lg">{cartItems.length} items in your cart</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cart Items</CardTitle>
                <Button variant="outline" size="sm" onClick={clearCart}>
                  Clear Cart
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-gray-600 text-sm">{item.manufacturer}</p>
                      <p className="text-gray-500 text-sm">{item.category}</p>
                      <p className="font-bold text-lg text-blue-600">TZS {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">TZS {(item.price * item.quantity).toLocaleString()}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="mt-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>TZS {getTotalPrice().toLocaleString()}</span>
                  </div>
                  {isIndividual && paymentMethod === 'cod' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>TZS {getDeliveryFee().toLocaleString()}</span>
                    </div>
                  )}
                  {!isIndividual && (
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span className="text-green-600">Free</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>TZS {(getTotalPrice() + (isIndividual && paymentMethod === 'cod' ? getDeliveryFee() : 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection for Individual Users */}
                {isIndividual ? (
                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'card' | 'cod')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="card" className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="cod" className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        COD
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="card" className="space-y-4">
                      <Button
                        className="w-full flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-500 text-white text-lg py-3"
                        onClick={() => setShowCardForm((v) => !v)}
                        disabled={isLoading || cardLoading || cartItems.length === 0}
                      >
                        <CreditCard className="h-5 w-5" />
                        {cardLoading ? "Processing..." : "Pay with Card"}
                      </Button>
                      
                      {showCardForm && (
                        <Card className="shadow-lg border-2 border-blue-100">
                          <CardHeader>
                            <CardTitle className="text-xl font-bold text-blue-700">Card Details</CardTitle>
                            <div className="flex gap-4">
                              <button type="button" className={`p-2 rounded-lg border-2 ${cardType==='visa' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`} onClick={()=>setCardType('visa')}>
                                <img src="/visa.png" alt="Visa" className="h-6" />
                              </button>
                              <button type="button" className={`p-2 rounded-lg border-2 ${cardType==='mastercard' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`} onClick={()=>setCardType('mastercard')}>
                                <img src="/mastercard.png" alt="Mastercard" className="h-6" />
                              </button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <form
                              className="space-y-3"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setCardLoading(true);
                                try {
                                  await new Promise((res) => setTimeout(res, 1200));
                                  const order = await orderService.createPlatformOrder({
                                    user_id: user.id,
                                    order_type: 'retail',
                                    order_number: undefined,
                                    total_amount: getTotalPrice(),
                                    status: 'completed',
                                    payment_status: 'paid',
                                    items: cartItems,
                                  });
                                  for (const item of cartItems) {
                                    const product = await inventoryService.getProduct(item.id);
                                    if (product) {
                                      await inventoryService.updateStock(item.id, Math.max(0, product.stock - item.quantity), 'Card payment');
                                    }
                                  }
                                  await clearCart();
                                  toast({ title: 'Payment Successful', description: 'Your order has been placed!' });
                                  navigate('/checkout-success');
                                } catch (err: any) {
                                  toast({ title: 'Payment Error', description: err.message || 'Could not complete payment.', variant: 'destructive' });
                                } finally {
                                  setCardLoading(false);
                                  setShowCardForm(false);
                                }
                              }}
                            >
                              <Input
                                placeholder="Cardholder Name"
                                value={cardDetails.name}
                                onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                                required
                                className="bg-blue-50 border-blue-200"
                              />
                              <Input
                                placeholder="Card Number"
                                value={cardDetails.number}
                                onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                                required
                                maxLength={19}
                                className="bg-blue-50 border-blue-200"
                              />
                              <div className="flex gap-2">
                                <Input
                                  placeholder="MM/YY"
                                  value={cardDetails.expiry}
                                  onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                  required
                                  maxLength={5}
                                  className="bg-blue-50 border-blue-200"
                                />
                                <Input
                                  placeholder="CVC"
                                  value={cardDetails.cvc}
                                  onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                  required
                                  maxLength={4}
                                  className="bg-blue-50 border-blue-200"
                                />
                              </div>
                              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white" disabled={cardLoading}>
                                {cardLoading ? 'Processing...' : 'Pay Now'}
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="cod" className="space-y-4">
                      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Pay cash when your order is delivered by our Boda rider
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="delivery-address" className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Delivery Address
                          </Label>
                          <Textarea
                            id="delivery-address"
                            placeholder="Enter your full delivery address..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="delivery-phone" className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </Label>
                          <Input
                            id="delivery-phone"
                            type="tel"
                            placeholder="+255 7XX XXX XXX"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            className="mt-1"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="delivery-notes">
                            Delivery Notes (optional)
                          </Label>
                          <Textarea
                            id="delivery-notes"
                            placeholder="Any special instructions for the rider..."
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <Button
                        className="w-full flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-lg py-3"
                        onClick={handleCODCheckout}
                        disabled={createCODOrder.isPending || !deliveryAddress || !deliveryPhone}
                      >
                        <Truck className="h-5 w-5" />
                        {createCODOrder.isPending ? "Placing Order..." : "Place COD Order"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                ) : (
                  /* Non-individual users (retail/wholesale) */
                  <>
                    <Button
                      className="w-full flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-500 text-white text-lg py-3"
                      onClick={() => setShowCardForm((v) => !v)}
                      disabled={isLoading || cardLoading || cartItems.length === 0}
                    >
                      <CreditCard className="h-5 w-5" />
                      {cardLoading ? "Processing..." : "Pay with Card"}
                    </Button>
                    {showCardForm && (
                      <Card className="shadow-lg border-2 border-blue-100">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-blue-700">Card Details</CardTitle>
                          <div className="flex gap-4">
                            <button type="button" className={`p-2 rounded-lg border-2 ${cardType==='visa' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`} onClick={()=>setCardType('visa')}>
                              <img src="/visa.png" alt="Visa" className="h-6" />
                            </button>
                            <button type="button" className={`p-2 rounded-lg border-2 ${cardType==='mastercard' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`} onClick={()=>setCardType('mastercard')}>
                              <img src="/mastercard.png" alt="Mastercard" className="h-6" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <form
                            className="space-y-3"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setCardLoading(true);
                              try {
                                await new Promise((res) => setTimeout(res, 1200));
                                const order = await orderService.createPlatformOrder({
                                  user_id: user.id,
                                  order_type: user.role === 'wholesale' ? 'wholesale' : 'retail',
                                  order_number: undefined,
                                  total_amount: getTotalPrice(),
                                  status: 'completed',
                                  payment_status: 'paid',
                                  items: cartItems,
                                });
                                for (const item of cartItems) {
                                  const product = await inventoryService.getProduct(item.id);
                                  if (product) {
                                    await inventoryService.updateStock(item.id, Math.max(0, product.stock - item.quantity), 'Card payment');
                                  }
                                }
                                await clearCart();
                                toast({ title: 'Payment Successful', description: 'Your order has been placed!' });
                                navigate('/checkout-success');
                              } catch (err: any) {
                                toast({ title: 'Payment Error', description: err.message || 'Could not complete payment.', variant: 'destructive' });
                              } finally {
                                setCardLoading(false);
                                setShowCardForm(false);
                              }
                            }}
                          >
                            <Input
                              placeholder="Cardholder Name"
                              value={cardDetails.name}
                              onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                              required
                              className="bg-blue-50 border-blue-200"
                            />
                            <Input
                              placeholder="Card Number"
                              value={cardDetails.number}
                              onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                              required
                              maxLength={19}
                              className="bg-blue-50 border-blue-200"
                            />
                            <div className="flex gap-2">
                              <Input
                                placeholder="MM/YY"
                                value={cardDetails.expiry}
                                onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                required
                                maxLength={5}
                                className="bg-blue-50 border-blue-200"
                              />
                              <Input
                                placeholder="CVC"
                                value={cardDetails.cvc}
                                onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                required
                                maxLength={4}
                                className="bg-blue-50 border-blue-200"
                              />
                            </div>
                            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white" disabled={cardLoading}>
                              {cardLoading ? 'Processing...' : 'Pay Now'}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}
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

export default Cart;

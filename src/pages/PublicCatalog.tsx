import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Search, Package, Clock, CheckCircle, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  manufacturer: string;
  image_url?: string;
  pharmacy_name?: string;
  pharmacy_id?: string;
  min_stock: number;
  is_retail_product?: boolean;
  is_public_product?: boolean;
}

const PublicCatalog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      // Fetch products with branch info
      let productsQuery = supabase
        .from('products')
        .select('*, branch:branches(id, name, address)')
        .eq('status', 'in-stock')
        .gt('stock', 0)
        .order('name');
      let productsData, error;
      
      if (!user || user.role === 'individual') {
        // Individuals: show any product flagged public OR retail
        ({ data: productsData, error } = await productsQuery.or('is_public_product.eq.true,is_retail_product.eq.true'));
      } else if (user.role === 'retail') {
        // Retailers: only show public products
        ({ data: productsData, error } = await productsQuery.eq('is_public_product', true));
      } else if (user.role === 'wholesale') {
        // Wholesalers: only their own products
        ({ data: productsData, error } = await productsQuery.eq('user_id', user.id));
      } else {
        // Fallback: show nothing
        productsData = [];
        error = null;
      }

      if (error) {
        throw error;
      }

      // Get unique user_ids to fetch owner profiles
      const userIds = [...new Set((productsData || []).map((p: any) => p.user_id).filter(Boolean))] as string[];
      
      // Fetch owner profiles for pharmacy names
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, pharmacy_name, business_name, name')
          .in('id', userIds);
        
        profilesMap = (profiles || []).reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      const transformedProducts = (productsData || []).map((product: any) => {
        // Get pharmacy/wholesaler name from owner profile or branch
        const owner = profilesMap[product.user_id];
        const ownerName = owner?.pharmacy_name || owner?.business_name || owner?.name;
        const branchName = product.branch?.name;
        const displayName = ownerName || branchName || 'Local Pharmacy';
        
        return {
          ...product,
          price: product.sell_price || 0,
          min_stock: product.min_stock_level || 0,
          wholesaler_name: displayName,
          pharmacy_name: displayName,
          pharmacy_id: product.branch_id || product.pharmacy_id || product.user_id || ''
        };
      });

      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load product catalog",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchCartItems = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('items')
          .eq('user_id', user.id)
          .eq('status', 'cart')
          .eq('role', user.role)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && data.items && Array.isArray(data.items)) {
          setCartItems(data.items as any[]);
        } else {
          setCartItems([]);
        }

        console.log('Cart fetch:', data, error);
      } catch (error: any) {
        console.error('Error fetching cart:', error);
        setCartItems([]);
      }
    };

    if (user) {
      fetchCartItems();
    }
  }, [user]);

  const addToCart = async (product: Product) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to add items to your cart",
        variant: "destructive",
      });
      return;
    }

    const existingCartItem = cartItems.find((item) => item.id === product.id);
    let newCartItems = [...cartItems];

    if (existingCartItem) {
      newCartItems = newCartItems.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCartItems = [...newCartItems, { ...product, quantity: 1 }];
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', user.role)
        .eq('status', 'cart')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const { data: updatedData, error: updateError } = await supabase
          .from('orders')
          .update({
            items: newCartItems,
            total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('role', user.role)
          .eq('status', 'cart')
          .select()
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        setCartItems(newCartItems);
        toast({
          title: "Added to cart",
          description: `${product.name} added to your cart`,
        });
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            status: 'cart',
            role: user.role,
            items: newCartItems,
            total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            updated_at: new Date().toISOString(),
            order_number: `CART-${user.id}`,
          })
          .select()
          .maybeSingle();

        if (insertError) {
          throw insertError;
        }

        setCartItems(newCartItems);
        toast({
          title: "Added to cart",
          description: `${product.name} added to your cart`,
        });
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to update your cart",
        variant: "destructive",
      });
      return;
    }

    if (newQuantity < 0) return;

    let newCartItems = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );

    newCartItems = newCartItems.filter((item) => item.quantity > 0);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', user.role)
        .eq('status', 'cart')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const { data: updatedData, error: updateError } = await supabase
          .from('orders')
          .update({
            items: newCartItems,
            total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('role', user.role)
          .eq('status', 'cart')
          .select()
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        setCartItems(newCartItems);
        toast({
          title: "Cart updated",
          description: "Your cart has been updated",
        });
      } else {
        const { data: newData, error: insertError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            status: 'cart',
            role: user.role,
            items: newCartItems,
            total_amount: newCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            updated_at: new Date().toISOString(),
            order_number: `CART-${user.id}`,
          })
          .select()
          .maybeSingle();

        if (insertError) {
          throw insertError;
        }

        setCartItems(newCartItems);
        toast({
          title: "Cart updated",
          description: "Your cart has been updated",
        });
      }
    } catch (error: any) {
      console.error('Error updating cart:', error);
      toast({
        title: "Error",
        description: "Failed to update cart",
        variant: "destructive",
      });
    }
  };

  const checkout = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to checkout",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting checkout for user:', user.id);
      console.log('Cart items:', cartItems);
      // Check if cart order exists
      const { data: existingCart, error: cartError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'cart')
        .eq('role', user.role)
        .maybeSingle();

      if (cartError && cartError.code !== 'PGRST116') {
        console.error('Error checking existing cart:', cartError);
        throw cartError;
      }

      if (!existingCart) {
        toast({
          title: "No cart found",
          description: "You must have items in your cart to checkout.",
          variant: "destructive",
        });
        return;
      }

      // Update existing cart order to pending
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'pending',
          items: cartItems,
          total_amount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          order_number: `ORDER-${user.id}-${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'cart')
        .eq('role', user.role)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating cart order:', error);
        throw error;
      }

      setCartItems([]);
      toast({
        title: "Checkout successful",
        description: "Your order has been placed",
      });
    } catch (error: any) {
      console.error('Error checking out:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to checkout",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setFilteredProducts(
      products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.pharmacy_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, products]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Public Catalog</h1>
          <p className="text-gray-600 text-lg">Explore products from retail pharmacies near you</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Product Catalog */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products by name, category, manufacturer, or pharmacy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product count indicator */}
            <div className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} products
            </div>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? "Try adjusting your search terms." : "No products are currently available."}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <p className="text-gray-600">{product.category}</p>
                          {product.manufacturer && (
                            <p className="text-sm text-gray-500">by {product.manufacturer}</p>
                          )}
                          {(product as any).wholesaler_name && (
                            <p className="text-sm text-blue-700">from {(product as any).wholesaler_name}</p>
                          )}
                          <p className="text-sm text-blue-600">from {product.pharmacy_name}</p>
                          <div className="flex gap-1 mt-2">
                            {product.is_retail_product && <Badge variant="outline" className="text-xs">Retail</Badge>}
                            {product.is_public_product && <Badge variant="default" className="text-xs">Public</Badge>}
                          </div>
                        </div>
                        <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                          Stock: {product.stock}
                        </Badge>
                      </div>
                      
                      {product.description && (
                        <p className="text-gray-700 mb-4 text-sm line-clamp-2">{product.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-blue-600">
                          TZS {product.price.toLocaleString()}
                        </span>
                        <Button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0 || !user || !(user.role === 'individual' || user.role === 'retail')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {user ? 'Add to Cart' : 'Login to Order'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Shopping Cart */}
          <div>
            {user && (user.role === 'individual' || user.role === 'retail') && (
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Shopping Cart
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No items in cart</p>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              <p className="text-gray-600 text-xs">TZS {item.price.toLocaleString()} each</p>
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
                          <span>TZS {cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <Link to="/cart">
                        <Button className="w-full mt-2" variant="outline" size="sm">
                          Go to Cart
                        </Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCatalog;

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, MapPin, Phone, ArrowLeft, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Json } from '@/integrations/supabase/types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  manufacturer: string;
  category: string;
  pharmacy_id?: string;
}

const PharmacyStore = () => {
  const { pharmacyId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPharmacyAndProducts = async () => {
      setIsLoading(true);
      try {
        const { data: pharmacyData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', pharmacyId)
          .single();
        setPharmacy(pharmacyData);
        
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .or(`pharmacy_id.eq.${pharmacyId},user_id.eq.${pharmacyId}`)
          .gt('stock', 0)
          .not('status', 'eq', 'deleted')
          .eq('is_retail_product', true)
          .neq('is_wholesale_product', true)
          .order('name');
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching pharmacy data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (pharmacyId) fetchPharmacyAndProducts();
  }, [pharmacyId]);

  // Add to cart using the main cart system (same as Browse Products)
  const addToCart = async (product: any) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to add items to cart",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    setAddingToCart(product.id);
    
    try {
      // Check if cart order exists
      const { data: existingCart, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'cart')
        .eq('role', user.role)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const cartItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.sell_price || product.price || 0,
        quantity: 1,
        manufacturer: product.supplier || product.manufacturer || '',
        category: product.category || '',
        pharmacy_id: pharmacyId,
      };

      if (existingCart) {
        // Update existing cart
        const currentItems = (existingCart.items as unknown as CartItem[]) || [];
        const existingItemIndex = currentItems.findIndex(item => item.id === product.id);
        
        let newItems: CartItem[];
        if (existingItemIndex >= 0) {
          // Increment quantity
          newItems = currentItems.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          // Add new item
          newItems = [...currentItems, cartItem];
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            items: newItems as unknown as Json[],
            total_amount: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCart.id);

        if (updateError) throw updateError;
      } else {
        // Create new cart order
        const orderNumber = `CART-${Date.now()}`;
        const { error: createError } = await supabase
          .from('orders')
          .insert([{
            user_id: user.id,
            order_number: orderNumber,
            order_type: 'retail',
            status: 'cart',
            role: user.role,
            items: [cartItem] as unknown as Json[],
            total_amount: cartItem.price,
            payment_status: 'unpaid',
          }]);

        if (createError) throw createError;
      }

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setAddingToCart(null);
    }
  };

  const goToCart = () => {
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading store...</span>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Pharmacy not found</h2>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button and Cart */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={goToCart}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
          </Button>
        </div>

        {/* Pharmacy Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">{pharmacy.pharmacy_name || pharmacy.business_name || pharmacy.name}</CardTitle>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{pharmacy.address || `${pharmacy.city || ''}, ${pharmacy.region || 'Tanzania'}`}</span>
              </div>
              {pharmacy.phone && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{pharmacy.phone}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Search Bar */}
        {products.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products by name, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No products available</h3>
              <p className="text-muted-foreground">This pharmacy hasn't listed any products yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products
              .filter(p => {
                if (!searchTerm) return true;
                const q = searchTerm.toLowerCase();
                return p.name?.toLowerCase().includes(q) || 
                       p.category?.toLowerCase().includes(q) ||
                       p.description?.toLowerCase().includes(q);
              })
              .map((product) => (
              <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.category && (
                    <Badge variant="outline" className="w-fit">{product.category}</Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary mb-2">
                      TZS {(product.sell_price || product.price || 0).toLocaleString()}
                    </p>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <Badge variant={product.stock > 0 ? 'default' : 'secondary'}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                    </Badge>
                  </div>
                  <Button 
                    className="mt-4 w-full" 
                    onClick={() => addToCart(product)} 
                    disabled={product.stock <= 0 || addingToCart === product.id}
                  >
                    {addingToCart === product.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyStore;

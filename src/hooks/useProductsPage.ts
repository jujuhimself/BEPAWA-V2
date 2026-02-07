import { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { inventoryService } from '@/services/inventoryService';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security"; 
import { logError } from "@/utils/logger";
import { dataService } from '@/services/dataService';

// Product type matching Supabase schema
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: string;
  manufacturer?: string;
  dosage?: string;
  prescription?: boolean;
  sell_price?: number;
  status?: string;
  user_id?: string;
  wholesaler_id?: string;
  pharmacy_id?: string;
  is_public_product?: boolean;
  is_retail_product?: boolean;
  is_wholesale_product?: boolean;
}

export const useProductsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: categoryData } = useCategories();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // For filter UIs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("name");

  // Get categories from the new category service
  const categories = useMemo(() => {
    if (!categoryData) return [];
    return categoryData.map(cat => cat.name);
  }, [categoryData]);

  // Fetch products from Supabase based on user role
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!user) {
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
        
        setIsLoading(true);
        console.log('Fetching products for user:', user.id, 'role:', user.role);
        
        let data, error;
        if (user.role === 'individual') {
          // Individuals see only retail products, never wholesale
          ({ data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_public_product', true)
            .eq('is_retail_product', true)
            .neq('is_wholesale_product', true)
            .order('name')
          );
        } else if (user.role === 'retail') {
          // Retail users see public wholesale products and their own
          ({ data, error } = await supabase
            .from('products')
            .select('*')
            .or(`and(is_public_product.eq.true,is_wholesale_product.eq.true),user_id.eq.${user.id}`)
            .order('name')
          );
        } else if (user.role === 'wholesale') {
          // Wholesale users see their own products
          ({ data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('name')
          );
        } else if (user.role === 'admin') {
          // Admins see all products
          ({ data, error } = await supabase
            .from('products')
            .select('*')
            .order('name')
          );
        } else {
          data = [];
          error = null;
        }

        if (error) {
          logError(error, "Supabase fetch products error");
          console.error('Products fetch error:', error);
          toast({
            title: "Error loading products",
            description: error.message,
            variant: "destructive",
          });
          setProducts([]);
          setFilteredProducts([]);
          return;
        }

        console.log('Fetched products:', data);

        // Map data for Product UI
        const mapped: Product[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: Number(p.sell_price ?? 0),
          stock: p.stock,
          description: p.description ?? "",
          manufacturer: p.supplier ?? "",
          dosage: p.strength ?? "",
          prescription: p.requires_prescription ?? false,
          image: p.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400",
          status: p.status,
          user_id: p.user_id,
          wholesaler_id: p.wholesaler_id,
          pharmacy_id: p.pharmacy_id,
          is_public_product: p.is_public_product,
          is_retail_product: p.is_retail_product,
          is_wholesale_product: p.is_wholesale_product,
        }));
        
        console.log('Mapped products:', mapped);
        setProducts(mapped);
        setFilteredProducts(mapped);
      } catch (err) {
        logError(err, "Unexpected error fetching products");
        console.error('Unexpected error fetching products:', err);
        toast({
          title: "Unexpected error",
          description: "Failed to load products.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    // Wishlist stays in local storage, keyed by user
    const storedWishlist = localStorage.getItem(`bepawa_wishlist_${user?.id || "guest"}`);
    if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
    else setWishlist([]);
  }, [user, toast]);

  // Filtering + sorting logic
  const handleFiltersChange = (filters: any) => {
    console.log('Applying filters:', filters);
    let filtered = products;

    if (filters.searchTerm) {
      const cleanTerm = sanitizeInput(filters.searchTerm);
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(cleanTerm.toLowerCase()) ||
        (product.description?.toLowerCase() ?? "").includes(cleanTerm.toLowerCase()) ||
        (product.manufacturer?.toLowerCase() ?? "").includes(cleanTerm.toLowerCase())
      );
    }

    if (filters.selectedCategory && filters.selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === filters.selectedCategory);
    }

    if (filters.priceRange) {
      filtered = filtered.filter(product =>
        product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
      );
    }

    if (filters.stockFilter) {
      switch (filters.stockFilter) {
        case "in-stock":
          filtered = filtered.filter(product => product.stock > 10);
          break;
        case "low-stock":
          filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10);
          break;
        case "out-of-stock":
          filtered = filtered.filter(product => product.stock === 0);
          break;
      }
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "stock":
          return a.stock - b.stock;
        case "stock-desc":
          return b.stock - a.stock;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    console.log('Filtered products:', filtered);
    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to add items to cart",
        variant: "destructive",
      });
      return;
    }
    const cartKey = `bepawa_cart_${user.id}`;
    const existingCart = JSON.parse(localStorage.getItem(cartKey) || "[]");

    const existingItem = existingCart.find((item: any) => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem(cartKey, JSON.stringify(existingCart));
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const toggleWishlist = (productId: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to manage wishlist",
        variant: "destructive",
      });
      return;
    }

    const newWishlist = wishlist.includes(productId)
      ? wishlist.filter(id => id !== productId)
      : [...wishlist, productId];

    setWishlist(newWishlist);
    localStorage.setItem(`bepawa_wishlist_${user.id}`, JSON.stringify(newWishlist));

    const product = products.find(p => p.id === productId);
    if (product) {
      toast({
        title: wishlist.includes(productId) ? "Removed from wishlist" : "Added to wishlist",
        description: `${product.name} ${wishlist.includes(productId) ? 'removed from' : 'added to'} wishlist`,
      });
    }
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  return {
    user,
    products,
    filteredProducts,
    wishlist,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    sortBy,
    setSortBy,
    selectedProduct,
    setSelectedProduct,
    showProductDetails,
    setShowProductDetails,
    handleFiltersChange,
    addToCart,
    toggleWishlist,
    openProductDetails,
    categories,
    isLoading,
  };
};

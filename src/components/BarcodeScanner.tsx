import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Scan, Search, Package, AlertTriangle, Camera, CameraOff, RotateCcw, Info, ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventoryService";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

// Update Product interface to match backend fields
interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  sell_price: number;
  category: string;
}

const BarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [addProduct, setAddProduct] = useState({ name: '', barcode: '', price: '', category: '', stock: '', minStock: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [QrReaderComponent, setQrReaderComponent] = useState<any>(null);
  
  // Image upload state
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const barcodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize barcode reader for image scanning
  useEffect(() => {
    barcodeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      barcodeReaderRef.current = null;
    };
  }, []);

  // Check camera permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        console.log('BarcodeScanner - Checking camera permissions...');
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('BarcodeScanner - Camera permission state:', result.state);
          setCameraPermission(result.state as 'prompt' | 'granted' | 'denied');
          result.onchange = () => {
            console.log('BarcodeScanner - Camera permission changed to:', result.state);
            setCameraPermission(result.state as 'prompt' | 'granted' | 'denied');
          };
        } else {
          console.log('BarcodeScanner - Permissions API not supported');
        }
      } catch (err) {
        console.log('BarcodeScanner - Error checking permissions:', err);
        // Some browsers don't support camera permission query
        setCameraPermission('unknown');
      }
    };
    checkPermission();
  }, []);

  // Dynamically load QrReader only when needed
  const loadQrReader = useCallback(async () => {
    if (!QrReaderComponent) {
      try {
        const module = await import('react-qr-barcode-scanner');
        setQrReaderComponent(() => module.default);
      } catch (err) {
        console.error('Failed to load barcode scanner:', err);
        setCameraError('Failed to load barcode scanner component');
      }
    }
  }, [QrReaderComponent]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const role = user?.role;
        const supaProducts = await inventoryService.getProducts(role);
        // Map to local Product interface
        setProducts(
          supaProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || p.id,
            stock: p.stock,
            min_stock: p.min_stock,
            sell_price: p.sell_price || p.price || 0,
            category: p.category || "-"
          }))
        );
      } catch (err) {
        toast({
          title: "Error loading products",
          description: "Could not fetch inventory from Supabase.",
          variant: "destructive"
        });
      }
      setLoading(false);
    };
    fetchProducts();
  }, [user]);

  const handleScan = async (code: string) => {
    if (lastScanned === code) return;
    setLastScanned(code);
    setScannedCode(code);
    const product = products.find(p => p.sku === code || p.id === code);
    if (product) {
      // Fetch real details from backend
      const realProduct = await inventoryService.getProduct(product.id);
      // Ensure all required fields are present
      const mergedProduct: Product = {
        id: realProduct?.id || product.id,
        name: realProduct?.name || product.name,
        sku: realProduct?.sku || realProduct?.barcode || product.sku || product.id,
        stock: realProduct?.stock ?? product.stock,
        min_stock: realProduct?.min_stock ?? product.min_stock,
        sell_price: realProduct?.sell_price || realProduct?.price || product.sell_price || 0,
        category: realProduct?.category || product.category || "-"
      };
      setFoundProduct(mergedProduct);
      toast({
        title: "Product Found!",
        description: `${mergedProduct.name} - Stock: ${mergedProduct.stock}`,
      });
    } else {
      setPendingBarcode(code);
      setAddProduct({ name: '', barcode: code, price: '', category: '', stock: '', minStock: '' });
      setShowAddProduct(true);
    }
  };

  const handleCameraError = (error: any) => {
    console.error("Camera error:", error);
    let errorMessage = "Camera access denied or not available.";
    
    if (error?.name === 'NotAllowedError') {
      errorMessage = "Camera permission was denied. Please allow camera access in your browser settings.";
      setCameraPermission('denied');
    } else if (error?.name === 'NotFoundError') {
      errorMessage = "No camera found on this device.";
    } else if (error?.name === 'NotReadableError') {
      errorMessage = "Camera is in use by another application.";
    } else if (error?.name === 'OverconstrainedError') {
      errorMessage = "Camera requirements could not be satisfied.";
    }
    
    setCameraError(errorMessage);
    setIsScanning(false);
    
    // Clean up video stream
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  // CRITICAL: Camera access must be triggered by direct user gesture
  const handleCameraStart = async () => {
    console.log('BarcodeScanner - Starting camera...');
    setCameraError(null);
    setLastScanned(null);

    try {
      // Load the QR reader component if not already loaded
      await loadQrReader();

      console.log('BarcodeScanner - Requesting camera access...');
      // Request camera permission directly from user gesture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('BarcodeScanner - Camera access granted');
      setVideoStream(stream);
      setCameraPermission('granted');
      setIsScanning(true);

      toast({
        title: "Camera Started",
        description: "Point the camera at a barcode to scan",
      });
    } catch (error: any) {
      console.log('BarcodeScanner - Camera start failed:', error);
      handleCameraError(error);
    }
  };

  const handleCameraStop = () => {
    setIsScanning(false);
    setCameraError(null);
    
    // Clean up video stream
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  // Handle image upload for barcode scanning
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('BarcodeScanner - Image upload started, file:', file?.name, 'size:', file?.size);
    if (!file || !barcodeReaderRef.current) {
      console.log('BarcodeScanner - No file or no barcode reader');
      return;
    }

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      console.log('BarcodeScanner - Creating image URL...');
      // Create image URL from file
      const imageUrl = URL.createObjectURL(file);

      // Create image element
      const img = new Image();
      img.src = imageUrl;

      console.log('BarcodeScanner - Loading image...');
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('BarcodeScanner - Image loaded, dimensions:', img.width, 'x', img.height);
          resolve(void 0);
        };
        img.onerror = (err) => {
          console.log('BarcodeScanner - Image load error:', err);
          reject(err);
        };
      });

      console.log('BarcodeScanner - Decoding barcode from image...');
      // Decode barcode from image
      try {
        const result = await barcodeReaderRef.current.decodeFromImageElement(img);
        const code = result.getText();
        console.log('BarcodeScanner - Barcode detected:', code);

        toast({
          title: "Barcode Detected!",
          description: `Found code: ${code}`,
        });

        handleScan(code);
      } catch (decodeError: any) {
        console.log('BarcodeScanner - Decode error:', decodeError);
        if (decodeError instanceof NotFoundException) {
          toast({
            title: "No Barcode Found",
            description: "Could not detect a barcode in the image. Try a clearer photo.",
            variant: "destructive",
          });
        } else {
          throw decodeError;
        }
      }
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
    } catch (error: any) {
      console.error('Image barcode scan error:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to scan barcode from image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
      // Reset file input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const simulateBarcodeScan = () => {
    if (products.length === 0) return;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    handleScan(randomProduct.sku);
  };

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await inventoryService.createProduct({
        name: addProduct.name,
        sku: addProduct.barcode,
        price: Number(addProduct.price),
        sell_price: Number(addProduct.price),
        category: addProduct.category,
        stock: Number(addProduct.stock),
        min_stock: Number(addProduct.minStock),
        status: 'in-stock' as const,
        buy_price: 0,
      });
      toast({ title: 'Product added!', description: addProduct.name });
      setShowAddProduct(false);
      setAddProduct({ name: '', barcode: '', price: '', category: '', stock: '', minStock: '' });
      // Optionally refetch products
    } catch (err: any) {
      toast({ title: 'Failed to add product', description: err.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Info */}
          {cameraPermission === 'denied' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Camera access is blocked.</strong> To enable barcode scanning:
                <ol className="list-decimal ml-4 mt-2 text-sm space-y-1">
                  <li>Click the camera/lock icon in your browser's address bar</li>
                  <li>Find the camera permission setting</li>
                  <li>Change it to "Allow"</li>
                  <li>Refresh the page</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {/* Camera Scanner */}
          {isScanning && QrReaderComponent && (
            <div className="relative">
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <QrReaderComponent
                  onUpdate={(err: any, result: any) => {
                    if (result) {
                      handleScan(result.getText());
                    }
                    // Only handle serious errors, not continuous "no barcode found" errors
                    if (err && err.name && err.name !== 'NotFoundException') {
                      handleCameraError(err);
                    }
                  }}
                  onError={handleCameraError}
                  constraints={{ 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                  }}
                  videoStyle={{ width: '100%', height: '300px', objectFit: 'cover' }}
                />
              </div>
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCameraStop}
                >
                  <CameraOff className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center text-sm text-gray-600 mt-2">
                Point camera at barcode to scan
              </div>
            </div>
          )}

          {/* Camera Controls */}
          {!isScanning && (
            <div className="space-y-3">
              {cameraPermission === 'prompt' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click "Start Camera" to enable barcode scanning. Your browser will ask for camera permission.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button 
                  onClick={handleCameraStart}
                  className="flex-1"
                  disabled={loading || cameraPermission === 'denied'}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {cameraPermission === 'denied' ? 'Camera Blocked' : 'Start Camera Scanner'}
                </Button>
                <Button 
                  onClick={simulateBarcodeScan}
                  variant="outline"
                  disabled={loading || products.length === 0}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Demo Scan
                </Button>
              </div>
            </div>
          )}

          {/* Image Upload Alternative */}
          <Card className="border-2 border-dashed border-muted-foreground/25">
            <CardContent className="p-4">
              <div className="text-center">
                <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <h4 className="font-medium mb-1">Scan from Image</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a photo of a barcode if camera isn't working
                </p>
                <Input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  disabled={isProcessingImage || loading}
                  className="hidden"
                  id="barcode-image-upload"
                />
                <Label htmlFor="barcode-image-upload" className="cursor-pointer">
                  <Button asChild disabled={isProcessingImage || loading} variant="outline" className="w-full">
                    <span>
                      {isProcessingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Upload Barcode Image
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Camera Error */}
          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{cameraError}</p>
              <p className="text-red-600 text-xs mt-1">
                Try the image upload option above, or refresh the page.
              </p>
            </div>
          )}

          {/* Manual Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode manually"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
            />
            <Button onClick={() => handleScan(scannedCode)} disabled={!scannedCode || loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center text-gray-500 py-4">Loading inventory...</div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className="text-center text-gray-500 py-4">No products found in inventory.</div>
          )}

          {/* Found Product */}
          {foundProduct && (
            <div className="p-4 border rounded-lg bg-green-50">
              <h3 className="font-semibold text-lg">{foundProduct.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <p>Stock: <span className="font-medium">{foundProduct.stock}</span></p>
                <p>Price: <span className="font-medium">TZS {foundProduct.sell_price.toLocaleString()}</span></p>
                <p>Category: <span className="font-medium">{foundProduct.category}</span></p>
                <p>Barcode: <span className="font-medium">{foundProduct.sku}</span></p>
              </div>
              {foundProduct.stock <= foundProduct.min_stock && (
                <Badge variant="destructive" className="mt-2">
                  Low Stock Alert
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {!loading && lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center p-3 border rounded-lg bg-orange-50">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-600">Current: {product.stock} | Min: {product.min_stock}</p>
                  </div>
                  {/* Reorder button removed for both wholesaler and retailer */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProductSubmit} className="space-y-3">
            <Input placeholder="Barcode" value={addProduct.barcode} disabled />
            <Input placeholder="Name" value={addProduct.name} onChange={e => setAddProduct(p => ({ ...p, name: e.target.value }))} required />
            <Input placeholder="Category" value={addProduct.category} onChange={e => setAddProduct(p => ({ ...p, category: e.target.value }))} required />
            <Input placeholder="Price" type="number" value={addProduct.price} onChange={e => setAddProduct(p => ({ ...p, price: e.target.value }))} required />
            <Input placeholder="Stock" type="number" value={addProduct.stock} onChange={e => setAddProduct(p => ({ ...p, stock: e.target.value }))} required />
            <Input placeholder="Min Stock Level" type="number" value={addProduct.minStock} onChange={e => setAddProduct(p => ({ ...p, minStock: e.target.value }))} required />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)} disabled={addLoading}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Product'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BarcodeScanner;

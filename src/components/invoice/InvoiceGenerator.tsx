import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Download, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string;
}

interface InvoiceData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

interface Product {
  id: string;
  name: string;
  sell_price: number;
  stock: number;
}

export function InvoiceGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: ''
  });

  // Fetch available products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sell_price, stock')
        .eq('user_id', user?.id)
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error fetching products',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
    }
  }, [user?.id]);

  // Add new item to invoice
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: uuidv4(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      productId: undefined,
    };
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove item from invoice
  const removeItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
    calculateTotals();
  };

  // Update item in invoice
  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If updating product, get price from products
          if (field === 'description') {
            const product = products.find(p => p.name === value);
            if (product) {
              updatedItem.unitPrice = product.sell_price;
              updatedItem.productId = product.id;
            }
          }
          
          // Recalculate total for the item
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: updatedItems };
    });
    calculateTotals();
  };

  // Calculate subtotal, tax, and total
  const calculateTotals = () => {
    setTimeout(() => {
      setInvoiceData(prev => {
        const subtotal = prev.items.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.18; // 18% VAT
        const total = subtotal + tax;

        return {
          ...prev,
          subtotal,
          tax,
          total
        };
      });
    }, 0);
  };

  // Save invoice and deduct stock
  const saveInvoice = async () => {
    try {
      setLoading(true);

      // Validate invoice data
      if (!invoiceData.customerName || invoiceData.items.length === 0) {
        throw new Error('Please fill in customer details and add items');
      }

      // Check stock availability
      for (const item of invoiceData.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Save invoice to database
      const { data: savedInvoice, error: saveInvoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user?.id,
          branch_id: user?.id, // Use user_id as branch_id for now
          invoice_number: invoiceNumber,
          customer_name: invoiceData.customerName,
          customer_email: invoiceData.customerEmail,
          customer_phone: invoiceData.customerPhone,
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal: invoiceData.subtotal,
          vat_amount: invoiceData.tax,
          total_amount: invoiceData.total,
          status: 'pending',
          notes: invoiceData.notes,
        })
        .select()
        .single();

      if (saveInvoiceError) throw saveInvoiceError;

      // Save invoice items
      const invoiceItems = invoiceData.items.map(item => ({
        invoice_id: savedInvoice.id,
        product_id: item.productId,
        product_name: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Deduct stock for each item
      for (const item of invoiceData.items) {
        if (!item.productId) continue;

        // Get current stock and deduct
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();

        if (fetchError) throw fetchError;

        const newStock = currentProduct.stock - item.quantity;
        
        // Update stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (stockError) throw stockError;
      }

      toast({
        title: 'Success',
        description: 'Invoice created and stock updated successfully.',
        variant: 'default',
      });

      // Reset form
      setInvoiceData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: ''
      });

      // Refresh products list
      fetchProducts();

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF invoice
  const generatePDF = async () => {
    try {
      if (invoiceData.items.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add items to generate PDF.',
          variant: 'destructive',
        });
        return;
      }

      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      
      // Create invoice data for PDF
      const pdfData = {
        id: 'preview',
        invoice_number: `PREVIEW-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`,
        customer_name: invoiceData.customerName || 'Customer Name',
        customer_email: invoiceData.customerEmail,
        customer_phone: invoiceData.customerPhone,
        subtotal: invoiceData.subtotal,
        vat_amount: invoiceData.tax,
        total_amount: invoiceData.total,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        notes: invoiceData.notes,
        invoice_items: invoiceData.items.map(item => ({
          product_name: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.total
        }))
      };

      await generateInvoicePDF(pdfData);
      
      toast({
        title: 'Success',
        description: 'Invoice PDF generated successfully.',
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error generating PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <span role="img" aria-label="Invoice">📄</span>
          Generate Invoice
        </CardTitle>
        <p className="text-sm text-muted-foreground">Create professional invoices and manage inventory automatically</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={invoiceData.customerName}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={invoiceData.customerEmail}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="Enter customer email"
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={invoiceData.customerPhone}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Enter customer phone"
              />
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Input
                id="customerAddress"
                value={invoiceData.customerAddress}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Enter customer address"
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button onClick={addItem} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {/* Show products status */}
            {loading && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            )}
            
            {!loading && products.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No products available in inventory.</p>
                <p className="text-sm text-muted-foreground mt-2">Add products to your inventory first.</p>
              </div>
            )}
            
            {!loading && products.length > 0 && invoiceData.items.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">Click "Add Item" to start building your invoice.</p>
                <p className="text-sm text-muted-foreground mt-2">{products.length} products available in inventory.</p>
              </div>
            )}
            
            <div className="space-y-4">
              {invoiceData.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-start bg-card border border-border rounded-lg p-4">
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Product</Label>
                      <Select
                        value={item.productId || ""}
                        onValueChange={(value) => {
                          const product = products.find(p => p.id === value);
                          if (product) {
                            updateItem(item.id, 'productId', value);
                            updateItem(item.id, 'description', product.name);
                            updateItem(item.id, 'unitPrice', product.sell_price);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock}) - TZS {product.sell_price.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        max={products.find(p => p.id === item.productId)?.stock || 999}
                      />
                    </div>
                    <div>
                      <Label>Unit Price (TZS)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Total (TZS)</Label>
                      <Input
                        type="number"
                        value={item.total}
                        readOnly
                        className="bg-muted font-medium"
                      />
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="mt-6"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-foreground">Invoice Summary</h4>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>TZS {invoiceData.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>VAT (18%):</span>
              <span>TZS {invoiceData.tax.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span className="text-primary">TZS {invoiceData.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes or special instructions"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={generatePDF}
              disabled={loading || invoiceData.items.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={saveInvoice}
              disabled={loading || invoiceData.items.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Invoice'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

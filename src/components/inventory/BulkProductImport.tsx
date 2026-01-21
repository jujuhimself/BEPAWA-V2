import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  FileText,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { inventoryService } from '@/services/inventoryService';

interface ImportRow {
  rowNumber: number;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  manufacturer: string;
  expiryDate: string;
  status: 'valid' | 'error' | 'warning';
  errors: string[];
  warnings: string[];
}

const TEMPLATE_HEADERS = [
  'Name*',
  'Category*',
  'SKU/Barcode*',
  'Barcode',
  'Buy Price*',
  'Sell Price*',
  'Stock*',
  'Min Stock Level',
  'Manufacturer',
  'Expiry Date (YYYY-MM-DD)',
  'Description',
  'Dosage Form',
  'Strength',
  'Pack Size',
  'Batch Number'
];

const BulkProductImport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const csvContent = TEMPLATE_HEADERS.join(',') + '\n' +
      'Paracetamol 500mg,Pain Relief,PAR-500,1234567890123,500,800,100,20,PharmaCorp,2025-12-31,Tablet for pain relief,Tablet,500mg,100 tablets,BATCH001\n' +
      'Amoxicillin 250mg,Antibiotics,AMX-250,9876543210123,1200,2000,50,10,MediPharm,2025-06-30,Antibiotic capsule,Capsule,250mg,20 capsules,BATCH002';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'product_import_template.csv';
    link.click();
    
    toast({
      title: 'Template Downloaded',
      description: 'Fill in the template and upload it to import your products.',
    });
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  };

  const validateRow = (row: string[], rowNumber: number): ImportRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const name = row[0] || '';
    const category = row[1] || '';
    const sku = row[2] || '';
    const barcode = row[3] || row[2] || '';
    const buyPrice = parseFloat(row[4]) || 0;
    const sellPrice = parseFloat(row[5]) || 0;
    const stock = parseInt(row[6]) || 0;
    const minStock = parseInt(row[7]) || 10;
    const manufacturer = row[8] || '';
    const expiryDate = row[9] || '';
    
    // Required field validations
    if (!name) errors.push('Name is required');
    if (!category) errors.push('Category is required');
    if (!sku) errors.push('SKU/Barcode is required');
    if (buyPrice <= 0) errors.push('Buy price must be greater than 0');
    if (sellPrice <= 0) errors.push('Sell price must be greater than 0');
    if (stock < 0) errors.push('Stock cannot be negative');
    
    // Warnings
    if (sellPrice <= buyPrice) warnings.push('Sell price should be higher than buy price');
    if (stock < minStock) warnings.push('Stock is below minimum level');
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      if (expiry < threeMonths) warnings.push('Product expires within 3 months');
    }
    
    return {
      rowNumber,
      name,
      category,
      sku,
      barcode,
      buyPrice,
      sellPrice,
      stock,
      minStock,
      manufacturer,
      expiryDate,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setParsedData([]);
    setImportResult(null);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }
      
      // Skip header row
      const dataRows = rows.slice(1);
      const validated = dataRows.map((row, index) => validateRow(row, index + 2));
      
      setParsedData(validated);
      setShowPreview(true);
      
      const validCount = validated.filter(r => r.status === 'valid').length;
      const warningCount = validated.filter(r => r.status === 'warning').length;
      const errorCount = validated.filter(r => r.status === 'error').length;
      
      toast({
        title: 'File Parsed',
        description: `${validCount} valid, ${warningCount} warnings, ${errorCount} errors`,
      });
    } catch (error: any) {
      toast({
        title: 'Error Parsing File',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importProducts = async () => {
    const validRows = parsedData.filter(r => r.status !== 'error');
    
    if (validRows.length === 0) {
      toast({
        title: 'No Valid Products',
        description: 'Please fix errors before importing.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    
    const errors: string[] = [];
    let successCount = 0;
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        await inventoryService.createProduct({
          name: row.name,
          category: row.category,
          sku: row.sku,
          barcode: row.barcode,
          buy_price: row.buyPrice,
          sell_price: row.sellPrice,
          price: row.sellPrice,
          stock: row.stock,
          min_stock: row.minStock,
          manufacturer: row.manufacturer,
          expiry_date: row.expiryDate || undefined,
          status: row.stock > row.minStock ? 'in-stock' : row.stock > 0 ? 'low-stock' : 'out-of-stock',
        });
        successCount++;
      } catch (error: any) {
        errors.push(`Row ${row.rowNumber}: ${error.message}`);
      }
      
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    
    setImportResult({
      success: successCount,
      failed: validRows.length - successCount,
      errors
    });
    
    setIsImporting(false);
    setShowPreview(false);
    setParsedData([]);
    
    toast({
      title: 'Import Complete',
      description: `${successCount} products imported successfully.`,
    });
  };

  const getStatusBadge = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-primary"><CheckCircle className="w-3 h-3 mr-1" /> Valid</Badge>;
      case 'warning':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Product Import
          </CardTitle>
          <CardDescription>
            Import products from CSV files to quickly migrate from other systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Download our CSV template with the correct format</li>
                <li>Fill in your product data (you can export from your old system and reformat)</li>
                <li>Upload the filled CSV file</li>
                <li>Review and confirm the import</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-dashed">
              <CardContent className="p-6 text-center">
                <Download className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Step 1: Download Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get our CSV template with all required columns
                </p>
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed">
              <CardContent className="p-6 text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Step 2: Upload Your File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your filled CSV file
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <Button asChild disabled={isProcessing}>
                    <span>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload CSV
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{importResult.success}</p>
                <p className="text-sm text-muted-foreground">Products Imported</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Errors:</h4>
                <ul className="text-sm text-destructive space-y-1">
                  {importResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...and {importResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Import Data</DialogTitle>
          </DialogHeader>
          
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing products... {importProgress}%
              </p>
            </div>
          )}
          
          {!isImporting && (
            <>
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" className="text-primary border-primary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valid: {parsedData.filter(r => r.status === 'valid').length}
                </Badge>
                <Badge variant="outline" className="text-secondary-foreground border-secondary">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Warnings: {parsedData.filter(r => r.status === 'warning').length}
                </Badge>
                <Badge variant="outline" className="text-destructive border-destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Errors: {parsedData.filter(r => r.status === 'error').length}
                </Badge>
              </div>
              
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row) => (
                      <TableRow key={row.rowNumber} className={row.status === 'error' ? 'bg-destructive/10' : ''}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell className="font-medium">{row.name || '-'}</TableCell>
                        <TableCell>{row.category || '-'}</TableCell>
                        <TableCell>{row.sku || '-'}</TableCell>
                        <TableCell>TZS {row.sellPrice.toLocaleString()}</TableCell>
                        <TableCell>{row.stock}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {row.errors.length > 0 && (
                            <p className="text-xs text-destructive">{row.errors.join(', ')}</p>
                          )}
                          {row.warnings.length > 0 && (
                            <p className="text-xs text-muted-foreground">{row.warnings.join(', ')}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={importProducts} 
              disabled={isImporting || parsedData.filter(r => r.status !== 'error').length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {parsedData.filter(r => r.status !== 'error').length} Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkProductImport;

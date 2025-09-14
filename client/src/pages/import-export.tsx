import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Download, Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Product } from '@shared/schema';

interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ sku: string; error: string }>;
}

interface ValidationError {
  row: number;
  errors: string[];
}

const EXPORT_COLUMNS = [
  { key: 'sku', label: 'SKU', required: true },
  { key: 'modelo', label: 'Modelo' },
  { key: 'marca', label: 'Marca' },
  { key: 'familia', label: 'Familia' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'caracteristicas', label: 'Características' },
  { key: 'precioUsdSinIva', label: 'Precio USD Sin IVA' },
  { key: 'precioUsdConIva', label: 'Precio USD Con IVA' },
  { key: 'precioCompra', label: 'Precio Compra' },
  { key: 'ivaPercent', label: 'IVA %' },
  { key: 'stock', label: 'Stock' },
  { key: 'stockCantidad', label: 'Cantidad Stock' },
  { key: 'lowStockThreshold', label: 'Umbral Stock Bajo' },
  { key: 'combustible', label: 'Combustible' },
  { key: 'potencia', label: 'Potencia' },
  { key: 'motor', label: 'Motor' },
  { key: 'cabina', label: 'Cabina' },
  { key: 'ttaIncluido', label: 'TTA Incluido' },
];

export default function ImportExport() {
  const { toast } = useToast();
  
  // Export state
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.map(col => col.key))
  );
  const [exportFilter, setExportFilter] = useState({
    familia: '',
    stock: ''
  });
  
  // Import state
  const [importData, setImportData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'create' | 'upsert'>('upsert');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Queries
  const { data: families = [] } = useQuery<string[]>({
    queryKey: ['/api/families']
  });
  
  const { data: existingSkus = [] } = useQuery<string[]>({
    queryKey: ['/api/products/skus']
  });
  
  // Export mutation
  const exportProducts = useMutation({
    mutationFn: async (): Promise<Product[]> => {
      const params = new URLSearchParams();
      if (exportFilter.familia) params.append('familia', exportFilter.familia);
      if (exportFilter.stock) params.append('stock', exportFilter.stock);
      
      const response = await apiRequest('GET', `/api/products/export?${params}`);
      return response.json();
    },
    onSuccess: (data: Product[]) => {
      // Filter columns
      const exportData = data.map(product => {
        const row: any = {};
        selectedColumns.forEach(col => {
          row[col] = product[col as keyof Product];
        });
        return row;
      });
      
      // Export to Excel or CSV based on button clicked
      return exportData;
    }
  });
  
  // Import mutation
  const importProducts = useMutation({
    mutationFn: async (products: any[]): Promise<ImportResult> => {
      const response = await apiRequest('POST', '/api/products/bulk-import', { products });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: 'Importación completada',
        description: `${result.created} productos creados, ${result.updated} actualizados`,
        duration: 5000
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error en la importación',
        description: error.message || 'Error al importar productos',
        variant: 'destructive'
      });
    }
  });
  
  // Export functions
  const handleExportExcel = async () => {
    const data = await exportProducts.mutateAsync();
    
    // Filter columns
    const exportData = data.map((product: Product) => {
      const row: any = {};
      selectedColumns.forEach(col => {
        row[col] = product[col as keyof Product];
      });
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: 'Exportación exitosa',
      description: `Se exportaron ${exportData.length} productos`
    });
  };
  
  const handleExportCSV = async () => {
    const data = await exportProducts.mutateAsync();
    
    // Filter columns
    const exportData = data.map((product: Product) => {
      const row: any = {};
      selectedColumns.forEach(col => {
        row[col] = product[col as keyof Product];
      });
      return row;
    });
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exportación exitosa',
      description: `Se exportaron ${exportData.length} productos`
    });
  };
  
  // Import functions
  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target?.result;
      
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        Papa.parse(content as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            validateAndSetImportData(results.data);
          },
          error: (error: Error) => {
            toast({
              title: 'Error al leer archivo',
              description: error.message,
              variant: 'destructive'
            });
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const workbook = XLSX.read(content, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        validateAndSetImportData(data);
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, [existingSkus, importMode]);
  
  const validateAndSetImportData = (data: any[]) => {
    const errors: ValidationError[] = [];
    const processedData: any[] = [];
    
    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const processedRow: any = {};
      
      // Validate required fields
      if (!row.sku) {
        rowErrors.push('SKU es requerido');
      }
      
      // Check for duplicate SKUs in create mode
      if (importMode === 'create' && row.sku && (existingSkus as string[]).includes(row.sku)) {
        rowErrors.push(`SKU ${row.sku} ya existe`);
      }
      
      // Process and validate each field
      processedRow.sku = row.sku?.toString().trim();
      processedRow.modelo = row.modelo?.toString().trim() || null;
      processedRow.marca = row.marca?.toString().trim() || null;
      processedRow.familia = row.familia?.toString().trim() || null;
      processedRow.descripcion = row.descripcion?.toString().trim() || null;
      processedRow.caracteristicas = row.caracteristicas?.toString().trim() || null;
      
      // Numeric fields
      if (row.precioUsdSinIva) {
        const price = parseFloat(row.precioUsdSinIva);
        if (isNaN(price) || price < 0) {
          rowErrors.push('Precio USD Sin IVA debe ser un número válido');
        } else {
          processedRow.precioUsdSinIva = price.toString();
        }
      }
      
      if (row.precioUsdConIva) {
        const price = parseFloat(row.precioUsdConIva);
        if (isNaN(price) || price < 0) {
          rowErrors.push('Precio USD Con IVA debe ser un número válido');
        } else {
          processedRow.precioUsdConIva = price.toString();
        }
      }
      
      if (row.precioCompra) {
        const price = parseFloat(row.precioCompra);
        if (isNaN(price) || price < 0) {
          rowErrors.push('Precio Compra debe ser un número válido');
        } else {
          processedRow.precioCompra = price.toString();
        }
      }
      
      if (row.ivaPercent) {
        const iva = parseFloat(row.ivaPercent);
        if (isNaN(iva) || iva < 0 || iva > 100) {
          rowErrors.push('IVA % debe ser entre 0 y 100');
        } else {
          processedRow.ivaPercent = iva.toString();
        }
      }
      
      // Stock fields
      if (row.stock) {
        const validStockValues = ['Disponible', 'Sin Stock', 'Consultar'];
        if (!validStockValues.includes(row.stock)) {
          rowErrors.push(`Stock debe ser uno de: ${validStockValues.join(', ')}`);
        } else {
          processedRow.stock = row.stock;
        }
      }
      
      if (row.stockCantidad !== undefined) {
        const cantidad = parseInt(row.stockCantidad);
        if (isNaN(cantidad) || cantidad < 0) {
          rowErrors.push('Cantidad Stock debe ser un número entero positivo');
        } else {
          processedRow.stockCantidad = cantidad;
        }
      }
      
      if (row.lowStockThreshold !== undefined) {
        const threshold = parseInt(row.lowStockThreshold);
        if (isNaN(threshold) || threshold < 0) {
          rowErrors.push('Umbral Stock Bajo debe ser un número entero positivo');
        } else {
          processedRow.lowStockThreshold = threshold;
        }
      }
      
      // Other fields
      processedRow.combustible = row.combustible?.toString().trim() || null;
      processedRow.potencia = row.potencia?.toString().trim() || null;
      processedRow.motor = row.motor?.toString().trim() || null;
      processedRow.cabina = row.cabina?.toString().trim() || null;
      
      // Boolean field
      if (row.ttaIncluido !== undefined) {
        processedRow.ttaIncluido = ['true', '1', 'si', 'sí', 'yes'].includes(
          row.ttaIncluido.toString().toLowerCase()
        );
      }
      
      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors }); // +2 for header row and 0-index
      }
      
      processedData.push(processedRow);
    });
    
    setValidationErrors(errors);
    setImportData(processedData);
    
    if (errors.length === 0) {
      toast({
        title: 'Archivo validado',
        description: `${processedData.length} productos listos para importar`
      });
    } else {
      toast({
        title: 'Errores de validación',
        description: `Se encontraron errores en ${errors.length} filas`,
        variant: 'destructive'
      });
    }
  };
  
  const handleImport = async () => {
    if (importData.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos para importar',
        variant: 'destructive'
      });
      return;
    }
    
    if (validationErrors.length > 0) {
      toast({
        title: 'Errores pendientes',
        description: 'Corrija los errores de validación antes de importar',
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);
    setImportProgress(0);
    
    // Process in batches of 200
    const batchSize = 200;
    const batches = [];
    
    for (let i = 0; i < importData.length; i += batchSize) {
      batches.push(importData.slice(i, i + batchSize));
    }
    
    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: Array<{ sku: string; error: string }> = [];
    
    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await importProducts.mutateAsync(batches[i]);
        totalCreated += result.created;
        totalUpdated += result.updated;
        allErrors.push(...result.errors);
        
        setImportProgress(((i + 1) / batches.length) * 100);
      } catch (error) {
        console.error('Batch import error:', error);
      }
    }
    
    setImportResult({
      created: totalCreated,
      updated: totalUpdated,
      errors: allErrors
    });
    
    setIsProcessing(false);
    setImportProgress(100);
  };
  
  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        
        // Check file size
        const maxSize = file.name.endsWith('.csv') ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: 'Archivo muy grande',
            description: `El archivo excede el límite de ${file.name.endsWith('.csv') ? '10MB' : '5MB'}`,
            variant: 'destructive'
          });
          return;
        }
        
        processFile(file);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });
  
  // Download templates
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        sku: 'EJEMPLO001',
        modelo: 'Modelo Ejemplo',
        marca: 'Marca Ejemplo',
        familia: 'Familia Ejemplo',
        descripcion: 'Descripción del producto',
        caracteristicas: 'Características técnicas',
        precioUsdSinIva: '1000.00',
        precioUsdConIva: '1210.00',
        precioCompra: '800.00',
        ivaPercent: '21',
        stock: 'Disponible',
        stockCantidad: '10',
        lowStockThreshold: '5',
        combustible: 'Nafta',
        potencia: '100HP',
        motor: 'V8',
        cabina: 'Simple',
        ttaIncluido: 'false'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  };
  
  const downloadCSVTemplate = () => {
    const templateData = [
      {
        sku: 'EJEMPLO001',
        modelo: 'Modelo Ejemplo',
        marca: 'Marca Ejemplo',
        familia: 'Familia Ejemplo',
        descripcion: 'Descripción del producto',
        caracteristicas: 'Características técnicas',
        precioUsdSinIva: '1000.00',
        precioUsdConIva: '1210.00',
        precioCompra: '800.00',
        ivaPercent: '21',
        stock: 'Disponible',
        stockCantidad: '10',
        lowStockThreshold: '5',
        combustible: 'Nafta',
        potencia: '100HP',
        motor: 'V8',
        cabina: 'Simple',
        ttaIncluido: 'false'
      }
    ];
    
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_productos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Importar y Exportar Productos</h1>
        <p className="text-muted-foreground">
          Gestione la importación y exportación masiva de productos
        </p>
      </div>
      
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" data-testid="tab-export">Exportar</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">Importar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Productos</CardTitle>
              <CardDescription>
                Seleccione las columnas y filtros para exportar productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Column Selection */}
              <div>
                <h3 className="text-sm font-medium mb-3">Columnas a exportar</h3>
                <div className="grid grid-cols-3 gap-3">
                  {EXPORT_COLUMNS.map(column => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.has(column.key)}
                        disabled={column.required}
                        onCheckedChange={(checked) => {
                          const newSelection = new Set(selectedColumns);
                          if (checked) {
                            newSelection.add(column.key);
                          } else if (!column.required) {
                            newSelection.delete(column.key);
                          }
                          setSelectedColumns(newSelection);
                        }}
                        data-testid={`checkbox-${column.key}`}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {column.label}
                        {column.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Filtrar por Familia</label>
                  <Select
                    value={exportFilter.familia}
                    onValueChange={(value) => setExportFilter(prev => ({ ...prev, familia: value }))}
                  >
                    <SelectTrigger data-testid="select-familia">
                      <SelectValue placeholder="Todas las familias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las familias</SelectItem>
                      {(families as string[]).map((family) => (
                        <SelectItem key={family} value={family}>
                          {family}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Filtrar por Stock</label>
                  <Select
                    value={exportFilter.stock}
                    onValueChange={(value) => setExportFilter(prev => ({ ...prev, stock: value }))}
                  >
                    <SelectTrigger data-testid="select-stock">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los estados</SelectItem>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Sin Stock">Sin Stock</SelectItem>
                      <SelectItem value="Consultar">Consultar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Export Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={handleExportExcel}
                  disabled={exportProducts.isPending}
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Excel (.xlsx)
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  disabled={exportProducts.isPending}
                  data-testid="button-export-csv"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Productos</CardTitle>
              <CardDescription>
                Cargue un archivo Excel o CSV con los productos a importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Download Templates */}
              <div>
                <h3 className="text-sm font-medium mb-3">Descargar Plantillas</h3>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={downloadExcelTemplate}
                    data-testid="button-template-excel"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Plantilla Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadCSVTemplate}
                    data-testid="button-template-csv"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Plantilla CSV
                  </Button>
                </div>
              </div>
              
              {/* Import Mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Modo de Importación</label>
                <Select
                  value={importMode}
                  onValueChange={(value: 'create' | 'upsert') => setImportMode(value)}
                >
                  <SelectTrigger className="w-64" data-testid="select-import-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upsert">Crear y Actualizar</SelectItem>
                    <SelectItem value="create">Solo Crear Nuevos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* File Upload */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400'}`}
                data-testid="dropzone-import"
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Suelte el archivo aquí...</p>
                ) : (
                  <>
                    <p className="text-lg mb-2">
                      Arrastre un archivo aquí o haga clic para seleccionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formatos soportados: Excel (.xlsx, .xls) hasta 5MB, CSV hasta 10MB
                    </p>
                  </>
                )}
              </div>
              
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        Se encontraron errores en {validationErrors.length} filas:
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        {validationErrors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm">
                            Fila {error.row}: {error.errors.join(', ')}
                          </div>
                        ))}
                        {validationErrors.length > 5 && (
                          <div className="text-sm italic">
                            ...y {validationErrors.length - 5} errores más
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Preview Table */}
              {importData.length > 0 && validationErrors.length === 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    Vista Previa ({importData.length} productos)
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Familia</TableHead>
                          <TableHead>Precio USD</TableHead>
                          <TableHead>Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell data-testid={`cell-sku-${index}`}>{row.sku}</TableCell>
                            <TableCell data-testid={`cell-modelo-${index}`}>{row.modelo}</TableCell>
                            <TableCell data-testid={`cell-marca-${index}`}>{row.marca}</TableCell>
                            <TableCell data-testid={`cell-familia-${index}`}>{row.familia}</TableCell>
                            <TableCell data-testid={`cell-precio-${index}`}>{row.precioUsdSinIva}</TableCell>
                            <TableCell data-testid={`cell-stock-${index}`}>{row.stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importData.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        ...y {importData.length - 5} productos más
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Import Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando productos...</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}
              
              {/* Import Result */}
              {importResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Importación completada:</p>
                      <ul className="text-sm space-y-1">
                        <li>✓ {importResult.created} productos creados</li>
                        <li>✓ {importResult.updated} productos actualizados</li>
                        {importResult.errors.length > 0 && (
                          <li className="text-red-600">
                            ✗ {importResult.errors.length} errores
                          </li>
                        )}
                      </ul>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Errores:</p>
                          <div className="max-h-24 overflow-y-auto">
                            {importResult.errors.map((error, index) => (
                              <div key={index} className="text-sm text-red-600">
                                SKU {error.sku}: {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={importData.length === 0 || validationErrors.length > 0 || isProcessing}
                className="w-full"
                data-testid="button-import"
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar {importData.length} Productos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
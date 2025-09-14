import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, CameraOff, Upload, X, Plus, Minus, Package } from "lucide-react";
import { Product } from "@shared/schema";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  onProductNotFound: (barcode: string) => void;
  onStockUpdate: (product: Product, delta: number) => void;
}

export default function BarcodeScanner({
  isOpen,
  onClose,
  onProductFound,
  onProductNotFound,
  onStockUpdate,
}: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt">("prompt");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize scanner
  useEffect(() => {
    if (isOpen && !readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  // Check camera permissions
  useEffect(() => {
    if (isOpen && navigator.mediaDevices) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((result) => {
          setPermissionStatus(result.state as "granted" | "denied" | "prompt");
        })
        .catch(() => {
          // Fallback for browsers that don't support permissions API
          setPermissionStatus("prompt");
        });
    }
  }, [isOpen]);

  const startScanning = async () => {
    try {
      // Reinitialize reader if it was cleared
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      
      if (!videoRef.current) return;
      
      setScanning(true);
      setFoundProduct(null);
      
      // Request camera permission and start scanning
      await readerRef.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            handleBarcodeDetected(code);
            stopScanning();
          }
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara. Por favor, verifica los permisos.",
        variant: "destructive",
      });
      setScanning(false);
      setPermissionStatus("denied");
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      // BrowserMultiFormatReader doesn't have a reset method
      // We need to reinitialize the reader when needed
      try {
        // Try to stop any ongoing decode operations
        (readerRef.current as any).stopAsyncDecode?.();
      } catch (error) {
        // Ignore errors if method doesn't exist
      }
      // Clear the reader reference for reinitialization
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/barcode/${barcode}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const product = await response.json();
        setFoundProduct(product);
        onProductFound(product);
        toast({
          title: "Producto encontrado",
          description: `${product.sku} - ${product.descripcion || "Sin descripción"}`,
        });
      } else if (response.status === 404) {
        onProductNotFound(barcode);
        toast({
          title: "Producto no encontrado",
          description: `No se encontró un producto con el código ${barcode}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching product:", error);
      toast({
        title: "Error",
        description: "Error al buscar el producto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de barras",
        variant: "destructive",
      });
      return;
    }
    handleBarcodeDetected(manualCode.trim());
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Create image element
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = async () => {
        try {
          if (readerRef.current) {
            const result = await readerRef.current.decodeFromImageElement(img);
            if (result) {
              handleBarcodeDetected(result.getText());
            }
          }
        } catch (error) {
          console.error("Error decoding image:", error);
          toast({
            title: "Error",
            description: "No se pudo leer el código de barras de la imagen",
            variant: "destructive",
          });
        } finally {
          URL.revokeObjectURL(url);
          setLoading(false);
        }
      };
      
      img.src = url;
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error",
        description: "Error al procesar la imagen",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleStockAdjust = async (delta: number) => {
    if (!foundProduct) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/products/${foundProduct.id}/stock-adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ delta }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setFoundProduct(updatedProduct);
        onStockUpdate(updatedProduct, delta);
        toast({
          title: "Stock actualizado",
          description: `Stock ajustado en ${delta > 0 ? "+" : ""}${delta} unidades`,
        });
        setStockAdjustment(0);
      } else {
        throw new Error("Failed to update stock");
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: "Error",
        description: "Error al actualizar el stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopScanning();
    setFoundProduct(null);
    setManualCode("");
    setStockAdjustment(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="barcode-scanner-dialog">
        <DialogHeader>
          <DialogTitle>Escáner de Código de Barras</DialogTitle>
          <DialogDescription>
            Escanea o ingresa un código de barras para buscar productos y ajustar stock
          </DialogDescription>
        </DialogHeader>

        {!foundProduct ? (
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="camera" data-testid="tab-camera">
                <Camera className="mr-2 h-4 w-4" />
                Cámara
              </TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual">
                <Package className="mr-2 h-4 w-4" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="mr-2 h-4 w-4" />
                Imagen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${!scanning && "hidden"}`}
                  data-testid="video-preview"
                />
                {!scanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    {permissionStatus === "denied" ? (
                      <div className="text-center text-white p-4">
                        <CameraOff className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No se puede acceder a la cámara</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Por favor, verifica los permisos en la configuración del navegador
                        </p>
                      </div>
                    ) : (
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-400">Cámara apagada</p>
                      </div>
                    )}
                  </div>
                )}
                {scanning && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded">
                    Apunta el código de barras a la cámara
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!scanning ? (
                  <Button
                    onClick={startScanning}
                    disabled={loading || permissionStatus === "denied"}
                    className="flex-1"
                    data-testid="button-start-scan"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Iniciar Escaneo
                  </Button>
                ) : (
                  <Button
                    onClick={stopScanning}
                    variant="destructive"
                    className="flex-1"
                    data-testid="button-stop-scan"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Detener Escaneo
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-code">Código de Barras</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-code"
                    placeholder="Ingresa el código de barras"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleManualSearch()}
                    disabled={loading}
                    data-testid="input-manual-code"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={loading || !manualCode.trim()}
                    data-testid="button-manual-search"
                  >
                    Buscar
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-2">Sube una imagen con código de barras</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  data-testid="button-select-image"
                >
                  Seleccionar Imagen
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Card data-testid="product-found-card">
            <CardHeader>
              <CardTitle>Producto Encontrado</CardTitle>
              <CardDescription>
                SKU: {foundProduct.sku} | Código: {foundProduct.barcode}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Modelo:</p>
                  <p data-testid="text-product-model">{foundProduct.modelo || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Marca:</p>
                  <p data-testid="text-product-brand">{foundProduct.marca || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Familia:</p>
                  <p data-testid="text-product-family">{foundProduct.familia || "N/A"}</p>
                </div>
                <div>
                  <p className="font-semibold">Stock Actual:</p>
                  <p className="font-bold" data-testid="text-current-stock">
                    {foundProduct.stockCantidad || 0} unidades
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Ajustar Stock</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setStockAdjustment(stockAdjustment - 1)}
                    disabled={loading}
                    data-testid="button-decrease-stock"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={stockAdjustment}
                    onChange={(e) => setStockAdjustment(parseInt(e.target.value) || 0)}
                    className="w-24 text-center"
                    disabled={loading}
                    data-testid="input-stock-adjustment"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setStockAdjustment(stockAdjustment + 1)}
                    disabled={loading}
                    data-testid="button-increase-stock"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleStockAdjust(stockAdjustment)}
                    disabled={loading || stockAdjustment === 0}
                    data-testid="button-apply-adjustment"
                  >
                    Aplicar
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStockAdjust(1)}
                    disabled={loading}
                    data-testid="button-quick-add"
                  >
                    +1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStockAdjust(-1)}
                    disabled={loading || (foundProduct.stockCantidad || 0) === 0}
                    data-testid="button-quick-remove"
                  >
                    -1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStockAdjust(10)}
                    disabled={loading}
                    data-testid="button-quick-add-10"
                  >
                    +10
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFoundProduct(null);
                    setStockAdjustment(0);
                  }}
                  className="flex-1"
                  data-testid="button-scan-another"
                >
                  Escanear Otro
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1"
                  data-testid="button-close"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
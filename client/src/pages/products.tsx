import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import ProductTable from "@/components/products/product-table";
import ProductModal from "@/components/products/product-modal";
import MultimediaModal from "@/components/products/multimedia-modal";
import BarcodeScanner from "@/components/products/barcode-scanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productsApi, statsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore, isEditor } from "@/lib/auth";
import { Product } from "@shared/schema";
import { Plus, Search, ScanLine } from "lucide-react";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMultimediaModalOpen, setIsMultimediaModalOpen] = useState(false);
  const [selectedProductForMultimedia, setSelectedProductForMultimedia] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [newBarcodeForProduct, setNewBarcodeForProduct] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = isEditor(); // Admin o Editor pueden editar

  // Fetch products with filters
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", { 
      page: currentPage, 
      limit: itemsPerPage, 
      search: searchQuery, 
      familia: selectedFamily 
    }],
    queryFn: () => productsApi.getProducts({ 
      page: currentPage, 
      limit: itemsPerPage, 
      search: searchQuery, 
      familia: selectedFamily === "all" ? "" : selectedFamily 
    }),
  });

  // Fetch families for filter
  const { data: families } = useQuery({
    queryKey: ["/api/families"],
    queryFn: statsApi.getFamilies,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setIsModalOpen(false);
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      productsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsModalOpen(false);
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    if (!canEdit) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para editar productos",
        variant: "destructive",
      });
      return;
    }
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (!canEdit) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para eliminar productos",
        variant: "destructive",
      });
      return;
    }
    if (confirm(`¿Estás seguro de que quieres eliminar el producto ${product.sku}?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleSaveProduct = (data: any) => {
    // Si tenemos un código de barras nuevo, agregarlo a los datos
    if (newBarcodeForProduct && !editingProduct) {
      data.barcode = newBarcodeForProduct;
    }
    
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
    
    // Limpiar el código de barras temporal
    setNewBarcodeForProduct(null);
  };

  const handleManageMultimedia = (product: Product) => {
    setSelectedProductForMultimedia(product);
    setIsMultimediaModalOpen(true);
  };

  const handleProductFound = (product: Product) => {
    // Producto encontrado, el componente del escáner maneja la visualización
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const handleProductNotFound = (barcode: string) => {
    // Producto no encontrado, ofrecer crear nuevo
    setNewBarcodeForProduct(barcode);
    setEditingProduct(null);
    setIsScannerOpen(false);
    setIsModalOpen(true);
    toast({
      title: "Producto no encontrado",
      description: "Puedes crear un nuevo producto con este código de barras",
    });
  };

  const handleStockUpdate = (product: Product, delta: number) => {
    // Actualización de stock realizada
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    toast({
      title: "Stock actualizado",
      description: `Stock de ${product.sku} ajustado en ${delta > 0 ? "+" : ""}${delta} unidades`,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Topbar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Gestión de Productos</h1>
                  <p className="text-muted-foreground mt-1">
                    Administra el catálogo completo de productos KOR
                  </p>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <>
                      <Button
                        onClick={() => setIsScannerOpen(true)}
                        variant="outline"
                        data-testid="button-scanner"
                        className="flex items-center gap-2"
                      >
                        <ScanLine className="h-4 w-4" />
                        <span className="hidden sm:inline">Escanear</span>
                      </Button>
                      <Button onClick={handleNewProduct} data-testid="button-new-product">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Producto
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por SKU, modelo o descripción..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-products"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                        <SelectTrigger data-testid="select-family-filter">
                          <SelectValue placeholder="Todas las familias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las familias</SelectItem>
                          {families?.map((family: string) => (
                            <SelectItem key={family} value={family}>
                              {family}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-48">
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                        <SelectTrigger data-testid="select-items-per-page">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 por página</SelectItem>
                          <SelectItem value="50">50 por página</SelectItem>
                          <SelectItem value="100">100 por página</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSearch} data-testid="button-search">
                      <Search className="mr-2 h-4 w-4" />
                      Buscar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                  <CardDescription>
                    {productsData?.pagination?.total || 0} productos encontrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductTable
                    products={productsData?.products || []}
                    isLoading={isLoading}
                    pagination={productsData?.pagination}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onManageMultimedia={handleManageMultimedia}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />

      {/* Multimedia Modal */}
      <MultimediaModal
        isOpen={isMultimediaModalOpen}
        onClose={() => {
          setIsMultimediaModalOpen(false);
          setSelectedProductForMultimedia(null);
        }}
        product={selectedProductForMultimedia}
      />

      {/* Barcode Scanner */}
      {canEdit && (
        <BarcodeScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onProductFound={handleProductFound}
          onProductNotFound={handleProductNotFound}
          onStockUpdate={handleStockUpdate}
        />
      )}
    </div>
  );
}

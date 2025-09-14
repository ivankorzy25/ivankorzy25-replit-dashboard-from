import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import ProductTable from "@/components/products/product-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { statsApi, productsApi, alertsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Box, 
  Layers, 
  CheckCircle, 
  XCircle,
  Download,
  Plus,
  Calculator,
  Upload,
  CloudUpload,
  AlertTriangle,
  Bell
} from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [priceUpdateData, setPriceUpdateData] = useState({
    familia: "",
    percentage: "",
  });
  const { toast } = useToast();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: statsApi.getStats,
  });

  // Fetch recent products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", { page: 1, limit: 10 }],
    queryFn: () => productsApi.getProducts({ page: 1, limit: 10 }),
  });

  // Fetch low stock products
  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery({
    queryKey: ["/api/products/low-stock"],
    queryFn: () => alertsApi.getLowStockProducts(),
  });

  // Fetch alert config
  const { data: alertConfig } = useQuery({
    queryKey: ["/api/alerts/config"],
    queryFn: alertsApi.getConfig,
  });

  const handleBulkPriceUpdate = async () => {
    try {
      const percentage = parseFloat(priceUpdateData.percentage);
      if (isNaN(percentage)) {
        toast({
          title: "Error",
          description: "Please enter a valid percentage",
          variant: "destructive",
        });
        return;
      }

      await productsApi.bulkPriceUpdate({
        percentage,
        field: "precioUsdSinIva",
        familia: priceUpdateData.familia === "all" ? undefined : priceUpdateData.familia || undefined,
      });

      toast({
        title: "Success",
        description: "Prices updated successfully",
      });

      setPriceUpdateData({ familia: "", percentage: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update prices",
        variant: "destructive",
      });
    }
  };

  const statCards = [
    {
      title: "Total Productos",
      value: stats?.totalProductos || 0,
      icon: Box,
      color: "bg-primary",
    },
    {
      title: "Familias",
      value: stats?.totalFamilias || 0,
      icon: Layers,
      color: "bg-accent",
    },
    {
      title: "En Stock",
      value: stats?.enStock || 0,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      title: "Sin Stock",
      value: stats?.sinStock || 0,
      icon: XCircle,
      color: "bg-destructive",
    },
  ];

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
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Resumen general del sistema KOR</p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                  <Card key={index} className="overflow-hidden shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                            <stat.icon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-muted-foreground truncate">
                              {stat.title}
                            </dt>
                            <dd className="text-2xl font-bold text-foreground" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                              {statsLoading ? "..." : stat.value.toLocaleString()}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Products Table Section */}
              <div className="mt-8">
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Productos Recientes</CardTitle>
                        <CardDescription>
                          Últimos productos agregados o modificados
                        </CardDescription>
                      </div>
                      <div className="flex space-x-3">
                        <Button variant="outline" data-testid="button-export">
                          <Download className="mr-2 h-4 w-4" />
                          Exportar
                        </Button>
                        <Button data-testid="button-new-product">
                          <Plus className="mr-2 h-4 w-4" />
                          Nuevo Producto
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ProductTable 
                      products={productsData?.products || []}
                      isLoading={productsLoading}
                      pagination={productsData?.pagination}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Low Stock Alert Widget */}
              {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="mt-8">
                  <Card className="shadow-sm border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <CardTitle className="text-orange-900 dark:text-orange-100">
                            Alertas de Stock Bajo
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-orange-600" data-testid="low-stock-count">
                            {lowStockProducts.length}
                          </span>
                          <span className="text-sm text-muted-foreground">productos</span>
                        </div>
                      </div>
                      <CardDescription>
                        Productos que requieren atención inmediata por stock bajo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {lowStockProducts.slice(0, 5).map((product: any) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200">
                            <div>
                              <p className="font-medium" data-testid={`alert-product-${product.sku}`}>
                                {product.sku} - {product.modelo || "Sin modelo"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {product.descripcion || "Sin descripción"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-orange-600">
                                {product.stockCantidad || 0}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Umbral: {product.lowStockThreshold || alertConfig?.defaultThreshold || 10}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {lowStockProducts.length > 5 && (
                        <p className="text-sm text-center text-muted-foreground mt-2">
                          ... y {lowStockProducts.length - 5} productos más
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Quick Actions Section */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bulk Price Update */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Actualización Masiva de Precios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="familia">Familia</Label>
                      <Select
                        value={priceUpdateData.familia}
                        onValueChange={(value) => 
                          setPriceUpdateData(prev => ({ ...prev, familia: value }))
                        }
                      >
                        <SelectTrigger data-testid="select-familia-bulk">
                          <SelectValue placeholder="Todas las familias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las familias</SelectItem>
                          <SelectItem value="Herramientas">Herramientas</SelectItem>
                          <SelectItem value="Soldaduras">Soldaduras</SelectItem>
                          <SelectItem value="Seguridad">Seguridad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="percentage">Porcentaje de Aumento/Descuento</Label>
                      <div className="relative">
                        <Input
                          id="percentage"
                          type="number"
                          step="0.01"
                          placeholder="10.5"
                          value={priceUpdateData.percentage}
                          onChange={(e) => 
                            setPriceUpdateData(prev => ({ ...prev, percentage: e.target.value }))
                          }
                          data-testid="input-percentage"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleBulkPriceUpdate}
                      data-testid="button-bulk-update"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Aplicar Cambios
                    </Button>
                  </CardContent>
                </Card>

                {/* File Upload */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Subir Archivos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Arrastra archivos aquí o{" "}
                        <button className="text-primary hover:text-primary/80 font-medium">
                          selecciona archivos
                        </button>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG, PDF, MP4 hasta 50MB
                      </p>
                    </div>
                    <Button variant="outline" className="w-full" data-testid="button-browse-files">
                      <Upload className="mr-2 h-4 w-4" />
                      Explorar Archivos
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

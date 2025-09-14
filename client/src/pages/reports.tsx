import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { getAuthHeaders } from "@/lib/auth";
import { 
  Download, 
  TrendingUp, 
  Package, 
  DollarSign, 
  PieChartIcon,
  BarChart3,
  LineChartIcon,
  AlertCircle,
  Calendar,
  CheckCircle,
  CalendarIcon
} from "lucide-react";

// Color palette for charts
const COLORS = {
  primary: "#FF5733",
  secondary: "#FFA500",
  tertiary: "#2E7D32",
  quaternary: "#1976D2",
  accent: "#9C27B0",
  warning: "#FFC107",
  success: "#4CAF50",
  error: "#F44336",
  muted: "#9E9E9E"
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.quaternary,
  COLORS.accent,
  COLORS.warning,
  COLORS.success,
  COLORS.error,
  COLORS.muted
];

interface InventorySummary {
  totalValue: number;
  valueByFamily: Array<{ family: string; value: number; count: number }>;
  stockDistribution: Array<{ status: string; count: number; percentage: number }>;
}

interface PriceTrend {
  date: string;
  family: string;
  avgPrice: number;
  productCount: number;
}

interface FamilyDistribution {
  family: string;
  productCount: number;
  avgPrice: number;
  totalValue: number;
  inStock: number;
  outOfStock: number;
}

// Interface for date range
interface DateRange {
  from: Date;
  to: Date;
}

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // Fetch inventory summary
  const { data: inventorySummary, isLoading: summaryLoading } = useQuery<InventorySummary>({
    queryKey: ["/api/reports/inventory-summary"],
    queryFn: async () => {
      const response = await fetch("/api/reports/inventory-summary", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch inventory summary");
      return response.json();
    },
  });

  // Fetch price trends
  const { data: priceTrends, isLoading: trendsLoading } = useQuery<PriceTrend[]>({
    queryKey: ["/api/reports/price-trends", dateRange],
    queryFn: async () => {
      const days = Math.max(1, Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));
      const response = await fetch(`/api/reports/price-trends?days=${days}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch price trends");
      return response.json();
    },
  });

  // Fetch family distribution
  const { data: familyDistribution, isLoading: distributionLoading } = useQuery<FamilyDistribution[]>({
    queryKey: ["/api/reports/family-distribution"],
    queryFn: async () => {
      const response = await fetch("/api/reports/family-distribution", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch family distribution");
      return response.json();
    },
  });

  // Fetch families for filter
  const { data: families } = useQuery<string[]>({
    queryKey: ["/api/families"],
    queryFn: async () => {
      const response = await fetch("/api/families", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch families");
      return response.json();
    },
  });

  // Process data for charts
  const chartData = {
    familyBar: familyDistribution?.map(f => ({
      name: f.family,
      productos: f.productCount,
      enStock: f.inStock,
      sinStock: f.outOfStock,
    })) || [],
    
    stockPie: inventorySummary?.stockDistribution || [],
    
    priceLine: priceTrends
      ?.filter(t => selectedFamily === "all" || t.family === selectedFamily)
      .reduce((acc: any[], trend) => {
        const existing = acc.find(item => item.date === trend.date);
        if (existing) {
          existing[trend.family] = trend.avgPrice;
        } else {
          acc.push({
            date: trend.date,
            [trend.family]: trend.avgPrice,
          });
        }
        return acc;
      }, []) || [],
    
    valueArea: inventorySummary?.valueByFamily?.map(f => ({
      name: f.family,
      valor: f.value,
      productos: f.count,
    })) || [],
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = familyDistribution?.map(f => ({
      Familia: f.family,
      "Total Productos": f.productCount,
      "Precio Promedio": f.avgPrice.toFixed(2),
      "Valor Total": f.totalValue.toFixed(2),
      "En Stock": f.inStock,
      "Sin Stock": f.outOfStock,
    })) || [];

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map(row => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-kor-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = summaryLoading || trendsLoading || distributionLoading;

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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Reportes y Análisis</h1>
                  <p className="text-muted-foreground mt-1">
                    Visualización de datos y métricas del inventario
                  </p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Actualizado en tiempo real
                </Badge>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              {/* Filters Section */}
              <Card className="mb-6 shadow-sm">
                <CardHeader>
                  <CardTitle>Filtros y Controles</CardTitle>
                  <CardDescription>
                    Personaliza los datos mostrados en los gráficos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="family-filter">Familia de Productos</Label>
                      <Select
                        value={selectedFamily}
                        onValueChange={setSelectedFamily}
                      >
                        <SelectTrigger id="family-filter" data-testid="select-family-filter">
                          <SelectValue placeholder="Seleccionar familia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las familias</SelectItem>
                          {families?.map(family => (
                            <SelectItem key={family} value={family}>
                              {family}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Rango de Fechas</Label>
                      <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start" 
                            data-testid="button-date-range"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(dateRange.from, "PP", { locale: es })} - {format(dateRange.to, "PP", { locale: es })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-4 space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Fecha de inicio</Label>
                              <CalendarComponent
                                mode="single"
                                selected={tempDateRange.from}
                                onSelect={(date) => {
                                  if (date) {
                                    setTempDateRange(prev => ({
                                      ...prev,
                                      from: date,
                                      // If from date is after to date, adjust to date
                                      to: date > prev.to ? date : prev.to
                                    }));
                                  }
                                }}
                                disabled={(date) => date > new Date() || date < addDays(new Date(), -365)}
                                initialFocus
                                locale={es}
                              />
                            </div>
                            <Separator />
                            <div>
                              <Label className="text-sm font-medium">Fecha de fin</Label>
                              <CalendarComponent
                                mode="single"
                                selected={tempDateRange.to}
                                onSelect={(date) => {
                                  if (date) {
                                    setTempDateRange(prev => ({
                                      ...prev,
                                      to: date
                                    }));
                                  }
                                }}
                                disabled={(date) => date > new Date() || date < tempDateRange.from}
                                locale={es}
                              />
                            </div>
                            <div className="flex justify-between">
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const to = new Date();
                                    const from = addDays(to, -7);
                                    setTempDateRange({ from, to });
                                  }}
                                  data-testid="button-date-range-7days"
                                >
                                  7 días
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const to = new Date();
                                    const from = addDays(to, -30);
                                    setTempDateRange({ from, to });
                                  }}
                                  data-testid="button-date-range-30days"
                                >
                                  30 días
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const to = new Date();
                                    const from = addDays(to, -90);
                                    setTempDateRange({ from, to });
                                  }}
                                  data-testid="button-date-range-90days"
                                >
                                  90 días
                                </Button>
                              </div>
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTempDateRange(dateRange);
                                    setIsDateRangeOpen(false);
                                  }}
                                  data-testid="button-date-range-cancel"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setDateRange(tempDateRange);
                                    setIsDateRangeOpen(false);
                                  }}
                                  data-testid="button-date-range-apply"
                                >
                                  Aplicar
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div>
                      <Label>Acciones</Label>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={exportToCSV}
                        disabled={!familyDistribution}
                        data-testid="button-export-csv"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Estado</Label>
                      <div className="flex items-center gap-2 h-10">
                        {isLoading ? (
                          <Badge variant="secondary">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Cargando...
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Actualizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              {inventorySummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Valor Total del Inventario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="stat-total-value">
                        ${inventorySummary.totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-secondary" />
                        Total de Familias
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="stat-total-families">
                        {inventorySummary.valueByFamily.length}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-tertiary" />
                        Tasa de Disponibilidad
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" data-testid="stat-availability-rate">
                        {inventorySummary.stockDistribution.find(s => s.status === 'Disponible')?.percentage || 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products by Family Bar Chart */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Productos por Familia
                    </CardTitle>
                    <CardDescription>
                      Distribución de productos en stock y sin stock por familia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {distributionLoading ? (
                      <Skeleton className="h-[300px]" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.familyBar}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="enStock" fill={COLORS.success} name="En Stock" />
                          <Bar dataKey="sinStock" fill={COLORS.error} name="Sin Stock" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Stock Distribution Pie Chart */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5" />
                      Distribución de Stock
                    </CardTitle>
                    <CardDescription>
                      Estado actual del inventario por disponibilidad
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <Skeleton className="h-[300px]" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={chartData.stockPie}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ status, percentage }) => `${status}: ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {chartData.stockPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Price Trends Line Chart */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChartIcon className="h-5 w-5" />
                      Tendencia de Precios
                    </CardTitle>
                    <CardDescription>
                      Evolución de precios promedio por familia en el tiempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendsLoading ? (
                      <Skeleton className="h-[300px]" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.priceLine}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {families?.map((family, index) => (
                            <Line
                              key={family}
                              type="monotone"
                              dataKey={family}
                              stroke={CHART_COLORS[index % CHART_COLORS.length]}
                              strokeWidth={2}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Inventory Value Area Chart */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Valor del Inventario por Familia
                    </CardTitle>
                    <CardDescription>
                      Valor total acumulado por cada familia de productos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <Skeleton className="h-[300px]" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData.valueArea}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="valor" 
                            stroke={COLORS.primary} 
                            fill={COLORS.primary}
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Insights */}
              <div className="mt-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Los datos mostrados son en tiempo real y se actualizan automáticamente. 
                    Para análisis históricos más detallados, utilice la función de exportación CSV.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
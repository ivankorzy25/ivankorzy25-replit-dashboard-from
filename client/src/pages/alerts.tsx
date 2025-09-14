import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { alertsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Mail, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Send,
  X,
  Plus,
  Save,
  TestTube,
  RefreshCw,
  Package,
  BellRing,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const configSchema = z.object({
  defaultThreshold: z.number().min(1, "El umbral debe ser al menos 1"),
  summaryFrequency: z.enum(["daily", "weekly"]),
  recipients: z.array(z.string().email("Email inválido")),
  isEnabled: z.boolean(),
  fromEmail: z.string().email("Email inválido"),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testType, setTestType] = useState<"low_stock" | "digest">("low_stock");
  const { toast } = useToast();

  // Fetch alert configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["/api/alerts/config"],
    queryFn: alertsApi.getConfig,
  });

  // Fetch notifications history
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/alerts/notifications"],
    queryFn: () => alertsApi.getNotifications(50),
  });

  // Fetch low stock products
  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery({
    queryKey: ["/api/products/low-stock"],
    queryFn: () => alertsApi.getLowStockProducts(),
  });

  // Form setup
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      defaultThreshold: config?.defaultThreshold || 10,
      summaryFrequency: config?.summaryFrequency || "daily",
      recipients: config?.recipients || [],
      isEnabled: config?.isEnabled ?? true,
      fromEmail: config?.fromEmail || "alertas@kor-sistema.com",
    },
    values: config ? {
      defaultThreshold: config.defaultThreshold || 10,
      summaryFrequency: config.summaryFrequency || "daily",
      recipients: config.recipients || [],
      isEnabled: config.isEnabled ?? true,
      fromEmail: config.fromEmail || "alertas@kor-sistema.com",
    } : undefined,
  });

  // Mutation to update config
  const updateConfigMutation = useMutation({
    mutationFn: alertsApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/config"] });
      toast({
        title: "✅ Configuración actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar configuración",
        variant: "destructive",
      });
    },
  });

  // Mutation to send test email
  const sendTestMutation = useMutation({
    mutationFn: ({ type, email }: { type: "low_stock" | "digest"; email: string }) =>
      alertsApi.sendTestEmail(type, email),
    onSuccess: () => {
      toast({
        title: "✅ Email de prueba enviado",
        description: "Revisa tu bandeja de entrada",
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar email de prueba",
        variant: "destructive",
      });
    },
  });

  // Mutation to check stock manually
  const checkStockMutation = useMutation({
    mutationFn: (force: boolean) => alertsApi.checkStock(force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/notifications"] });
      toast({
        title: "✅ Verificación ejecutada",
        description: "Se ha verificado el stock y enviado alertas si es necesario",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al verificar stock",
        variant: "destructive",
      });
    },
  });

  // Mutation to send digest manually
  const sendDigestMutation = useMutation({
    mutationFn: (frequency: "daily" | "weekly") => alertsApi.sendDigest(frequency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/notifications"] });
      toast({
        title: "✅ Resumen enviado",
        description: "El resumen ha sido enviado a los destinatarios",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar resumen",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfigFormData) => {
    updateConfigMutation.mutate(data);
  };

  const addEmailRecipient = () => {
    if (newEmail && z.string().email().safeParse(newEmail).success) {
      const currentRecipients = form.getValues("recipients");
      if (!currentRecipients.includes(newEmail)) {
        form.setValue("recipients", [...currentRecipients, newEmail]);
        setNewEmail("");
      }
    } else {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido",
        variant: "destructive",
      });
    }
  };

  const removeEmailRecipient = (email: string) => {
    const currentRecipients = form.getValues("recipients");
    form.setValue("recipients", currentRecipients.filter(e => e !== email));
  };

  const sendTestEmail = () => {
    if (!testEmail || !z.string().email().safeParse(testEmail).success) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido",
        variant: "destructive",
      });
      return;
    }
    sendTestMutation.mutate({ type: testType, email: testEmail });
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
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Configuración de Alertas</h1>
              </div>
              <p className="text-muted-foreground mt-1">
                Gestiona las notificaciones automáticas de inventario y stock bajo
              </p>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              <Tabs defaultValue="config" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="config" data-testid="tab-config">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </TabsTrigger>
                  <TabsTrigger value="notifications" data-testid="tab-notifications">
                    <BellRing className="mr-2 h-4 w-4" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="low-stock" data-testid="tab-low-stock">
                    <Package className="mr-2 h-4 w-4" />
                    Stock Bajo
                  </TabsTrigger>
                  <TabsTrigger value="test" data-testid="tab-test">
                    <TestTube className="mr-2 h-4 w-4" />
                    Pruebas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Configuración General</CardTitle>
                          <CardDescription>
                            Define los parámetros globales para las alertas de inventario
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name="isEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Sistema de Alertas
                                  </FormLabel>
                                  <FormDescription>
                                    Activa o desactiva todas las notificaciones automáticas
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-alerts-enabled"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="defaultThreshold"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Umbral Global de Stock Bajo</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="10"
                                      {...field}
                                      onChange={e => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-threshold"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Cantidad mínima antes de considerar stock bajo
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="summaryFrequency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Frecuencia de Resúmenes</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-frequency">
                                        <SelectValue placeholder="Selecciona frecuencia" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="daily">Diario (8:00 AM)</SelectItem>
                                      <SelectItem value="weekly">Semanal (Lunes 8:00 AM)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Con qué frecuencia enviar resúmenes de inventario
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="fromEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Remitente</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="alertas@kor-sistema.com"
                                    {...field}
                                    data-testid="input-from-email"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Dirección de email desde la cual se enviarán las alertas
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Destinatarios de Alertas</CardTitle>
                          <CardDescription>
                            Emails que recibirán las notificaciones de stock bajo
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="ejemplo@correo.com"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addEmailRecipient())}
                              data-testid="input-new-recipient"
                            />
                            <Button type="button" onClick={addEmailRecipient} data-testid="button-add-recipient">
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {form.watch("recipients").map((email) => (
                              <div key={email} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span data-testid={`recipient-${email}`}>{email}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEmailRecipient(email)}
                                  data-testid={`button-remove-${email}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {form.watch("recipients").length === 0 && (
                              <p className="text-muted-foreground text-center py-4">
                                No hay destinatarios configurados
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateConfigMutation.isPending} data-testid="button-save-config">
                          <Save className="mr-2 h-4 w-4" />
                          {updateConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Historial de Notificaciones</CardTitle>
                      <CardDescription>
                        Últimas alertas enviadas por el sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        {notificationsLoading ? (
                          <p className="text-center py-8">Cargando historial...</p>
                        ) : notifications && notifications.length > 0 ? (
                          <div className="space-y-4">
                            {notifications.map((notification: any) => (
                              <div key={notification.id} className="border rounded-lg p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    {notification.status === "sent" ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                    <Badge variant={notification.type === "low_stock" ? "destructive" : "default"}>
                                      {notification.type === "low_stock" ? "Stock Bajo" : "Resumen"}
                                    </Badge>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(notification.sentAt), "dd MMM yyyy HH:mm", { locale: es })}
                                  </span>
                                </div>
                                <p className="font-medium">{notification.subject}</p>
                                <p className="text-sm text-muted-foreground">{notification.body}</p>
                                {notification.error && (
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{notification.error}</AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-8 text-muted-foreground">
                            No hay notificaciones en el historial
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="low-stock" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Productos con Stock Bajo</CardTitle>
                          <CardDescription>
                            Productos que están por debajo del umbral configurado
                          </CardDescription>
                        </div>
                        <Badge variant="destructive" className="text-lg px-3 py-1">
                          {lowStockProducts?.length || 0} productos
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        {lowStockLoading ? (
                          <p className="text-center py-8">Cargando productos...</p>
                        ) : lowStockProducts && lowStockProducts.length > 0 ? (
                          <div className="space-y-2">
                            {lowStockProducts.map((product: any) => (
                              <div key={product.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium" data-testid={`low-stock-${product.sku}`}>
                                      {product.sku} - {product.modelo || "Sin modelo"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {product.descripcion || "Sin descripción"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-red-500">
                                      {product.stockCantidad || 0}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Umbral: {product.lowStockThreshold || config?.defaultThreshold || 10}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>¡Excelente!</AlertTitle>
                            <AlertDescription>
                              No hay productos con stock bajo en este momento
                            </AlertDescription>
                          </Alert>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="test" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Enviar Email de Prueba</CardTitle>
                      <CardDescription>
                        Envía un email de prueba para verificar la configuración
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Email</Label>
                          <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                            <SelectTrigger data-testid="select-test-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low_stock">Alerta de Stock Bajo</SelectItem>
                              <SelectItem value="digest">Resumen Diario</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Email Destinatario</Label>
                          <Input
                            type="email"
                            placeholder="test@ejemplo.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            data-testid="input-test-email"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={sendTestEmail} 
                        disabled={sendTestMutation.isPending}
                        data-testid="button-send-test"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sendTestMutation.isPending ? "Enviando..." : "Enviar Email de Prueba"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Acciones Manuales</CardTitle>
                      <CardDescription>
                        Ejecuta verificaciones y envíos de forma manual
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <Button
                          variant="outline"
                          onClick={() => checkStockMutation.mutate(false)}
                          disabled={checkStockMutation.isPending}
                          data-testid="button-check-stock"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {checkStockMutation.isPending ? "Verificando..." : "Verificar Stock"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => sendDigestMutation.mutate("daily")}
                          disabled={sendDigestMutation.isPending}
                          data-testid="button-send-daily"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {sendDigestMutation.isPending ? "Enviando..." : "Enviar Resumen Diario"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => sendDigestMutation.mutate("weekly")}
                          disabled={sendDigestMutation.isPending}
                          data-testid="button-send-weekly"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {sendDigestMutation.isPending ? "Enviando..." : "Enviar Resumen Semanal"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Product } from "@shared/schema";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  familia: z.string().optional(),
  descripcion: z.string().optional(),
  caracteristicas: z.string().optional(),
  precioUsdSinIva: z.string().optional(),
  precioUsdConIva: z.string().optional(),
  precioCompra: z.string().optional(),
  ivaPercent: z.string().optional(),
  stock: z.string().optional(),
  combustible: z.string().optional(),
  potencia: z.string().optional(),
  motor: z.string().optional(),
  cabina: z.string().optional(),
  ttaIncluido: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (data: ProductFormData) => void;
  isLoading?: boolean;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  onSave,
  isLoading,
}: ProductModalProps) {
  const isEdit = !!product;
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      modelo: "",
      marca: "",
      familia: "",
      descripcion: "",
      caracteristicas: "",
      precioUsdSinIva: "",
      precioUsdConIva: "",
      precioCompra: "",
      ivaPercent: "21",
      stock: "Sin Stock",
      combustible: "",
      potencia: "",
      motor: "",
      cabina: "",
      ttaIncluido: false,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        sku: product.sku || "",
        modelo: product.modelo || "",
        marca: product.marca || "",
        familia: product.familia || "",
        descripcion: product.descripcion || "",
        caracteristicas: product.caracteristicas || "",
        precioUsdSinIva: product.precioUsdSinIva || "",
        precioUsdConIva: product.precioUsdConIva || "",
        precioCompra: product.precioCompra || "",
        ivaPercent: product.ivaPercent || "21",
        stock: product.stock || "Sin Stock",
        combustible: product.combustible || "",
        potencia: product.potencia || "",
        motor: product.motor || "",
        cabina: product.cabina || "",
        ttaIncluido: product.ttaIncluido || false,
      });
    } else {
      form.reset();
    }
  }, [product, form]);

  const onSubmit = (data: ProductFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {isEdit ? "Editar Producto" : "Agregar Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Modifica los datos del producto existente"
              : "Completa la información para crear un nuevo producto"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEdit} data-testid="input-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-modelo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-marca" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="familia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familia</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-familia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stock">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Disponible">Disponible</SelectItem>
                        <SelectItem value="Sin Stock">Sin Stock</SelectItem>
                        <SelectItem value="Consultar">Consultar</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="combustible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustible</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-combustible">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Nafta">Nafta</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Gas">Gas</SelectItem>
                        <SelectItem value="Nafta/Gas">Nafta/Gas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="precioUsdSinIva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio USD sin IVA</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-precio-sin-iva" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ivaPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA %</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-iva" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precioCompra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Compra</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-precio-compra" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="textarea-descripcion" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="caracteristicas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Características</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="textarea-caracteristicas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Technical Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="potencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potencia</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-potencia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-motor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cabina"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cabina</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-cabina" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* TTA Checkbox */}
            <FormField
              control={form.control}
              name="ttaIncluido"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-tta"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>TTA Incluido</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-save">
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

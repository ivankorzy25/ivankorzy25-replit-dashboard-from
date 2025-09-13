import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@shared/schema";
import { Edit, Images, Trash2, FileText, Video, Image as ImageIcon } from "lucide-react";

interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onManageMultimedia?: (product: Product) => void;
}

export default function ProductTable({
  products,
  isLoading,
  pagination,
  onEdit,
  onDelete,
  onManageMultimedia,
}: ProductTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  const getStockBadgeVariant = (stock: string) => {
    switch (stock) {
      case "Disponible":
        return "default";
      case "Sin Stock":
        return "destructive";
      case "Consultar":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const renderMultimediaStatus = (product: Product) => {
    const hasImage = product.instagramFeedUrl1 || product.webGenericaUrl1 || product.mercadoLibreUrl1;
    const hasPdf = product.urlPdf;
    const hasVideo = false; // Add video field when available
    
    return (
      <div className="flex space-x-2">
        <ImageIcon 
          className={`h-4 w-4 ${hasImage ? 'text-green-500' : 'text-gray-300'}`} 
          title={hasImage ? "Imagen disponible" : "Imagen no disponible"}
        />
        <FileText 
          className={`h-4 w-4 ${hasPdf ? 'text-red-500' : 'text-gray-300'}`} 
          title={hasPdf ? "PDF disponible" : "PDF no disponible"}
        />
        <Video 
          className={`h-4 w-4 ${hasVideo ? 'text-blue-500' : 'text-gray-300'}`} 
          title={hasVideo ? "Video disponible" : "Video no disponible"}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>SKU / Producto</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Precio USD</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Multimedia</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50" data-testid={`row-product-${product.sku}`}>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-foreground" data-testid={`text-sku-${product.sku}`}>
                        {product.sku}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-modelo-${product.sku}`}>
                        {product.modelo || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" data-testid={`badge-familia-${product.sku}`}>
                      {product.familia || "Sin clasificar"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-precio-${product.sku}`}>
                    ${product.precioUsdSinIva || "0.00"}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStockBadgeVariant(product.stock || "Sin Stock")}
                      data-testid={`badge-stock-${product.sku}`}
                    >
                      {product.stock || "Sin Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {renderMultimediaStatus(product)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(product)}
                        data-testid={`button-edit-${product.sku}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManageMultimedia?.(product)}
                        data-testid={`button-multimedia-${product.sku}`}
                      >
                        <Images className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete?.(product)}
                        data-testid={`button-delete-${product.sku}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button variant="outline" size="sm">
              Anterior
            </Button>
            <Button variant="outline" size="sm">
              Siguiente
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Mostrando{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                a{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                de{" "}
                <span className="font-medium">{pagination.total}</span> resultados
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  data-testid="button-prev-page"
                >
                  Anterior
                </Button>
                
                {/* Page numbers */}
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === pagination.page;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Siguiente
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

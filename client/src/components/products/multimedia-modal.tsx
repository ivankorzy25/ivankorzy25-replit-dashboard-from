import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FileUpload from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { productsApi } from "@/lib/api";
import { Product } from "@shared/schema";
import { 
  Eye, 
  Download, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Video,
  Plus,
  X
} from "lucide-react";

interface MultimediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

interface MultimediaField {
  key: keyof Product;
  label: string;
  uploadType: string;
  icon: any;
  acceptedTypes: string[];
}

const multimediaFields: MultimediaField[] = [
  {
    key: "urlPdf",
    label: "PDF Técnico",
    uploadType: "pdf",
    icon: FileText,
    acceptedTypes: ["application/pdf"]
  },
  {
    key: "instagramFeedUrl1",
    label: "Instagram Feed 1",
    uploadType: "imagen_feed_1",
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "instagramFeedUrl2", 
    label: "Instagram Feed 2",
    uploadType: "imagen_feed_2",
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "instagramFeedUrl3",
    label: "Instagram Feed 3", 
    uploadType: "imagen_feed_3",
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "instagramStoryUrl1",
    label: "Instagram Story",
    uploadType: "imagen_story_1", 
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "mercadoLibreUrl1",
    label: "MercadoLibre",
    uploadType: "imagen_ml_1",
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "webGenericaUrl1", 
    label: "Web Genérica",
    uploadType: "imagen_web_1",
    icon: ImageIcon,
    acceptedTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
  },
  {
    key: "urlFichaHtml",
    label: "Ficha HTML",
    uploadType: "ficha_html",
    icon: FileText,
    acceptedTypes: ["text/html", "application/pdf"]
  }
];

export default function MultimediaModal({ isOpen, onClose, product }: MultimediaModalProps) {
  const [selectedField, setSelectedField] = useState<MultimediaField | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setSelectedField(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  // Update product mutation to handle file URL updates
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      productsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Multimedia file updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to update multimedia file",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (url: string, filename: string) => {
    if (!product || !selectedField) return;

    const updateData = {
      [selectedField.key]: url
    };

    updateProductMutation.mutate({ 
      id: product.id, 
      data: updateData 
    });

    setSelectedField(null);
  };

  const handleDeleteFile = (field: MultimediaField) => {
    if (!product) return;

    const updateData = {
      [field.key]: null
    };

    updateProductMutation.mutate({ 
      id: product.id, 
      data: updateData 
    });
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  const getFileType = (url: string): 'image' | 'pdf' | 'other' => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    return 'other';
  };

  const MultimediaFieldCard = ({ field }: { field: MultimediaField }) => {
    const url = product?.[field.key] as string | null;
    const hasFile = !!url;
    const Icon = field.icon;

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Icon className="h-4 w-4" />
            <span>{field.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasFile ? (
            <>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative group overflow-hidden">
                {getFileType(url) === 'image' ? (
                  <img 
                    src={url} 
                    alt={field.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <Icon className="h-12 w-12 text-muted-foreground" />
                )}
                
                {getFileType(url) !== 'image' && (
                  <div className="hidden absolute inset-0 flex items-center justify-center">
                    <Icon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handlePreview(url)}
                    data-testid={`button-preview-${field.uploadType}`}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = field.label;
                      link.click();
                    }}
                    data-testid={`button-download-${field.uploadType}`}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        data-testid={`button-delete-${field.uploadType}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente el archivo "{field.label}" 
                          del producto {product?.sku}. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteFile(field)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <Badge variant="default" className="w-full justify-center text-xs">
                Archivo cargado
              </Badge>
            </>
          ) : (
            <>
              <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                <Icon className="h-12 w-12 text-muted-foreground/50" />
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => setSelectedField(field)}
                data-testid={`button-upload-${field.uploadType}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Subir archivo
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!product) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestión de Multimedia</DialogTitle>
            <DialogDescription>
              Administra los archivos multimedia del producto {product.sku} - {product.modelo || 'Sin modelo'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="manage" data-testid="tab-manage-files">Gestionar Archivos</TabsTrigger>
              {selectedField && (
                <TabsTrigger value="upload" data-testid="tab-upload-file">
                  Subir {selectedField.label}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="manage" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {multimediaFields.map((field) => (
                  <MultimediaFieldCard key={field.key} field={field} />
                ))}
              </div>
            </TabsContent>

            {selectedField && (
              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <selectedField.icon className="h-5 w-5" />
                      <span>Subir {selectedField.label}</span>
                    </CardTitle>
                    <CardDescription>
                      Arrastra un archivo aquí o haz clic para seleccionar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      productId={product.id}
                      uploadType={selectedField.uploadType}
                      onUploadComplete={handleFileUpload}
                      acceptedFileTypes={selectedField.acceptedTypes}
                      maxFileSize={50 * 1024 * 1024} // 50MB
                    />
                    
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedField(null)}
                        data-testid="button-cancel-upload"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4"
              onClick={() => setPreviewUrl(null)}
              data-testid="button-close-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="flex items-center justify-center p-4">
            {previewUrl && (
              <>
                {getFileType(previewUrl) === 'image' ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview"
                    className="max-w-full max-h-[70vh] object-contain"
                    data-testid="img-preview"
                  />
                ) : getFileType(previewUrl) === 'pdf' ? (
                  <iframe 
                    src={previewUrl}
                    className="w-full h-[70vh] border"
                    title="PDF Preview"
                    data-testid="iframe-preview"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Vista previa no disponible</p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="mt-2"
                      data-testid="button-open-external"
                    >
                      Abrir en nueva ventana
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
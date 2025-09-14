import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import FileUpload from "@/components/ui/file-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productsApi, statsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { 
  Search, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Video,
  Trash2,
  Eye,
  Download,
  Filter
} from "lucide-react";

interface MultimediaFile {
  id: string;
  type: 'image' | 'pdf' | 'video';
  url: string;
  filename: string;
  uploadType: string;
  productSku?: string;
  createdAt: string;
}

export default function Multimedia() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [selectedUploadType, setSelectedUploadType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for selection
  const { data: productsData } = useQuery({
    queryKey: ["/api/products", { limit: 1000 }],
    queryFn: () => productsApi.getProducts({ limit: 1000 }),
  });

  // Fetch families for filter
  const { data: families } = useQuery({
    queryKey: ["/api/families"],
    queryFn: statsApi.getFamilies,
  });

  const handleFileUpload = (url: string, filename: string) => {
    toast({
      title: "Upload successful",
      description: `${filename} has been uploaded successfully`,
    });
    // Refresh any relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const uploadTypes = [
    { value: "pdf", label: "PDF Técnico", icon: FileText },
    { value: "imagen_feed_1", label: "Instagram Feed 1", icon: ImageIcon },
    { value: "imagen_feed_2", label: "Instagram Feed 2", icon: ImageIcon },
    { value: "imagen_feed_3", label: "Instagram Feed 3", icon: ImageIcon },
    { value: "imagen_story_1", label: "Instagram Story", icon: ImageIcon },
    { value: "imagen_ml_1", label: "MercadoLibre", icon: ImageIcon },
    { value: "imagen_web_1", label: "Web Genérica", icon: ImageIcon },
    { value: "ficha_html", label: "Ficha HTML", icon: FileText },
  ];

  const getFileTypeFromUrl = (url: string): 'image' | 'pdf' | 'video' => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['mp4', 'avi', 'mov'].includes(extension || '')) return 'video';
    return 'image'; // default
  };

  const getProductMultimediaFiles = (product: Product): MultimediaFile[] => {
    const files: MultimediaFile[] = [];
    
    if (product.urlPdf) {
      files.push({
        id: `${product.id}-pdf`,
        type: 'pdf',
        url: product.urlPdf,
        filename: 'Technical PDF',
        uploadType: 'pdf',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.instagramFeedUrl1) {
      files.push({
        id: `${product.id}-feed1`,
        type: getFileTypeFromUrl(product.instagramFeedUrl1),
        url: product.instagramFeedUrl1,
        filename: 'Instagram Feed 1',
        uploadType: 'imagen_feed_1',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.instagramFeedUrl2) {
      files.push({
        id: `${product.id}-feed2`,
        type: getFileTypeFromUrl(product.instagramFeedUrl2),
        url: product.instagramFeedUrl2,
        filename: 'Instagram Feed 2',
        uploadType: 'imagen_feed_2',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.instagramFeedUrl3) {
      files.push({
        id: `${product.id}-feed3`,
        type: getFileTypeFromUrl(product.instagramFeedUrl3),
        url: product.instagramFeedUrl3,
        filename: 'Instagram Feed 3',
        uploadType: 'imagen_feed_3',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.instagramStoryUrl1) {
      files.push({
        id: `${product.id}-story`,
        type: getFileTypeFromUrl(product.instagramStoryUrl1),
        url: product.instagramStoryUrl1,
        filename: 'Instagram Story',
        uploadType: 'imagen_story_1',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.mercadoLibreUrl1) {
      files.push({
        id: `${product.id}-ml`,
        type: getFileTypeFromUrl(product.mercadoLibreUrl1),
        url: product.mercadoLibreUrl1,
        filename: 'MercadoLibre',
        uploadType: 'imagen_ml_1',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.webGenericaUrl1) {
      files.push({
        id: `${product.id}-web`,
        type: getFileTypeFromUrl(product.webGenericaUrl1),
        url: product.webGenericaUrl1,
        filename: 'Web Genérica',
        uploadType: 'imagen_web_1',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    if (product.urlFichaHtml) {
      files.push({
        id: `${product.id}-html`,
        type: 'pdf',
        url: product.urlFichaHtml,
        filename: 'Ficha HTML',
        uploadType: 'ficha_html',
        productSku: product.sku,
        createdAt: (product.updatedAt || product.createdAt || new Date()).toString(),
      });
    }

    return files;
  };

  // Get all multimedia files from products
  const allFiles = productsData?.products?.flatMap(getProductMultimediaFiles) || [];

  // Filter files based on search and filters
  const filteredFiles = allFiles.filter((file: MultimediaFile) => {
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !file.productSku?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedFileType && selectedFileType !== "all" && file.type !== selectedFileType) {
      return false;
    }
    if (selectedUploadType && selectedUploadType !== "all" && file.uploadType !== selectedUploadType) {
      return false;
    }
    if (selectedProduct && selectedProduct !== "all" && file.productSku !== selectedProduct) {
      return false;
    }
    return true;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'pdf': return FileText;
      case 'video': return Video;
      default: return FileText;
    }
  };

  const FileCard = ({ file }: { file: MultimediaFile }) => {
    const FileIcon = getFileIcon(file.type);
    
    return (
      <Card className="overflow-hidden" data-testid={`file-card-${file.id}`}>
        <CardContent className="p-0">
          <div className="aspect-square bg-muted flex items-center justify-center relative group">
            {file.type === 'image' ? (
              <img 
                src={file.url} 
                alt={file.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <FileIcon className="h-12 w-12 text-muted-foreground" />
            )}
            
            {file.type !== 'image' && (
              <div className="hidden absolute inset-0 flex items-center justify-center">
                <FileIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => window.open(file.url, '_blank')}
                data-testid={`button-view-${file.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = file.url;
                  link.download = file.filename;
                  link.click();
                }}
                data-testid={`button-download-${file.id}`}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <h4 className="font-medium text-sm truncate" data-testid={`text-filename-${file.id}`}>
              {file.filename}
            </h4>
            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-product-${file.id}`}>
              {file.productSku}
            </p>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="text-xs">
                {uploadTypes.find(ut => ut.value === file.uploadType)?.label || file.uploadType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {file.type.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Gestión de Multimedia</h1>
                <p className="text-muted-foreground mt-1">
                  Administra imágenes, PDFs y videos de productos
                </p>
              </div>

              <Tabs defaultValue="upload" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="upload" data-testid="tab-upload">Subir Archivos</TabsTrigger>
                  <TabsTrigger value="manage" data-testid="tab-manage">Gestionar Archivos</TabsTrigger>
                </TabsList>

                {/* Upload Tab */}
                <TabsContent value="upload" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Seleccionar Producto</CardTitle>
                        <CardDescription>
                          Elige el producto para asociar los archivos
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger data-testid="select-product-upload">
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productsData?.products?.map((product: Product) => (
                                <SelectItem key={product.id} value={product.sku}>
                                  {product.sku} - {product.modelo || 'Sin modelo'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Select value={selectedUploadType} onValueChange={setSelectedUploadType}>
                            <SelectTrigger data-testid="select-upload-type">
                              <SelectValue placeholder="Tipo de archivo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center space-x-2">
                                    <type.icon className="h-4 w-4" />
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Subir Archivos</CardTitle>
                        <CardDescription>
                          Arrastra archivos aquí o haz clic para seleccionar
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FileUpload
                          productId={productsData?.products?.find((p: Product) => p.sku === selectedProduct)?.id}
                          uploadType={selectedUploadType}
                          onUploadComplete={handleFileUpload}
                          acceptedFileTypes={[
                            'image/png', 
                            'image/jpeg', 
                            'image/jpg', 
                            'image/gif', 
                            'image/webp',
                            'application/pdf',
                            'video/mp4',
                            'audio/mp3'
                          ]}
                          maxFileSize={50 * 1024 * 1024}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Manage Tab */}
                <TabsContent value="manage" className="space-y-6">
                  {/* Filters */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar archivos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            data-testid="input-search-files"
                          />
                        </div>
                        
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger data-testid="select-product-filter">
                            <SelectValue placeholder="Todos los productos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los productos</SelectItem>
                            {productsData?.products?.map((product: Product) => (
                              <SelectItem key={product.id} value={product.sku}>
                                {product.sku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                          <SelectTrigger data-testid="select-file-type">
                            <SelectValue placeholder="Tipo de archivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="image">Imágenes</SelectItem>
                            <SelectItem value="pdf">PDFs</SelectItem>
                            <SelectItem value="video">Videos</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={selectedUploadType} onValueChange={setSelectedUploadType}>
                          <SelectTrigger data-testid="select-upload-type-filter">
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {uploadTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Files Grid */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Archivos Multimedia</CardTitle>
                      <CardDescription>
                        {filteredFiles.length} archivos encontrados
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {filteredFiles.length === 0 ? (
                        <div className="text-center py-12">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            No se encontraron archivos multimedia
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Sube archivos en la pestaña "Subir Archivos" o ajusta los filtros
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {filteredFiles.map((file: MultimediaFile) => (
                            <FileCard key={file.id} file={file} />
                          ))}
                        </div>
                      )}
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

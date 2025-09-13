import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { uploadApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Video,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface FileUploadProps {
  productId?: string;
  uploadType?: string;
  onUploadComplete?: (url: string, filename: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export default function FileUpload({
  productId,
  uploadType,
  onUploadComplete,
  acceptedFileTypes = ['image/*', 'application/pdf', 'video/mp4', 'audio/mp3'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  className,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const uploadIndex = uploadingFiles.length + i;

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map((upload, index) => 
              index === uploadIndex && upload.progress < 90
                ? { ...upload, progress: upload.progress + 10 }
                : upload
            )
          );
        }, 200);

        const result = await uploadApi.uploadFile(file, productId, uploadType);

        clearInterval(progressInterval);

        setUploadingFiles(prev => 
          prev.map((upload, index) => 
            index === uploadIndex
              ? { ...upload, progress: 100, status: 'success', url: result.url }
              : upload
          )
        );

        onUploadComplete?.(result.url, result.filename);

        toast({
          title: "Upload successful",
          description: `${file.name} has been uploaded successfully`,
        });

      } catch (error: any) {
        setUploadingFiles(prev => 
          prev.map((upload, index) => 
            index === uploadIndex
              ? { ...upload, progress: 0, status: 'error', error: error.message }
              : upload
          )
        );

        toast({
          title: "Upload failed",
          description: error.message || `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }
  }, [productId, uploadType, onUploadComplete, uploadingFiles.length, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type === 'application/pdf') return FileText;
    if (file.type.startsWith('video/')) return Video;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary'
          }
        `}
        data-testid="file-upload-zone"
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          {isDragActive
            ? "Suelta los archivos aquí..."
            : "Arrastra archivos aquí o haz clic para seleccionar"
          }
        </p>
        <p className="text-xs text-muted-foreground">
          {acceptedFileTypes.join(', ')} hasta {formatFileSize(maxFileSize)}
        </p>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadingFiles.map((upload, index) => {
            const FileIcon = getFileIcon(upload.file);
            
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {upload.file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              upload.status === 'success' ? 'default' :
                              upload.status === 'error' ? 'destructive' : 'secondary'
                            }
                          >
                            {upload.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {upload.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {upload.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(upload.file.size)}</span>
                        {upload.status === 'uploading' && (
                          <span>{upload.progress}%</span>
                        )}
                      </div>
                      
                      {upload.status === 'uploading' && (
                        <Progress value={upload.progress} className="mt-2" />
                      )}
                      
                      {upload.status === 'error' && upload.error && (
                        <p className="text-xs text-destructive mt-1">{upload.error}</p>
                      )}
                      
                      {upload.status === 'success' && upload.url && (
                        <p className="text-xs text-green-600 mt-1">
                          Uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { join } from 'path';

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS;

// For development/testing without GCS credentials
const LOCAL_UPLOADS_DIR = join(process.cwd(), 'uploads');

let storage: Storage | null = null;
let bucket: any = null;
let bucketName: string = '';

// Initialize GCS only if credentials are available
if (!isDevelopment) {
  storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
  bucketName = process.env.GCS_BUCKET_NAME || 'kor-archivos-productos-completo';
  bucket = storage.bucket(bucketName);
}

export { bucket };

export async function uploadFile(
  file: Express.Multer.File,
  destination: string
): Promise<string> {
  try {
    if (isDevelopment) {
      // Local file storage for development
      const fullPath = join(LOCAL_UPLOADS_DIR, destination);
      const dir = join(fullPath, '..');
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Write file to local storage
      await fs.writeFile(fullPath, file.buffer);
      
      // Return local URL
      return `http://localhost:5000/uploads/${destination}`;
    } else {
      // Production GCS upload
      const gcsFile = bucket.file(destination);
      
      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', async () => {
          try {
            await gcsFile.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
            resolve(publicUrl);
          } catch (error) {
            reject(error);
          }
        });
        stream.end(file.buffer);
      });
    }
  } catch (error) {
    throw new Error(`Failed to upload file: ${error}`);
  }
}

export async function deleteFile(filename: string): Promise<void> {
  try {
    await bucket.file(filename).delete();
  } catch (error) {
    console.error(`Failed to delete file ${filename}:`, error);
  }
}

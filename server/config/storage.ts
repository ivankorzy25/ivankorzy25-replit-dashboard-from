import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'kor-archivos-productos-completo';

export const bucket = storage.bucket(bucketName);

export async function uploadFile(
  file: Express.Multer.File,
  destination: string
): Promise<string> {
  try {
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

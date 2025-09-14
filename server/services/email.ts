import sgMail from '@sendgrid/mail';
import { type AlertNotification } from '@shared/schema';

// SendGrid integration for Replit
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export interface LowStockProduct {
  sku: string;
  modelo: string;
  descripcion: string;
  stockCantidad: number;
  lowStockThreshold: number | null;
}

// Plantilla de email para stock bajo individual
function getLowStockEmailTemplate(products: LowStockProduct[]): string {
  const productRows = products
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${p.sku}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">${p.modelo || 'Sin modelo'}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="color: #dc2626; font-weight: bold;">${p.stockCantidad}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${p.lowStockThreshold || 'N/A'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${p.descripcion || 'Sin descripción'}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta de Stock Bajo - Sistema KOR</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⚠️ Alerta de Stock Bajo</h1>
          <p style="margin-top: 8px; opacity: 0.9;">Sistema KOR - Gestión de Inventario</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">
              ⚠️ Se detectaron ${products.length} producto${products.length > 1 ? 's' : ''} con stock bajo o crítico
            </p>
          </div>

          <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">Productos Afectados:</h2>
          
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">SKU / Modelo</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Stock Actual</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Umbral</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Descripción</th>
              </tr>
            </thead>
            <tbody>
              ${productRows}
            </tbody>
          </table>

          <div style="margin-top: 32px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <h3 style="color: #374151; font-size: 16px; margin-bottom: 12px;">📋 Acciones Recomendadas:</h3>
            <ul style="color: #6b7280; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Revisar los niveles de inventario actuales</li>
              <li>Contactar proveedores para reabastecimiento</li>
              <li>Actualizar órdenes de compra pendientes</li>
              <li>Verificar productos de alta rotación</li>
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Este es un mensaje automático del Sistema KOR.<br>
            Para configurar las alertas, acceda al panel de administración.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
            © ${new Date().getFullYear()} Sistema KOR - Gestión de Inventario
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Plantilla de resumen diario/semanal
function getDigestEmailTemplate(
  products: LowStockProduct[],
  frequency: 'daily' | 'weekly',
  stats: {
    totalProductos: number;
    sinStock: number;
    stockBajo: number;
  }
): string {
  const productRows = products
    .slice(0, 10) // Mostrar máximo 10 productos
    .map(
      (p) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${p.sku}</strong> - ${p.modelo || 'Sin modelo'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="color: ${p.stockCantidad === 0 ? '#dc2626' : '#f59e0b'}; font-weight: bold;">
            ${p.stockCantidad}
          </span>
        </td>
      </tr>
    `
    )
    .join('');

  const title = frequency === 'daily' ? 'Resumen Diario' : 'Resumen Semanal';
  const periodo = frequency === 'daily' ? 'hoy' : 'esta semana';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Sistema KOR</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📊 ${title} de Inventario</h1>
          <p style="margin-top: 8px; opacity: 0.9;">Sistema KOR - ${new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        
        <!-- Stats Section -->
        <div style="padding: 32px;">
          <h2 style="color: #111827; font-size: 20px; margin-bottom: 20px;">📈 Estadísticas de ${periodo}:</h2>
          
          <div style="display: flex; gap: 16px; margin-bottom: 32px;">
            <div style="flex: 1; background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6;">
              <div style="color: #1e40af; font-size: 32px; font-weight: bold;">${stats.totalProductos}</div>
              <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Total Productos</div>
            </div>
            <div style="flex: 1; background-color: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #f59e0b;">
              <div style="color: #d97706; font-size: 32px; font-weight: bold;">${stats.stockBajo}</div>
              <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Stock Bajo</div>
            </div>
            <div style="flex: 1; background-color: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444;">
              <div style="color: #dc2626; font-size: 32px; font-weight: bold;">${stats.sinStock}</div>
              <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Sin Stock</div>
            </div>
          </div>

          ${products.length > 0 ? `
            <h3 style="color: #374151; font-size: 18px; margin-bottom: 16px;">⚠️ Productos que requieren atención:</h3>
            
            <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 10px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Producto</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${productRows}
              </tbody>
            </table>
            
            ${products.length > 10 ? `
              <p style="color: #6b7280; font-size: 14px; margin-top: 12px; text-align: center;">
                ... y ${products.length - 10} productos más con stock bajo
              </p>
            ` : ''}
          ` : `
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-top: 24px; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-weight: 600;">
                ✅ Excelente: Todos los productos tienen stock suficiente
              </p>
            </div>
          `}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Este es un ${title.toLowerCase()} automático del Sistema KOR.<br>
            Para modificar la configuración, acceda al panel de administración.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
            © ${new Date().getFullYear()} Sistema KOR - Gestión de Inventario
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Función principal para enviar email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  try {
    const msg = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    };

    await sgMail.send(msg);
    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Enviar alerta de stock bajo
export async function sendLowStockAlert(
  products: LowStockProduct[],
  recipients: string[],
  fromEmail: string
): Promise<boolean> {
  if (!products.length || !recipients.length) {
    return false;
  }

  const subject = `⚠️ Alerta: ${products.length} producto${products.length > 1 ? 's' : ''} con stock bajo`;
  const html = getLowStockEmailTemplate(products);

  return await sendEmail({
    to: recipients,
    from: fromEmail,
    subject,
    html,
  });
}

// Enviar resumen diario/semanal
export async function sendDigestEmail(
  products: LowStockProduct[],
  recipients: string[],
  fromEmail: string,
  frequency: 'daily' | 'weekly',
  stats: {
    totalProductos: number;
    sinStock: number;
    stockBajo: number;
  }
): Promise<boolean> {
  if (!recipients.length) {
    return false;
  }

  const title = frequency === 'daily' ? 'Resumen Diario' : 'Resumen Semanal';
  const subject = `📊 ${title} de Inventario - Sistema KOR`;
  const html = getDigestEmailTemplate(products, frequency, stats);

  return await sendEmail({
    to: recipients,
    from: fromEmail,
    subject,
    html,
  });
}

// Email de prueba
export async function sendTestEmail(
  email: string,
  type: 'low_stock' | 'digest',
  fromEmail: string
): Promise<boolean> {
  const testProducts: LowStockProduct[] = [
    {
      sku: 'TEST-001',
      modelo: 'Producto de Prueba',
      descripcion: 'Este es un producto de ejemplo para prueba de alertas',
      stockCantidad: 3,
      lowStockThreshold: 10,
    },
    {
      sku: 'TEST-002',
      modelo: 'Otro Producto',
      descripcion: 'Segundo producto de ejemplo',
      stockCantidad: 0,
      lowStockThreshold: 5,
    },
  ];

  const testStats = {
    totalProductos: 150,
    sinStock: 5,
    stockBajo: 12,
  };

  if (type === 'low_stock') {
    return await sendLowStockAlert(testProducts, [email], fromEmail);
  } else {
    return await sendDigestEmail(testProducts, [email], fromEmail, 'daily', testStats);
  }
}
import * as cron from 'node-cron';
import { storage } from '../storage';
import { sendLowStockAlert, sendDigestEmail } from './email';
import type { Product, AlertConfig } from '@shared/schema';

// Motor de alertas automáticas para inventario
export class AlertEngine {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  // Inicializar el motor de alertas
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Inicializando motor de alertas...');
    
    try {
      const config = await storage.getAlertConfig();
      
      if (!config || !config.isEnabled) {
        console.log('⚠️ Alertas deshabilitadas en la configuración');
        return;
      }

      // Programar verificación de stock bajo cada hora
      this.scheduleStockCheck();

      // Programar resúmenes según configuración
      if (config.summaryFrequency === 'daily') {
        this.scheduleDailyDigest();
      } else if (config.summaryFrequency === 'weekly') {
        this.scheduleWeeklyDigest();
      }

      this.isInitialized = true;
      console.log('✅ Motor de alertas inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar motor de alertas:', error);
    }
  }

  // Detener todas las tareas programadas
  stop() {
    this.cronJobs.forEach((job, name) => {
      job.stop();
      console.log(`⏸️ Detenida tarea: ${name}`);
    });
    this.cronJobs.clear();
    this.isInitialized = false;
  }

  // Programar verificación de stock bajo (cada hora)
  private scheduleStockCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('🔍 Verificando productos con stock bajo...');
      await this.checkLowStock();
    });

    job.start();
    this.cronJobs.set('stock-check', job);
    console.log('📅 Verificación de stock programada: cada hora');
  }

  // Programar resumen diario (todos los días a las 8:00 AM)
  private scheduleDailyDigest() {
    const job = cron.schedule('0 8 * * *', async () => {
      console.log('📧 Enviando resumen diario...');
      await this.sendDigest('daily');
    });

    job.start();
    this.cronJobs.set('daily-digest', job);
    console.log('📅 Resumen diario programado: 8:00 AM');
  }

  // Programar resumen semanal (lunes a las 8:00 AM)
  private scheduleWeeklyDigest() {
    const job = cron.schedule('0 8 * * 1', async () => {
      console.log('📧 Enviando resumen semanal...');
      await this.sendDigest('weekly');
    });

    job.start();
    this.cronJobs.set('weekly-digest', job);
    console.log('📅 Resumen semanal programado: lunes 8:00 AM');
  }

  // Verificar productos con stock bajo y enviar alertas
  async checkLowStock(forceNotification = false): Promise<void> {
    try {
      const config = await storage.getAlertConfig();
      
      if (!config || !config.isEnabled) {
        return;
      }

      if (!config.recipients || config.recipients.length === 0) {
        console.log('⚠️ No hay destinatarios configurados para las alertas');
        return;
      }

      // Obtener productos con stock bajo
      const lowStockProducts = await storage.getLowStockProducts(config.defaultThreshold ?? undefined);
      
      if (!lowStockProducts || lowStockProducts.length === 0) {
        console.log('✅ No hay productos con stock bajo');
        return;
      }

      // Filtrar productos que no han sido notificados recientemente (últimas 24 horas)
      const productsToNotify = forceNotification 
        ? lowStockProducts 
        : lowStockProducts.filter(p => {
            if (!p.lowStockNotifiedAt) return true;
            const lastNotified = new Date(p.lowStockNotifiedAt).getTime();
            const now = Date.now();
            const hoursSinceNotified = (now - lastNotified) / (1000 * 60 * 60);
            return hoursSinceNotified >= 24;
          });

      if (productsToNotify.length === 0) {
        console.log('ℹ️ Todos los productos ya fueron notificados recientemente');
        return;
      }

      console.log(`⚠️ Encontrados ${productsToNotify.length} productos con stock bajo para notificar`);

      // Preparar datos para el email
      const emailProducts = productsToNotify.map(p => ({
        sku: p.sku,
        modelo: p.modelo || '',
        descripcion: p.descripcion || '',
        stockCantidad: p.stockCantidad ?? 0,
        lowStockThreshold: p.lowStockThreshold ?? config.defaultThreshold,
      }));

      // Enviar alerta por email
      const emailSent = await sendLowStockAlert(
        emailProducts,
        config.recipients,
        config.fromEmail || 'noreply@inventario.com'
      );

      if (emailSent) {
        console.log('✅ Alerta de stock bajo enviada exitosamente');
        
        // Actualizar timestamp de notificación para cada producto
        for (const product of productsToNotify) {
          await storage.updateProductNotificationTime(product.id);
        }

        // Guardar registro de la notificación
        await storage.createAlertNotification({
          type: 'low_stock',
          recipients: config.recipients,
          subject: `Alerta: ${productsToNotify.length} productos con stock bajo`,
          body: `Se detectaron ${productsToNotify.length} productos con stock bajo o crítico`,
          status: 'sent',
        });
      } else {
        console.error('❌ Error al enviar alerta de stock bajo');
        
        // Guardar registro del error
        await storage.createAlertNotification({
          type: 'low_stock',
          recipients: config.recipients,
          subject: `Alerta: ${productsToNotify.length} productos con stock bajo`,
          body: `Se detectaron ${productsToNotify.length} productos con stock bajo o crítico`,
          status: 'error',
          error: 'Error al enviar email',
        });
      }
    } catch (error) {
      console.error('❌ Error en checkLowStock:', error);
    }
  }

  // Enviar resumen diario o semanal
  async sendDigest(frequency: 'daily' | 'weekly'): Promise<void> {
    try {
      const config = await storage.getAlertConfig();
      
      if (!config || !config.isEnabled) {
        return;
      }

      if (!config.recipients || config.recipients.length === 0) {
        console.log('⚠️ No hay destinatarios configurados para el resumen');
        return;
      }

      // Verificar si ya se envió el resumen hoy/esta semana
      if (frequency === 'daily' && config.lastDailyDigestAt) {
        const lastSent = new Date(config.lastDailyDigestAt);
        const today = new Date();
        if (
          lastSent.getDate() === today.getDate() &&
          lastSent.getMonth() === today.getMonth() &&
          lastSent.getFullYear() === today.getFullYear()
        ) {
          console.log('ℹ️ El resumen diario ya fue enviado hoy');
          return;
        }
      }

      if (frequency === 'weekly' && config.lastWeeklyDigestAt) {
        const lastSent = new Date(config.lastWeeklyDigestAt);
        const now = Date.now();
        const daysSinceLastSent = (now - lastSent.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent < 7) {
          console.log('ℹ️ El resumen semanal ya fue enviado esta semana');
          return;
        }
      }

      // Obtener estadísticas
      const stats = await storage.getProductStats();
      const lowStockProducts = await storage.getLowStockProducts(config.defaultThreshold ?? undefined);

      // Preparar datos para el email
      const emailProducts = (lowStockProducts || []).map(p => ({
        sku: p.sku,
        modelo: p.modelo || '',
        descripcion: p.descripcion || '',
        stockCantidad: p.stockCantidad ?? 0,
        lowStockThreshold: p.lowStockThreshold ?? config.defaultThreshold,
      }));

      const emailStats = {
        totalProductos: stats.totalProductos,
        sinStock: stats.sinStock,
        stockBajo: lowStockProducts?.length || 0,
      };

      // Enviar resumen por email
      const emailSent = await sendDigestEmail(
        emailProducts,
        config.recipients,
        config.fromEmail || 'noreply@inventario.com',
        frequency,
        emailStats
      );

      if (emailSent) {
        console.log(`✅ Resumen ${frequency === 'daily' ? 'diario' : 'semanal'} enviado exitosamente`);
        
        // Actualizar timestamp del último envío
        if (frequency === 'daily') {
          await storage.updateAlertConfig({ lastDailyDigestAt: new Date() });
        } else {
          await storage.updateAlertConfig({ lastWeeklyDigestAt: new Date() });
        }

        // Guardar registro de la notificación
        await storage.createAlertNotification({
          type: 'digest',
          recipients: config.recipients,
          subject: `Resumen ${frequency === 'daily' ? 'Diario' : 'Semanal'} de Inventario`,
          body: `Resumen con ${emailStats.stockBajo} productos con stock bajo`,
          status: 'sent',
        });
      } else {
        console.error(`❌ Error al enviar resumen ${frequency === 'daily' ? 'diario' : 'semanal'}`);
        
        // Guardar registro del error
        await storage.createAlertNotification({
          type: 'digest',
          recipients: config.recipients,
          subject: `Resumen ${frequency === 'daily' ? 'Diario' : 'Semanal'} de Inventario`,
          body: `Resumen con ${emailStats.stockBajo} productos con stock bajo`,
          status: 'error',
          error: 'Error al enviar email',
        });
      }
    } catch (error) {
      console.error(`❌ Error en sendDigest ${frequency}:`, error);
    }
  }

  // Reprogramar tareas según nueva configuración
  async reconfigure(): Promise<void> {
    console.log('🔄 Reconfigurando motor de alertas...');
    
    // Detener tareas actuales
    this.stop();
    
    // Reinicializar con nueva configuración
    await this.initialize();
  }
}

// Crear instancia singleton del motor
export const alertEngine = new AlertEngine();

// Función helper para verificación manual
export async function manualStockCheck(forceNotification = false): Promise<void> {
  await alertEngine.checkLowStock(forceNotification);
}

// Función helper para envío manual de resumen
export async function manualDigest(frequency: 'daily' | 'weekly'): Promise<void> {
  await alertEngine.sendDigest(frequency);
}
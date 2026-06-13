import { z } from 'zod';

/**
 * Configuración del proveedor Arenti Pet Camera 2K.
 *
 * - `rtspUrl`: URL RTSP local de la cámara (activable desde la app Arenti).
 *   Se usa para el vídeo en directo y la extracción de frames.
 * - `cloud`: credenciales de la API cloud (Arenti usa la plataforma Tuya),
 *   necesarias para acciones remotas como dispensar premios.
 */
export const arentiConfigSchema = z.object({
  name: z.string().default('Arenti Pet Camera 2K'),
  rtspUrl: z.string().optional(),
  cloud: z
    .object({
      baseUrl: z.string().url(),
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      deviceId: z.string().min(1),
    })
    .optional(),
  /** Frames por segundo a extraer del stream para análisis. */
  analysisFps: z.number().positive().max(10).default(1),
});

export type ArentiConfig = z.infer<typeof arentiConfigSchema>;
export type ArentiConfigInput = z.input<typeof arentiConfigSchema>;

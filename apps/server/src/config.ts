import { z } from 'zod';

/**
 * Configuración del servidor leída del entorno. El proveedor de cámara se
 * selecciona aquí: 'mock' para desarrollo, 'arenti' para la cámara real.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CAMERA_PROVIDER: z.enum(['mock', 'arenti']).default('mock'),
  ARENTI_RTSP_URL: z.string().optional(),
  ARENTI_CLOUD_BASE_URL: z.string().optional(),
  ARENTI_CLOUD_CLIENT_ID: z.string().optional(),
  ARENTI_CLOUD_CLIENT_SECRET: z.string().optional(),
  ARENTI_DEVICE_ID: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}

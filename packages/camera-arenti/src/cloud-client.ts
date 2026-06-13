import type { ArentiConfig } from './config.js';

/**
 * Cliente de la API cloud de Arenti/Tuya para acciones remotas.
 * Abstraído como interfaz para poder sustituirlo en tests o cuando se
 * complete la integración real.
 */
export interface ArentiCloudClient {
  dispenseTreat(portions: number): Promise<void>;
}

export class ArentiCloudNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArentiCloudNotConfiguredError';
  }
}

/**
 * Implementación pendiente de la integración real con la API de Tuya
 * (plataforma sobre la que funcionan las cámaras Arenti).
 *
 * Pasos para completarla:
 * 1. Crear un proyecto en https://iot.tuya.com y vincular la cuenta Arenti
 *    ("Link Tuya App Account") para obtener clientId/clientSecret/deviceId.
 * 2. Implementar la firma HMAC-SHA256 de las peticiones (esquema de firma
 *    estándar de la API de Tuya) y la obtención/refresco del token.
 * 3. Enviar el comando del dispensador (DP del dispensador de premios del
 *    dispositivo, p. ej. `feed_num`) vía POST /v1.0/devices/{id}/commands.
 */
export class TuyaArentiCloudClient implements ArentiCloudClient {
  constructor(private readonly config: NonNullable<ArentiConfig['cloud']>) {}

  async dispenseTreat(_portions: number): Promise<void> {
    throw new ArentiCloudNotConfiguredError(
      `La integración con la API cloud de Arenti/Tuya aún no está implementada ` +
        `(dispositivo ${this.config.deviceId}). Consulta packages/camera-arenti/README.md.`,
    );
  }
}

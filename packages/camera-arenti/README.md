# @mind-pet/camera-arenti

Proveedor de cámara para la **Arenti Pet Camera 2K** con dispensador de premios.
Implementa el puerto `CameraProvider` de `@mind-pet/core`.

## Estado de la integración

| Capacidad | Estado | Notas |
| --- | --- | --- |
| Vídeo (frames para análisis) | ⚠️ Experimental | Vía RTSP + ffmpeg (`FfmpegRtspFrameSource`). Requiere ffmpeg instalado y RTSP activado en la app Arenti. |
| Stream en directo | ✅ | Devuelve la URL RTSP; reproducirla en navegador requiere una pasarela (p. ej. go2rtc o MediaMTX). |
| Audio | ❌ Pendiente | Añadir extracción de audio del stream RTSP. |
| Dispensador de premios | ❌ Pendiente | Requiere completar `TuyaArentiCloudClient` (ver abajo). |

## Configuración

```ts
import { ArentiCameraProvider } from '@mind-pet/camera-arenti';

const camera = new ArentiCameraProvider({
  rtspUrl: 'rtsp://usuario:contraseña@192.168.1.50:554/stream1',
  cloud: {
    baseUrl: 'https://openapi.tuyaeu.com',
    clientId: '...',
    clientSecret: '...',
    deviceId: '...',
  },
});
```

## Completar la integración cloud (dispensador)

Arenti funciona sobre la plataforma Tuya. Para habilitar el dispensador:

1. Crea un proyecto cloud en [iot.tuya.com](https://iot.tuya.com) y vincula tu
   cuenta de la app Arenti ("Link Tuya App Account") para obtener
   `clientId`, `clientSecret` y el `deviceId` de la cámara.
2. Implementa en `TuyaArentiCloudClient` la firma HMAC-SHA256 de las
   peticiones y la gestión del token según la documentación de la API de Tuya.
3. Envía el comando del dispensador (`feed_num` o el DP equivalente del
   dispositivo) mediante `POST /v1.0/devices/{deviceId}/commands`.

Mientras tanto, usa `@mind-pet/camera-mock` para desarrollar el resto del
sistema sin hardware.

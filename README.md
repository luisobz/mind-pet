# 🐾 Mind Pet

Plataforma inteligente que convierte una cámara para mascotas en un asistente
autónomo para el bienestar, monitorización y entrenamiento del perro: interpreta
su comportamiento (imagen + sonido) con modelos de IA y ejecuta automatizaciones
configurables que refuerzan hábitos positivos usando el dispensador de premios.

Monorepo con **Turborepo + pnpm workspaces** y arquitectura limpia: la lógica de
negocio está desacoplada del hardware mediante puertos, de modo que la
**Arenti Pet Camera 2K** es solo el primer proveedor — añadir otro fabricante no
toca el resto del sistema.

## Estructura

```
apps/
  server/            API REST + WebSocket (Fastify). Raíz de composición:
                     aquí se elige cámara, analizadores y persistencia.
  web/               Dashboard (Vite + React): cámara en directo, estado del
                     perro, histórico de eventos y editor de automatizaciones.

packages/
  core/              Dominio puro + casos de uso (sin dependencias de hardware):
                     - domain/: posturas, estados de ánimo, eventos, reglas (zod)
                     - ports/: CameraProvider, VisionAnalyzer, AudioAnalyzer,
                       EventStore, RuleRepository, Clock, Logger
                     - application/: DogStateTracker (suavizado temporal),
                       AutomationEngine (cooldown, límite diario),
                       MonitoringService (orquesta el pipeline)
  camera-arenti/     Proveedor Arenti Pet Camera 2K (RTSP + cloud Tuya).
  camera-mock/       Proveedor simulado: genera comportamiento de perro
                     realista para desarrollar sin hardware.
  perception/        Analizadores de IA (visión/audio). Incluye simulados;
                     documenta cómo enchufar modelos reales (ONNX, YAMNet…).
  eslint-config/     Configuración ESLint compartida.
  typescript-config/ Configuraciones tsconfig compartidas.
```

### Flujo de datos

```
CameraProvider ──frames/audio──▶ VisionAnalyzer / AudioAnalyzer
                                       │ observaciones
                                       ▼
                              DogStateTracker (suavizado)
                                       │ DogActivitySnapshot + eventos
                                       ▼
                              AutomationEngine ──▶ TreatDispenser (premios)
                                       │
                                       ▼
                         EventStore + WebSocket ──▶ Dashboard web
```

## Empezar

Requisitos gestionados con [mise](https://mise.jdx.dev) (`mise install`):
Node 22 y pnpm 10.

```bash
pnpm install
pnpm build        # compila todos los paquetes (turbo)
pnpm test         # tests del dominio (vitest)
pnpm dev          # levanta server (:3000) y web (:5173) en paralelo
```

Abre http://localhost:5173 — con el proveedor simulado verás al perro cambiar
de postura, ladrar, y las reglas de ejemplo dispensar premios.

## Configuración (variables de entorno del server)

| Variable | Valores | Descripción |
| --- | --- | --- |
| `CAMERA_PROVIDER` | `mock` (defecto), `arenti` | Proveedor de cámara activo. |
| `ARENTI_RTSP_URL` | `rtsp://…` | Stream RTSP local de la cámara. |
| `ARENTI_CLOUD_BASE_URL` | URL | API cloud de Arenti/Tuya. |
| `ARENTI_CLOUD_CLIENT_ID` / `ARENTI_CLOUD_CLIENT_SECRET` | — | Credenciales del proyecto Tuya. |
| `ARENTI_DEVICE_ID` | — | ID del dispositivo (dispensador). |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Dirección del servidor. |

Estado de la integración Arenti: ver `packages/camera-arenti/README.md`
(vídeo RTSP experimental; dispensador pendiente de completar la firma de la
API de Tuya). Mientras tanto, `mock` permite desarrollar todo el sistema.

## Automatizaciones

Una regla = condiciones (AND) + acciones + límites:

- **Condiciones**: postura mantenida X tiempo, estado de ánimo mantenido,
  silencio tras ladrar, presencia/ausencia, frecuencia (cada N minutos),
  franja horaria.
- **Acciones**: dispensar premio (1–5 porciones), registrar evento.
- **Límites**: cooldown entre disparos y máximo de disparos por día.

Ejemplos ya sembrados en modo demo: "premio tras 5 min tumbado y tranquilo" y
"premio tras 2 min de silencio después de ladrar".

## Extender el sistema

- **Nueva cámara**: crea `packages/camera-<marca>` implementando el puerto
  `CameraProvider` de `@mind-pet/core` y regístrala en
  `apps/server/src/container.ts`. Nada más cambia.
- **Modelos de IA reales**: implementa `VisionAnalyzer` / `AudioAnalyzer`
  (ver `packages/perception/README.md`).
- **Persistencia real**: implementa `EventStore` y `RuleRepository`
  (los adaptadores en memoria actuales son intercambiables).

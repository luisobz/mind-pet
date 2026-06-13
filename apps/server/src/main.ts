import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createContainer } from './container.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const container = await createContainer(config);
  const app = await buildApp(container);

  await app.listen({ port: config.PORT, host: config.HOST });
  await container.service.start();

  container.logger.info('Server listening', {
    port: config.PORT,
    camera: config.CAMERA_PROVIDER,
  });

  const shutdown = async (): Promise<void> => {
    container.logger.info('Shutting down');
    await container.service.stop();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error: unknown) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { initSentry } from "./sentry";

async function bootstrap() {
  await initSentry();
  const app = await NestFactory.create(AppModule);
  const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  app.enableCors({ origin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`AI-Growth-OS API listening on http://localhost:${port}`);
}

bootstrap();

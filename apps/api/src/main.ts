import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { resolveCorsOrigins } from "./cors-origins";
import { initSentry } from "./sentry";

async function bootstrap() {
  await initSentry();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configured = resolveCorsOrigins(process.env.CORS_ORIGIN);
  const allowLanInDev = process.env.NODE_ENV !== "production";
  const isPrivateLan = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(
      origin,
    );

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (configured.includes(requestOrigin) || (allowLanInDev && isPrivateLan(requestOrigin))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // PORT is set by Railway/Fly/Render; API_PORT kept for local .env
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`AI-Growth-OS API listening on http://localhost:${port}`);
}

bootstrap();

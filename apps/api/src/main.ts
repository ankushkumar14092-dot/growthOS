import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { initSentry } from "./sentry";

async function bootstrap() {
  await initSentry();
  const app = await NestFactory.create(AppModule);
  const rawOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  const origin = rawOrigin.includes(",")
    ? rawOrigin.split(",").map((o) => o.trim()).filter(Boolean)
    : rawOrigin;
  app.enableCors({ origin, credentials: true });
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

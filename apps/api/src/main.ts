import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "./common/zod.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: "http://localhost:3000", credentials: true });
  app.use(cookieParser(process.env.COOKIE_SECRET ?? "dev-cookie-secret"));
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ZodValidationPipe());

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`TaskForge API listening on http://localhost:${port}/api`);
}

bootstrap();

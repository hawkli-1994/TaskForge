import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "./common/zod.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: "http://localhost:3000" });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ZodValidationPipe());

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`TaskForge API listening on http://localhost:${port}/api`);
}

bootstrap();

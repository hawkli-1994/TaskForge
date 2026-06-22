import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma.module";
import { DevAuthGuard } from "./auth.guard";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DevAuthGuard],
  exports: [DevAuthGuard],
})
export class AuthModule {}

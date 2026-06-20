import { Global, Module } from "@nestjs/common";
import { DevAuthGuard } from "./auth.guard";

@Global()
@Module({
  providers: [DevAuthGuard],
  exports: [DevAuthGuard],
})
export class AuthModule {}

import { Module, Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./common/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { DevAuthGuard } from "./auth/auth.guard";
import { ProjectsModule } from "./projects/projects.module";
import { WorkItemsModule } from "./workitems/workitems.module";
import { SessionsModule } from "./sessions/sessions.module";
import { RunnerModule } from "./runner/runner.module";
import { ArtifactsModule } from "./artifacts/artifacts.module";
import { AuditModule } from "./audit/audit.module";
import { OutboxModule } from "./outbox/outbox.module";
import { RepositoriesModule } from "./repositories/repositories.module";

const globalGuard: Provider = {
  provide: APP_GUARD,
  useClass: DevAuthGuard,
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
      },
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    OutboxModule,
    ProjectsModule,
    WorkItemsModule,
    SessionsModule,
    RunnerModule,
    ArtifactsModule,
    RepositoriesModule,
  ],
  providers: [globalGuard],
})
export class AppModule {}

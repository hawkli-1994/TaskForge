import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RedisModule } from "../common/redis.module";
import { OutboxService } from "./outbox.service";

const bullEnabled = process.env.TASKFORGE_DISABLE_BULLMQ !== "true";

@Module({
  imports: [
    RedisModule,
    ...(bullEnabled
      ? [
          BullModule.registerQueue({ name: "outbox" }),
          BullModule.registerQueue({ name: "runner.dispatch" }),
          BullModule.registerQueue({ name: "pi.pr" }),
        ]
      : []),
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}

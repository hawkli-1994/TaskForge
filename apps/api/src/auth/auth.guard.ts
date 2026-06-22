import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers["x-taskforge-user-id"];
    if (!userId || typeof userId !== "string") {
      throw new UnauthorizedException("Missing x-taskforge-user-id header");
    }

    const email =
      typeof request.headers["x-taskforge-user-email"] === "string"
        ? request.headers["x-taskforge-user-email"]
        : `${userId}@taskforge.local`;
    const name =
      typeof request.headers["x-taskforge-user-name"] === "string"
        ? request.headers["x-taskforge-user-name"]
        : userId;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    request.user = { id: userId, email, name };
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers["x-taskforge-user-id"];
    if (!userId || typeof userId !== "string") {
      throw new UnauthorizedException("Missing x-taskforge-user-id header");
    }

    const role = request.headers["x-taskforge-project-role"] || "contributor";
    request.user = { id: userId, role: String(role) };
    return true;
  }
}

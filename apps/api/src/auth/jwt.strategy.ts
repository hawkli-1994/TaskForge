import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt, StrategyOptionsWithoutRequest } from "passport-jwt";
import { Request } from "express";
import { AuthService, AuthTokenPayload } from "./auth.service";

const ACCESS_TOKEN_COOKIE = "taskforge_access_token";

function extractFromCookie(req: Request): string | null {
  return req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

function extractFromAuthHeader(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly auth: AuthService) {
    const options: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => extractFromCookie(req as Request) ?? extractFromAuthHeader(req as Request) ?? "",
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-jwt-secret-change-me",
    };
    super(options);
  }

  async validate(payload: AuthTokenPayload) {
    const user = await this.auth.validatePayload(payload);
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  }
}

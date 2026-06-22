import { Body, Controller, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { RegisterInput, LoginInput } from "@taskforge/contracts";
import { ZodBody } from "../common/zod.pipe";
import { AuthService } from "./auth.service";

const ACCESS_TOKEN_COOKIE = "taskforge_access_token";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @ZodBody(RegisterInput) input: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(input);
    this.setTokenCookie(res, result.token);
    return { user: result.user };
  }

  @Post("login")
  async login(
    @ZodBody(LoginInput) input: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(input);
    this.setTokenCookie(res, result.token);
    return { user: result.user };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    return { ok: true };
  }

  private setTokenCookie(res: Response, token: string) {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ONE_WEEK_MS,
      path: "/",
    });
  }
}

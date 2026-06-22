import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../common/prisma.service";
import { RegisterInput, LoginInput } from "@taskforge/contracts";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new BadRequestException("Email already registered");
    }

    const passwordHash = await hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = this.signToken(user);
    return { user, token };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const token = this.signToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async validatePayload(payload: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    return user ?? null;
  }

  private signToken(user: { id: string; email: string; name: string }) {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return this.jwt.sign(payload);
  }
}

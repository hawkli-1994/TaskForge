import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserInput } from "@taskforge/contracts";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private safeSelect = {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async ensureUser(id: string, defaults: { email: string; name: string }) {
    return this.prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, ...defaults },
      select: this.safeSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: { email: input.email, name: input.name },
      select: this.safeSelect,
    });
  }
}

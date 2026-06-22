import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserInput } from "@taskforge/contracts";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUser(id: string, defaults: { email: string; name: string }) {
    return this.prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, ...defaults },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: { email: input.email, name: input.name },
    });
  }
}

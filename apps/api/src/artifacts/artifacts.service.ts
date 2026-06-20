import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      include: { session: true },
    });
    if (!artifact) {
      throw new NotFoundException("Artifact not found");
    }
    return artifact;
  }
}

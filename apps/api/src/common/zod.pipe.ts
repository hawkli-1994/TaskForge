import { BadRequestException, Body, Injectable, PipeTransform } from "@nestjs/common";
import { ZodType } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType) {}

  transform(value: unknown) {
    if (!this.schema) {
      return value;
    }
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}

export const ZodBody = (schema: ZodType) => {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    Body(new ZodValidationPipe(schema))(target, propertyKey, parameterIndex);
  };
};

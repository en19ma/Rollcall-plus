import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({ where: { deletedAt: null } });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  create(data: { name: string; code: string }) {
    return this.prisma.department.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; code: string }>) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

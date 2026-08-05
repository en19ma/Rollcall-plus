import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private service: CoursesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('lecturerId') lecturerId?: string,
  ) {
    return this.service.findAll({ search, departmentId, lecturerId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/students')
  @Roles(Role.ADMIN, Role.LECTURER)
  getEnrolledStudents(@Param('id') id: string) {
    return this.service.getEnrolledStudents(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: any, @Body() dto: CreateCourseDto) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Patch(':id/assign-lecturer')
  @Roles(Role.ADMIN)
  assignLecturer(@CurrentUser() user: any, @Param('id') id: string, @Body('lecturerId') lecturerId: string) {
    return this.service.assignLecturer(id, lecturerId, user.id);
  }
}

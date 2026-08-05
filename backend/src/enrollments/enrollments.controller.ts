import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private service: EnrollmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: any, @Body() dto: CreateEnrollmentDto) {
    return this.service.create(dto, user.id);
  }

  @Post('self')
  @Roles(Role.STUDENT)
  selfEnroll(@CurrentUser() user: any, @Body('courseId') courseId: string) {
    return this.service.selfEnroll(user.id, courseId);
  }

  @Delete('self/:courseId')
  @Roles(Role.STUDENT)
  selfDrop(@CurrentUser() user: any, @Param('courseId') courseId: string) {
    return this.service.selfDrop(user.id, courseId);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  bulkCreate(@CurrentUser() user: any, @Body() body: { courseId: string; studentIds: string[] }) {
    return this.service.bulkCreate(body.courseId, body.studentIds, user.id);
  }

  @Get('student/:studentId')
  findForStudent(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.findForStudent(studentId, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user.id);
  }
}

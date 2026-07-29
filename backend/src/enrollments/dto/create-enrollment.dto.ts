import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'studentId should not be empty — select a student' })
  studentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'courseId should not be empty — select a course' })
  courseId: string;
}

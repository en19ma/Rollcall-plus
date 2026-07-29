import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  semester: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  creditHours: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'departmentId should not be empty — select a department' })
  departmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lecturerId?: string;
}

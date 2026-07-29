import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ description: 'Required for students and lecturers' })
  @ValidateIf((o) => o.role === Role.STUDENT || o.role === Role.LECTURER)
  @IsString()
  @IsNotEmpty({ message: 'Please select a department' })
  departmentId: string;

  @ApiProperty({ required: false, description: 'Required for students — their student ID number' })
  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({ message: 'Please enter your student ID' })
  studentCode?: string;

  @ApiProperty({ required: false, description: 'Required for students' })
  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({ message: 'Please enter your programme' })
  programme?: string;

  @ApiProperty({ required: false, description: 'Required for students' })
  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty({ message: 'Please select your level' })
  level?: string;

  @ApiProperty({ required: false, description: 'Required for lecturers — their staff ID number' })
  @ValidateIf((o) => o.role === Role.LECTURER)
  @IsString()
  @IsNotEmpty({ message: 'Please enter your staff ID' })
  staffCode?: string;
}

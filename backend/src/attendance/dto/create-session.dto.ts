import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'How long the QR/session stays open, in minutes' })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ description: "Lecturer's current latitude — required so students must be nearby to check in" })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: "Lecturer's current longitude — required so students must be nearby to check in" })
  @IsNumber()
  longitude: number;
}

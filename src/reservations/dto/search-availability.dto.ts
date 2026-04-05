import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SearchAvailabilityDto {
  @ApiProperty({ example: '2026-04-10', description: 'ISO date (YYYY-MM-DD), check-in night.' })
  @IsDateString()
  checkInDate!: string;

  @ApiProperty({ example: '2026-04-14', description: 'ISO date (YYYY-MM-DD), must be after check-in.' })
  @IsDateString()
  checkOutDate!: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 5, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  roomsRequested?: number = 1;
}

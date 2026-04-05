import { ApiProperty } from '@nestjs/swagger';

export class AvailabilitySearchMetaDto {
  @ApiProperty({ example: '2026-04-01' })
  checkInDate!: string;

  @ApiProperty({ example: '2026-04-03' })
  checkOutDate!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 5 })
  roomsRequested!: number;

  @ApiProperty({ example: 2, description: 'How many room types have enough free rooms.' })
  totalRoomTypesMatched!: number;

  @ApiProperty({
    required: false,
    example: 'No room type has enough simultaneous free rooms — try requesting fewer rooms or different dates.',
    description: 'Present when the roomTypes array is empty.',
  })
  hint?: string;
}

export class AvailabilitySearchResponseDto {
  @ApiProperty({
    type: 'array',
    description: 'Room types that can satisfy roomsRequested for the date range (includes availableCount).',
  })
  roomTypes!: Record<string, unknown>[];

  @ApiProperty({ type: AvailabilitySearchMetaDto })
  meta!: AvailabilitySearchMetaDto;
}

import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  amenities!: string[];
}

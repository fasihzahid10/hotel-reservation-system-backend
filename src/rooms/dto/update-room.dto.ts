import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AppRoomStatus } from '../../common/enums';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  roomNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  floor?: number;

  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @IsOptional()
  @IsEnum(AppRoomStatus)
  housekeepingStatus?: AppRoomStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;
}

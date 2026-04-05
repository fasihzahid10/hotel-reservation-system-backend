import { IsEnum, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { AppRoomStatus } from '../../common/enums';

export class CreateRoomDto {
  @IsString()
  @MaxLength(10)
  roomNumber!: string;

  @IsInt()
  @Min(1)
  floor!: number;

  @IsString()
  roomTypeId!: string;

  @IsEnum(AppRoomStatus)
  housekeepingStatus!: AppRoomStatus;
}

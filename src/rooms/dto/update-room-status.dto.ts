import { IsEnum } from 'class-validator';
import { AppRoomStatus } from '../../common/enums';

export class UpdateRoomStatusDto {
  @IsEnum(AppRoomStatus)
  housekeepingStatus!: AppRoomStatus;
}

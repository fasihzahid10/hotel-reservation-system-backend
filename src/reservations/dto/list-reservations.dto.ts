import { IsEnum, IsOptional } from 'class-validator';
import { AppReservationStatus } from '../../common/enums';

export class ListReservationsDto {
  @IsOptional()
  @IsEnum(AppReservationStatus)
  status?: AppReservationStatus;
}

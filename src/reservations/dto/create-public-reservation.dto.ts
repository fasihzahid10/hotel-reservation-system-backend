import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AppPaymentMethod } from '../../common/enums';

export class CreatePublicReservationDto {
  @IsDateString()
  checkInDate!: string;

  @IsDateString()
  checkOutDate!: string;

  @IsString()
  roomTypeId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  roomsRequested!: number;

  @IsString()
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  idNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  adults!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  children?: number = 0;

  /**
   * For **POST /reservations/public**: when PayTabs is configured, this must be **true** (payment required).
   * For **POST /reservations** (staff): may be omitted; reservations are confirmed without PayTabs.
   */
  @IsOptional()
  @IsBoolean()
  withPayment?: boolean;

  /**
   * Staff bookings (POST /reservations): how the guest paid or will pay.
   * Ignored for public flow when PayTabs handles payment.
   */
  @IsOptional()
  @IsEnum(AppPaymentMethod)
  paymentMethod?: AppPaymentMethod;
}

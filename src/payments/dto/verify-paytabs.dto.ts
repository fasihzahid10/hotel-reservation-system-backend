import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyPaytabsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tranRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cartId?: string;
}

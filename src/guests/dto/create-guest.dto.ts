import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGuestDto {
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
}

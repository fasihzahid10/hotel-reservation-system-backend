import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@hotel.local', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin@123', minLength: 8, format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

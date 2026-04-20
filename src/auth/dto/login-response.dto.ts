import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '../../common/enums';

export class LoginResponseDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  sub!: string;

  @ApiProperty({ example: 'admin@hotel.local' })
  email!: string;

  @ApiProperty({ example: 'System Administrator' })
  fullName!: string;

  @ApiProperty({ enum: AppRole, example: AppRole.SUPER_ADMIN })
  role!: AppRole;

  @ApiProperty({
    description: 'JWT for Authorization: Bearer or Swagger cookie auth value (same value as httpOnly cookie).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}

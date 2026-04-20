import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoomPhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;
}

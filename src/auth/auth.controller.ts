import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Sets an httpOnly auth cookie and returns the same JWT in `accessToken` for tools like Swagger (Authorize → Bearer auth, or cookie auth with this value).',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(loginDto.email, loginDto.password);
    const cookieName = this.configService.get<string>('COOKIE_NAME') ?? 'hrs_access_token';

    response.cookie(cookieName, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('COOKIE_SECURE') === true,
      maxAge: 1000 * 60 * 60 * 12,
      path: '/',
    });

    return { ...result.user, accessToken: result.accessToken };
  }

  @Post('logout')
  @ApiSessionAuth()
  @ApiOperation({ summary: 'Sign out', description: 'Clears the auth cookie.' })
  @ApiResponse({ status: 200, description: 'Logged out.' })
  async logout(@Res({ passthrough: true }) response: Response) {
    const cookieName = this.configService.get<string>('COOKIE_NAME') ?? 'hrs_access_token';

    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('me')
  @ApiSessionAuth()
  @ApiOperation({ summary: 'Current user', description: 'JWT payload for the active session (cookie or Bearer).' })
  @ApiOkResponse({ description: 'Current user (sub, email, fullName, role, iat, exp).' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

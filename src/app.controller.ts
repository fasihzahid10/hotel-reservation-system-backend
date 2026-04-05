import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  root() {
    return {
      service: 'Hotel Reservation API',
      docs: '/api/docs',
    };
  }
}

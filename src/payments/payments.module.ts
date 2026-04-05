import { Module } from '@nestjs/common';
import { PaytabsService } from './paytabs.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaytabsService, PaymentsService],
  exports: [PaytabsService, PaymentsService],
})
export class PaymentsModule {}

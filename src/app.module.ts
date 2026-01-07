import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StratumModule } from './stratum/stratum.module';
import { JobModule } from './job/job.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    StratumModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

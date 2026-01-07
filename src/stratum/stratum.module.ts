import { Module } from '@nestjs/common';
import { TcpServer } from './tcp.server';
import { StratumService } from './stratum.service';
import { PacketParser } from './packet.parser';

@Module({
  providers: [TcpServer, StratumService, PacketParser],
})
export class StratumModule {}

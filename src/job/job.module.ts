import { Module } from '@nestjs/common';
import { JobManager } from './job.manager';
import { BitcoinRpcService } from './bitcoin.rpc';

@Module({
  providers: [
    BitcoinRpcService, // 注册 RPC 服务
    JobManager, // 注册 JobManager (因为它实现了 OnModuleInit，Nest 会自动执行它)
  ],
  exports: [JobManager], // 如果其他模块需要直接调用它，可以导出
})
export class JobModule {}

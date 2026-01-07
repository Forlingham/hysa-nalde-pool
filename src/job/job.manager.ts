// src/job/job.manager.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BitcoinRpcService } from './bitcoin.rpc';
import * as zmq from 'zeromq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobGenerator } from './job.generator';

@Injectable()
export class JobManager implements OnModuleInit {
  private readonly logger = new Logger(JobManager.name);
  private sock: zmq.Subscriber;

  // 内存中缓存当前的 Job，避免重复下发
  private currentJob: any = null;

  constructor(
    private jobGenerator: JobGenerator,
    private configService: ConfigService,
    private rpcService: BitcoinRpcService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.initZmq();
    // 启动时立即获取一次任务，不要干等下一个区块
    await this.updateJob();
  }

  // 初始化 ZMQ 监听
  private async initZmq() {
    const zmqUrl = this.configService.get<string>('BITCOIN_ZMQ_URL')!;
    this.sock = new zmq.Subscriber();

    this.sock.connect(zmqUrl);
    this.sock.subscribe('hashblock'); // 订阅区块哈希事件
    this.logger.log(`🔌 ZMQ Connected to ${zmqUrl}, waiting for blocks...`);

    // 异步循环监听消息
    this.runZmqLoop();
  }

  private async runZmqLoop() {
    for await (const [topic, msg] of this.sock) {
      const topicStr = topic.toString();
      if (topicStr === 'hashblock') {
        const hash = msg.toString('hex');
        this.logger.warn(`🚨 New Block Detected on Network! Hash: ${hash}`);
        // 🔥 核心逻辑：发现新区块，立即更新任务！
        await this.updateJob();
      }
    }
  }

  // 更新任务逻辑
  private async updateJob() {
    try {
      const start = Date.now();
      // 1. 调用 RPC 获取模板
      const template: any = await this.rpcService.getBlockTemplate();

      // 2. 简单的去重：如果 previousblockhash 没变，说明还是同一个高度
      if (
        this.currentJob &&
        this.currentJob.previousblockhash === template.previousblockhash
      ) {
        return; // 任务没变，忽略
      }

      this.currentJob = template;

      // 3. 处理模板 (简化版)
      // 在这里你需要把 template 转换成 Stratum 协议需要的格式
      // 下一步我们会详细写这里：构建 Merkle Tree 和 Coinbase
      const stratumJob = this.processTemplateToJob(template);

      // 4. 广播事件：告诉 TCP Server 有新活儿了
      this.eventEmitter.emit('job.new', stratumJob);

      this.logger.log(
        `✅ Job Updated! Height: ${template.height}, TxCount: ${template.transactions.length}, Time: ${Date.now() - start}ms`,
      );
    } catch (error) {
      this.logger.error('Failed to update job', error);
    }
  }

  // 临时占位：把 RPC 数据简单包装一下
  private processTemplateToJob(template: any) {
    return this.jobGenerator.process(template, '');
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import { PacketParser } from './packet.parser';
import { StratumService } from './stratum.service';

@Injectable()
export class TcpServer implements OnModuleInit {
  private readonly logger = new Logger(TcpServer.name);

  constructor(
    private readonly parser: PacketParser,
    private readonly stratum: StratumService,
  ) {}

  onModuleInit() {
    const server = net.createServer((socket) => {
      // 每个连接维护一个 buffer 字符串（解决粘包）
      let buffer = '';
      this.stratum.addSocket(socket);
      
      console.log(
        `🔌 新矿工连接: ${socket.remoteAddress}:${socket.remotePort}`,
      );

      socket.on('data', (chunk) => {
        buffer += chunk.toString();

        // 调用 Parser 解析
        // 注意：这里的 Parser 实现比较简略，真实项目建议每个 Socket 一个 Parser 实例
        if (buffer.indexOf('\n') !== -1) {
          const payloads = this.parser.parse(buffer);

          // 清空已处理的 buffer (简化版逻辑，实际上要保留剩余部分)
          const lastIndex = buffer.lastIndexOf('\n');
          buffer = buffer.substring(lastIndex + 1);

          // 逐条处理业务
          payloads.forEach((payload) => {
            this.stratum.handleMessage(socket, payload);
          });
        }
      });

      socket.on('error', (err) => console.log('Socket Error:', err.message));
      socket.on('close', () => console.log('矿工断开连接'));
    });

    server.listen(3333, () => {
      this.logger.log('⛏️  Stratum 矿池核心已启动，监听端口 3333');
    });
  }
}

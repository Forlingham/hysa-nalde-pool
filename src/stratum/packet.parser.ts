import { Injectable } from '@nestjs/common';

@Injectable()
export class PacketParser {
  // 处理 TCP 粘包/拆包逻辑
  // 输入：Socket 收到的 Buffer
  // 输出：完整的 JSON 对象数组
  
  parse(buffer: string): any[] {
    const payloads: any[] = [];
    let safeBuffer = buffer;

    // Stratum 协议约定：每条消息以换行符 \n 结尾
    while (safeBuffer.indexOf('\n') !== -1) {
      const boundary = safeBuffer.indexOf('\n');
      const rawMessage = safeBuffer.substring(0, boundary).trim();

      if (rawMessage.length > 0) {
        try {
          const json = JSON.parse(rawMessage);
          payloads.push(json);
        } catch (e) {
          console.error('❌ JSON 解析失败 (可能是脏数据):', rawMessage);
        }
      }

      // 移动指针，处理下一条
      safeBuffer = safeBuffer.substring(boundary + 1);
    }

    // 注意：真实场景中，如果最后剩余的 safeBuffer 不为空，
    // 需要返回它作为剩余 buffer 留给下一次拼接（这里为了演示简化了）
    return payloads;
  }
}
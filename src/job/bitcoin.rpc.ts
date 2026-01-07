import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class BitcoinRpcService {
  private readonly logger = new Logger(BitcoinRpcService.name);
  private client: AxiosInstance;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('BITCOIN_RPC_URL');
    const user = this.configService.get<string>('BITCOIN_RPC_USER');
    const pass = this.configService.get<string>('BITCOIN_RPC_PASS');

    this.client = axios.create({
      baseURL: url,
      auth: { username: user!, password: pass! },
      timeout: this.configService.get<number>('BITCOIN_RPC_TIMEOUT'),
    });
  }

  // 通用 RPC 调用方法
  async call<T>(method: string, params: any[] = []): Promise<T> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '1.0',
        id: 'scash-pool',
        method: method,
        params: params,
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${JSON.stringify(response.data.error)}`);
      }
      return response.data.result;
    } catch (error) {
      this.logger.error(`RPC Call Failed [${method}]: ${error.message}`);
      throw error;
    }
  }

  // 获取区块模板 (核心方法)
  async getBlockTemplate() {
    // capabilities 告诉节点我们支持哪些特性（比如隔离见证 segwit）
    return this.call('getblocktemplate', [{ rules: ['segwit'] }]);
  }
}

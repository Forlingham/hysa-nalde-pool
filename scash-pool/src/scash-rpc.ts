// Scash 节点 RPC 客户端
import { GetBlockTemplateResponse, SubmitBlockResponse } from './types.js';

export class ScashRPCClient {
  private url: string;
  private auth: string;

  constructor(rpcUser: string, rpcPassword: string, rpcPort: number, rpcHost: string = '127.0.0.1') {
    this.url = `http://${rpcHost}:${rpcPort}`;
    this.auth = btoa(`${rpcUser}:${rpcPassword}`);
  }

  /**
   * 调用 RPC 方法
   */
  private async callMethod(method: string, params: any[] = []): Promise<any> {
    try {
      const requestBody = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      });
      console.log(`RPC Request (${method}):`, requestBody);
      
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`,
        },
        body: requestBody,
      });

      const text = await response.text();
      console.log(`RPC Response (${method}):`, text);
      
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(text);
      
      if (data.error) {
        throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`RPC 调用失败 [${method}]:`, error);
      throw error;
    }
  }

  /**
   * 获取区块模板
   */
  async getBlockTemplate(): Promise<GetBlockTemplateResponse> {
    // 注意：虽然 Scash 禁用 segwit，但 RPC 仍然要求传入 segwit 规则
    return await this.callMethod('getblocktemplate', [{rules: ['segwit']}]);
  }

  /**
   * 提交区块
   */
  async submitBlock(blockHex: string): Promise<SubmitBlockResponse> {
    return await this.callMethod('submitblock', [blockHex]);
  }

  /**
   * 获取最新区块高度
   */
  async getBlockCount(): Promise<number> {
    return await this.callMethod('getblockcount');
  }

  /**
   * 获取区块信息
   */
  async getBlock(hash: string | number): Promise<any> {
    return await this.callMethod('getblock', [hash]);
  }

  /**
   * 获取网络信息
   */
  async getNetworkInfo(): Promise<any> {
    return await this.callMethod('getnetworkinfo');
  }

  /**
   * 获取挖矿信息
   */
  async getMiningInfo(): Promise<any> {
    return await this.callMethod('getmininginfo');
  }

  /**
   * 获取区块链信息
   */
  async getBlockchainInfo(): Promise<any> {
    return await this.callMethod('getblockchaininfo');
  }
}
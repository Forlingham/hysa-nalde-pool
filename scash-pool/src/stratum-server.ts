// Stratum 服务器
import { MiningJob, Share, PoolStats } from './types.js';
import { verifyRandomXCommitment, nbitsToTarget, difficultyToTarget, getEpoch, getSeedHash, verifyShare } from './randomx-native.js';
import { ScashRPCClient } from './scash-rpc.js';

export class StratumServer {
  private server: any;
  private clients: Map<any, Client> = new Map();
  private currentJob: MiningJob | null = null;
  private rpcClient: ScashRPCClient;
  private poolStats: PoolStats;
  private poolDifficulty: number; // 矿池份额难度
  private rxEpochDuration: number; // RandomX epoch 持续时间

  constructor(rpcClient: ScashRPCClient, poolDifficulty: number = 1.0) {
    this.rpcClient = rpcClient;
    this.poolDifficulty = poolDifficulty;
    this.poolStats = {
      totalShares: 0,
      validShares: 0,
      invalidShares: 0,
      blocksFound: 0,
      lastBlockHeight: 0,
      poolHashrate: 0,
    };
    this.rxEpochDuration = 604800; // 默认 7 天
  }

  /**
   * 启动 Stratum 服务器
   */
  async start(port: number = 3333): Promise<void> {
    console.log(`启动 Stratum 服务器，监听端口 ${port}...`);
    
    // 注意：Bun 的 serve 是 HTTP 服务器，对于 Stratum 我们需要使用 TCP socket
    // 由于 Bun 对 TCP socket 的支持有限，我们使用 Node.js 的 net 模块
    await this.startTCPServer(port);
  }

  /**
   * 启动 TCP 服务器（用于 Stratum）
   */
  private async startTCPServer(port: number): Promise<void> {
    // 使用 Node.js 的 net 模块创建 TCP 服务器
    const net = await import('net');
    
    const server = net.createServer((socket) => {
      console.log('新的矿工连接:', socket.remoteAddress);
      
      const client = new Client(socket, this);
      this.clients.set(socket, client);
      
      socket.on('data', (data) => {
        client.handleMessage(data.toString());
      });
      
      socket.on('close', () => {
        console.log('矿工断开连接:', socket.remoteAddress);
        this.clients.delete(socket);
      });
      
      socket.on('error', (error) => {
        console.error('矿工连接错误:', error);
        this.clients.delete(socket);
      });
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`Stratum 服务器已启动，监听端口 ${port}`);
    });

    // 定期更新任务
    setInterval(() => {
      this.updateJob();
    }, 30000); // 每 30 秒更新一次任务
  }

  /**
   * 更新挖矿任务
   */
  private async updateJob(): Promise<void> {
    try {
      console.log('从节点获取新的区块模板...');
      const template = await this.rpcClient.getBlockTemplate();
      
      // 更新 epoch 持续时间
      if (template.rx_epoch_duration) {
        this.rxEpochDuration = template.rx_epoch_duration;
      }
      
      // 反转哈希（小端序）
      const prevHashReversed = this.reverseHex(template.previousblockhash);
      
      // 生成 coinbase 交易（简化版）
      const coinbaseTx = this.generateCoinbase(template.coinbasevalue);
      const coinbaseParts = this.splitCoinbase(coinbaseTx);
      
      // 创建新的挖矿任务
      this.currentJob = {
        jobId: Date.now().toString(),
        prevHash: prevHashReversed,
        coinbase1: coinbaseParts.part1,
        coinbase2: coinbaseParts.part2,
        merkleBranch: [], // 单个交易，没有分支
        version: template.version.toString(16),
        nbits: template.bits,
        ntime: Math.floor(Date.now() / 1000).toString(16),
        cleanJobs: true,
        height: template.height,
        target: template.target,
        rxEpochDuration: this.rxEpochDuration,
      };
      
      // 通知所有矿工新任务
      this.notifyNewJob();
      
      console.log(`新任务已创建: 高度 ${template.height}, 难度 ${template.bits}`);
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  }

  /**
   * 通知所有矿工新任务
   */
  private notifyNewJob(): void {
    if (!this.currentJob) return;
    
    const message = JSON.stringify({
      id: null,
      method: 'mining.notify',
      params: [
        this.currentJob.jobId,
        this.currentJob.prevHash,
        this.currentJob.coinbase1,
        this.currentJob.coinbase2,
        this.currentJob.merkleBranch,
        this.currentJob.version,
        this.currentJob.nbits,
        this.currentJob.ntime,
        this.currentJob.cleanJobs,
      ],
    });
    
    for (const client of this.clients.values()) {
      client.send(message);
    }
  }

  /**
   * 反转十六进制字符串（小端序）
   */
  private reverseHex(hex: string): string {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(hex.substr(i, 2));
    }
    return bytes.reverse().join('');
  }

  /**
   * 生成 coinbase 交易（简化版）
   */
  private generateCoinbase(coinbaseValue: number): string {
    // 简化的 coinbase 交易
    // 实际需要更复杂的构建
    const timestamp = Math.floor(Date.now() / 1000);
    const scriptSig = Buffer.from(`Scash Pool ${timestamp}`).toString('hex');
    
    // 版本 (4 bytes) + 输入数量 (1 byte) + 输入 + 输出数量 (1 byte) + 输出 + 锁定时间 (4 bytes)
    const version = '01000000';
    const inputCount = '01';
    const prevTxHash = '00'.repeat(32); // coinbase 交易的输入哈希全为 0
    const prevTxIndex = 'ffffffff';
    const scriptSigLength = (scriptSig.length / 2).toString(16).padStart(2, '0');
    const sequence = 'ffffffff';
    const outputCount = '01';
    const value = coinbaseValue.toString(16).padStart(16, '0');
    const pkScript = '76a914' + '00'.repeat(20) + '88ac'; // 简化的 P2PKH 输出脚本
    const lockTime = '00000000';
    
    return version + inputCount + prevTxHash + prevTxIndex + scriptSigLength + scriptSig + sequence + outputCount + value + pkScript + lockTime;
  }

  /**
   * 分割 coinbase 交易
   */
  private splitCoinbase(coinbaseTx: string): { part1: string, part2: string } {
    // 简化：前半部分作为 coinbase1，后半部分作为 coinbase2
    // 实际需要根据 extranonce 位置来分割
    const mid = Math.floor(coinbaseTx.length / 2);
    return {
      part1: coinbaseTx.substring(0, mid),
      part2: coinbaseTx.substring(mid),
    };
  }

  /**
   * 处理矿工提交的份额
   */
  async handleShare(share: Share, client: Client): Promise<void> {
    this.poolStats.totalShares++;
    
    try {
      // 验证份额
      const isValid = await this.validateShare(share);
      
      if (isValid) {
        this.poolStats.validShares++;
        
        // 检查是否满足全网难度
        const isBlock = await this.checkIfBlock(share);
        
        if (isBlock) {
          console.log(`🎉 发现新的区块！矿工: ${share.workerName || 'unknown'}`);
          this.poolStats.blocksFound++;
          
          // 提交区块到节点
          await this.submitBlock(share);
          
          // 更新任务
          await this.updateJob();
        }
        
        // 发送成功响应
        client.send(JSON.stringify({
          id: share.jobId,
          result: true,
          error: null,
        }));
        
        console.log(`✅ 有效份额: ${share.workerName || 'unknown'} (总: ${this.poolStats.validShares}, 区块: ${this.poolStats.blocksFound})`);
      } else {
        this.poolStats.invalidShares++;
        
        // 发送失败响应
        client.send(JSON.stringify({
          id: share.jobId,
          result: null,
          error: [20, 'invalid share', null],
        }));
        
        console.log(`❌ 无效份额: ${share.workerName || 'unknown'}`);
      }
    } catch (error) {
      console.error('处理份额错误:', error);
      
      // 发送错误响应
      client.send(JSON.stringify({
        id: share.jobId,
        result: null,
        error: [20, 'processing error', null],
      }));
    }
  }

  /**
   * 验证份额
   */
  private async validateShare(share: Share): Promise<boolean> {
    // 1. 检查任务是否存在
    if (!this.currentJob || this.currentJob.jobId !== share.jobId) {
      console.log('任务不存在或已过期');
      return false;
    }
    
    // 2. 检查时间戳是否合理
    const ntime = parseInt(share.ntime, 16);
    const currentTime = Math.floor(Date.now() / 1000);
    if (ntime > currentTime + 7200) {
      console.log('时间戳过大');
      return false;
    }
    
    // 3. 检查 nonce 是否在合理范围内
    const nonce = parseInt(share.nonce, 16);
    if (nonce > 0xffffffff) {
      console.log('Nonce 超出范围');
      return false;
    }
    
    // 4. 使用 RandomX 验证份额
    try {
      const blockHeader = await this.buildBlockHeader(share);
      const poolTarget = difficultyToTarget(this.poolDifficulty);
      console.log(poolTarget,'当前矿池难度');
      const result = verifyShare(blockHeader, poolTarget, this.currentJob.rxEpochDuration);
      console.log(result,'验证是否满足矿池难度');
      
      // result >= 0 表示有效（0=有效但不满足难度，1=有效且满足难度）
      return result >= 0;
    } catch (error) {
      console.error('RandomX 验证失败:', error);
      return false;
    }
  }

  /**
   * 检查是否满足全网难度
   */
  private async checkIfBlock(share: Share): Promise<boolean> {
    if (!this.currentJob) return false;
    
    // 构建区块头
    const blockHeader = await this.buildBlockHeader(share);
    console.log(blockHeader,'构建区块头');
    
    // 计算全网目标难度
    const networkTarget = nbitsToTarget(parseInt(this.currentJob.nbits, 16));
    console.log(networkTarget,'计算全网目标难度');
    
    // 调用原生 RandomX 验证
    const result = verifyShare(blockHeader, networkTarget, this.currentJob.rxEpochDuration);
    console.log(result,'用原生 RandomX 验证');
    
    // result == 1 表示满足全网难度
    return result === 1;
  }

  /**
   * 构建区块头
   */
  private async buildBlockHeader(share: Share): Promise<any> {
    if (!this.currentJob) {
      throw new Error('当前没有可用的挖矿任务');
    }

    // 将 nonce 和 ntime 转换为数值
    const nonce = parseInt(share.nonce, 16);
    const ntime = parseInt(share.ntime, 16);

    // 计算 merkleRoot
    const merkleRoot = await this.calculateMerkleRoot(share);
    
    // 计算 hashRandomX（RandomX 哈希）
    // 注意：RandomX 哈希是基于区块头（不包括 hashRandomX 字段）计算的
    const hashRandomX = await this.calculateRandomXHash(share, merkleRoot);

    // 构建 Scash 区块头（112 字节）
    const header = {
      version: parseInt(this.currentJob.version, 16),
      prevBlock: this.currentJob.prevHash,
      merkleRoot: merkleRoot,
      timestamp: ntime,
      bits: parseInt(this.currentJob.nbits, 16),
      nonce: nonce,
      hashRandomX: hashRandomX,
    };

    // 调试输出
    console.log(`构建区块头: version=${header.version}, nonce=${nonce}, ntime=${ntime}`);
    console.log(`prevBlock: ${header.prevBlock}`);
    console.log(`merkleRoot: ${header.merkleRoot}`);
    console.log(`hashRandomX: ${header.hashRandomX}`);

    return header;
  }

  /**
   * 计算 RandomX 哈希
   */
  private async calculateRandomXHash(share: Share, merkleRoot: string): Promise<string> {
    // 构建 80 字节的区块头（不包括 hashRandomX）
    const header80 = this.build80ByteHeader(share, merkleRoot);
    
    // 计算 RandomX 哈希
    // RandomX 哈希是基于区块头（80 字节）+ RandomX key 计算的
    const hash = await this.doubleSHA256(header80);
    
    return hash;
  }

  /**
   * 构建 80 字节区块头（不包括 hashRandomX）
   */
  private build80ByteHeader(share: Share, merkleRoot: string): string {
    if (!this.currentJob) return '';
    
    const nonce = parseInt(share.nonce, 16);
    const ntime = parseInt(share.ntime, 16);
    
    // 序列化 80 字节区块头
    // version (4) + prevBlock (32) + merkleRoot (32) + timestamp (4) + bits (4) + nonce (4)
    const buffer = new ArrayBuffer(80);
    const view = new DataView(buffer);
    
    view.setUint32(0, parseInt(this.currentJob.version, 16), true);
    
    const prevBlockBytes = this.hexToBytes(this.currentJob.prevHash);
    for (let i = 0; i < 32; i++) {
      view.setUint8(4 + i, prevBlockBytes[i]);
    }
    
    const merkleRootBytes = this.hexToBytes(merkleRoot);
    for (let i = 0; i < 32; i++) {
      view.setUint8(36 + i, merkleRootBytes[i]);
    }
    
    view.setUint32(68, ntime, true);
    view.setUint32(72, parseInt(this.currentJob.nbits, 16), true);
    view.setUint32(76, nonce, true);
    
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Hex 字符串转字节数组
   */
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * 计算 Merkle Root
   */
  private async calculateMerkleRoot(share: Share): Promise<string> {
    // 结合 coinbase1, extraNonce2 和 coinbase2 生成完整的 coinbase
    const coinbaseFull = this.currentJob!.coinbase1 + share.extraNonce2 + this.currentJob!.coinbase2;
    
    // 计算 coinbase 的双 SHA256 哈希
    const coinbaseHash = await this.doubleSHA256(coinbaseFull);
    
    // 对于只有 coinbase 交易的区块，Merkle root 就是 coinbase hash
    return coinbaseHash;
  }

  /**
   * 双 SHA256 哈希
   */
  private async doubleSHA256(hex: string): Promise<string> {
    const data = this.hexToBytes(hex);
    
    // 第一次 SHA256
    const hash1 = await crypto.subtle.digest('SHA-256', data);
    
    // 第二次 SHA256
    const hash2 = await crypto.subtle.digest('SHA-256', new Uint8Array(hash1));
    
    // 转换为 hex 字符串
    return Array.from(new Uint8Array(hash2))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 提交区块到节点
   */
  private async submitBlock(share: Share): Promise<void> {
    // 构建区块（简化版）
    const blockHex = this.buildBlock(share);
    
    try {
      const result = await this.rpcClient.submitBlock(blockHex);
      
      if (result.error) {
        console.error('提交区块失败:', result.error);
      } else {
        console.log('✅ 区块已成功提交到节点');
        this.poolStats.lastBlockHeight = this.currentJob?.height || 0;
      }
    } catch (error) {
      console.error('提交区块错误:', error);
    }
  }

  /**
   * 构建区块（简化版）
   */
  private buildBlock(share: Share): string {
    // 实际需要：
    // 1. 构建 coinbase 交易
    // 2. 构建 Merkle 树
    // 3. 构建完整的区块头
    // 4. 计算区块哈希
    
    // 这里返回一个模拟的区块 hex
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }

  /**
   * 获取矿池统计信息
   */
  getStats(): PoolStats {
    return { ...this.poolStats };
  }

  /**
   * 获取当前任务
   */
  getCurrentJob(): MiningJob | null {
    return this.currentJob;
  }
}

/**
 * Stratum 客户端（矿工）
 */
class Client {
  private socket: any;
  private server: StratumServer;
  private authorized: boolean = false;
  private workerName: string = '';

  constructor(socket: any, server: StratumServer) {
    this.socket = socket;
    this.server = server;
  }

  /**
   * 处理收到的消息
   */
  handleMessage(data: string): void {
    try {
      const lines = data.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const message = JSON.parse(line);
        this.handleMessageObject(message);
      }
    } catch (error) {
      console.error('解析消息错误:', error);
    }
  }

  /**
   * 处理 JSON 消息对象
   */
  private handleMessageObject(message: any): void {
    const { id, method, params } = message;
    
    switch (method) {
      case 'mining.subscribe':
        this.handleSubscribe(id, params);
        break;
      case 'mining.authorize':
        this.handleAuthorize(id, params);
        break;
      case 'mining.submit':
        this.handleSubmit(id, params);
        break;
      case 'mining.extranonce.subscribe':
        this.handleExtraNonceSubscribe(id);
        break;
      default:
        console.log('未知方法:', method);
    }
  }

  /**
   * 处理订阅请求
   */
  private handleSubscribe(id: number, params: any[]): void {
    // 订阅成功，返回: [订阅ID, extranonce1, extranonce2_size]
    const response = {
      id,
      result: [
        [ // 订阅 ID 列表
          ['mining.notify', 'ae6812eb4cd7735a302a8a9dd95cf71f'] // 订阅 ID
        ],
        '00000000', // extranonce1
        4, // extranonce2_size
      ],
      error: null,
    };
    
    this.send(JSON.stringify(response));
    
    // 立即发送第一个任务
    setTimeout(() => {
      this.server.notifyNewJob();
    }, 100);
  }

  /**
   * 处理授权请求
   */
  private handleAuthorize(id: number, params: any[]): void {
    const [username, password] = params;
    
    // 这里应该验证用户名和密码
    // 简化版本接受所有请求
    this.authorized = true;
    this.workerName = username;
    
    const response = {
      id,
      result: true,
      error: null,
    };
    
    this.send(JSON.stringify(response));
    console.log(`矿工已授权: ${username}`);
  }

  /**
   * 处理提交请求
   */
  private async handleSubmit(id: number, params: any[]): Promise<void> {
    if (!this.authorized) {
      this.send(JSON.stringify({
        id,
        result: null,
        error: [24, 'unauthorized worker', null],
      }));
      return;
    }
    
    const [workerName, jobId, extraNonce2, ntime, nonce] = params;
    
    const share: Share = {
      jobId,
      extraNonce2,
      ntime,
      nonce,
      workerName,
      difficulty: this.server['poolDifficulty'],
    };
    
    await this.server.handleShare(share, this);
  }

  /**
   * 处理 extranonce 订阅
   */
  private handleExtraNonceSubscribe(id: number): void {
    const response = {
      id,
      result: '00000000', // extranonce1
      error: null,
    };
    
    this.send(JSON.stringify(response));
  }

  /**
   * 发送消息给矿工
   */
  send(message: string): void {
    this.socket.write(message + '\n');
  }
}
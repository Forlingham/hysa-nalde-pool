import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as net from 'net';
import * as crypto from 'crypto';

@Injectable()
export class StratumService {
  // 保存当前最新的任务
  currentJob: any = null;
  // 保存所有在线的 socket，用于广播
  private connectedSockets: net.Socket[] = [];
  // 处理矿工发来的请求
  handleMessage(socket: net.Socket, payload: any) {
    const { method, params, id } = payload;
    console.log(`📩 收到消息 [${method}]:`, params);

    switch (method) {
      case 'mining.subscribe':
        this.handleSubscribe(socket, id);
        break;
      case 'mining.authorize':
        this.handleAuthorize(socket, id, params);
        break;
      case 'mining.submit':
        this.handleSubmit(socket, id, params);
        break;
      default:
        console.warn('未知方法:', method);
    }
  }

  // 1. 订阅 (矿机连上来第一件事)
  private handleSubscribe(socket: net.Socket, id: any) {
    // 1. 生成唯一的 ExtraNonce1 (这里简单用 Hex 随机数，或者递增)
    // 确保是 8 个字符 (4字节) 的 Hex
    const extraNonce1 = '08000002'; // 你可以改为随机: crypto.randomBytes(4).toString('hex');
    const extraNonce2Size = 4;

    // 🔥 关键修改：把这个分配给矿工的 ID 存到 socket 对象上！
    (socket as any).minerSession = {
      extraNonce1: extraNonce1,
      difficulty: 0.001, // 初始难度也存这里
    };

    const response = {
      id: id,
      result: [
        [
          ['mining.set_difficulty', '1'],
          ['mining.notify', '1'],
        ],
        extraNonce1, // 发给矿机
        extraNonce2Size,
      ],
      error: null,
    };
    this.send(socket, response);
  }

  // 2. 授权 (登录)
  private handleAuthorize(socket: net.Socket, id: any, params: any[]) {
    const [username, password] = params;
    console.log(`👤 矿工登录: ${username}`);

    // 这里通常去查数据库，现在直接通过
    const response = {
      id: id,
      result: true,
      error: null,
    };
    this.send(socket, response);

    // 🔥 登录成功后，立马下发第一个任务，矿机才会开始转！
    this.sendDifficulty(socket, 1); // 设置初始难度
    if (this.currentJob) {
      this.sendMiningJob(socket, this.currentJob);
    } else {
      console.log('⚠️ 还没有收到 ZMQ 任务，暂时无法下发');
    }
  }

  // 3. 处理提交 (矿机算出结果了！)
  async handleSubmit(socket: net.Socket, id: any, params: any[]) {
    const [workerName, jobId, extraNonce2, ntime, nonce] = params;

    const job = this.currentJob;
    if (!job || job.jobId !== jobId) {
      this.replyError(socket, id, 21, 'Job not found');
      return;
    }

    const session = (socket as any).minerSession;
    if (!session || !session.extraNonce1) {
      this.replyError(socket, id, 24, 'Unauthorized');
      return;
    }
    const extraNonce1 = session.extraNonce1;

    // 1. 准备数据 (加 trim 去除隐形空格)
    const coinbase1 = Buffer.from(job.coinbase1.trim(), 'hex');
    const coinbase2 = Buffer.from(job.coinbase2.trim(), 'hex');
    const en1 = Buffer.from(extraNonce1.trim(), 'hex');
    const en2 = Buffer.from(extraNonce2.trim(), 'hex');

    // 2. 重构 Coinbase
    // 结构: [Coinbase1] + [ExtraNonce1] + [ExtraNonce2] + [Coinbase2]
    const coinbaseFull = Buffer.concat([coinbase1, en1, en2, coinbase2]);
    const coinbaseHash = sha256d(coinbaseFull);

    // 3. 重算 Merkle Root
    let merkleRoot = coinbaseHash;
    for (const branch of job.merkleBranch) {
      const branchHash = Buffer.from(branch, 'hex');
      merkleRoot = sha256d(Buffer.concat([merkleRoot, branchHash]));
    }

    // 4. 组装 Header
    const versionBuffer = reverseBuffer(Buffer.from(job.version, 'hex'));
    const prevHashBuffer = reverseBuffer(Buffer.from(job.prevHash, 'hex'));
    const merkleRootBuffer = merkleRoot; // 算出来就是 LE，无需翻转
    const ntimeBuffer = reverseBuffer(Buffer.from(ntime, 'hex'));
    const nbitsBuffer = reverseBuffer(Buffer.from(job.nbits, 'hex'));
    const nonceBuffer = reverseBuffer(Buffer.from(nonce, 'hex'));

    const header = Buffer.concat([
      versionBuffer,
      prevHashBuffer,
      merkleRootBuffer,
      ntimeBuffer,
      nbitsBuffer,
      nonceBuffer,
    ]);

    const blockHash = sha256d(header);
    const blockHashHex = reverseBuffer(blockHash).toString('hex');

    // --- 🔍 像素级调试日志 ---
    console.log('------------------------------------------------');
    console.log(`📩 Share 验证 [${workerName}]`);
    console.log(`   ExtraNonce1: ${extraNonce1}`);
    console.log(`   ExtraNonce2: ${extraNonce2}`);
    console.log(`   [Server Coinbase]: ${coinbaseFull.toString('hex')}`); // 🔥 重点看这个
    console.log(`   [Server Header]  : ${header.toString('hex')}`); // 🔥 还有这个
    console.log(`   Calculated Hash  : ${blockHashHex}`);

    if (blockHashHex.startsWith('00')) {
      console.log('✅ Share Accepted! (Valid)');
      this.send(socket, { id: id, result: true, error: null });
    } else {
      console.log('❌ Share Rejected');
      this.send(socket, { id: id, result: true, error: null });
    }
  }

  // --- 辅助方法：发送数据 ---
  private send(socket: net.Socket, data: any) {
    const payload = JSON.stringify(data) + '\n'; // 必须加换行符
    socket.write(payload);
  }

  // 下发难度
  private sendDifficulty(socket: net.Socket, difficulty: number) {
    const payload = {
      method: 'mining.set_difficulty',
      params: [difficulty],
      id: null,
    };
    this.send(socket, payload);
  }

  // 下发挖矿任务
  private sendMiningJob(socket: net.Socket, job: any) {
    // 🛡️ 防御性编程：如果 job 为空（比如服务刚启动还没连上节点），直接返回
    if (!job) {
      console.warn('⚠️ 尝试下发任务，但当前没有可用 Job');
      return;
    }

    const payload = {
      method: 'mining.notify',
      params: [
        job.jobId,
        job.prevHash,
        job.coinbase1,
        job.coinbase2,
        job.merkleBranch,
        job.version,
        job.nbits,
        job.ntime,
        job.cleanJobs,
      ],
      id: null,
    };

    console.log('🚀 下发任务 Job ID:', job.jobId); // 日志太多可以注释掉
    this.send(socket, payload);
  }

  @OnEvent('job.new')
  handleNewJob(job: any) {
    console.log(`📢 [Stratum] 收到新任务 JobID: ${job.jobId}，更新缓存...`);

    // 🔥 核心修复点：赋值！
    this.currentJob = job;

    // 拿到新任务后，立刻广播给所有在线矿工
    this.broadcastJob(job);
  }

  // 辅助方法：添加 Socket 到列表 (在 TcpServer 里调用)
  addSocket(socket: net.Socket) {
    this.connectedSockets.push(socket);
    // 监听断开，清理列表
    socket.on('close', () => {
      this.connectedSockets = this.connectedSockets.filter((s) => s !== socket);
    });
  }

  // 广播任务
  private broadcastJob(job: any) {
    console.log(`📡 正在向 ${this.connectedSockets.length} 个矿工广播任务...`);
    this.connectedSockets.forEach((socket) => {
      this.sendMiningJob(socket, job);
    });
  }

  private replyError(
    socket: net.Socket,
    id: any,
    code: number,
    message: string,
  ) {
    const response = {
      id: id,
      result: null,
      // Stratum 协议标准错误格式: [code, message, traceback]
      error: [code, message, null],
    };
    this.send(socket, response);
  }
}

// 双重 SHA256
function sha256d(buffer: Buffer): Buffer {
  return crypto
    .createHash('sha256')
    .update(crypto.createHash('sha256').update(buffer).digest())
    .digest();
}

// 单次 SHA256
function sha256(buffer: Buffer): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

// 翻转 Buffer (处理大小端字节序)
function reverseBuffer(buffer: Buffer): Buffer {
  const reversed = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    reversed[i] = buffer[buffer.length - 1 - i];
  }
  return reversed;
}

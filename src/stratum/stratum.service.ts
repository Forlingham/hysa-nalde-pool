import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as net from 'net';

@Injectable()
export class StratumService {
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
    // 这里的 ExtraNonce1 是矿池分配给矿工的唯一 ID (十六进制)
    const extraNonce1 = '08000002';
    const extraNonce2Size = 4;

    const response = {
      id: id,
      result: [
        [
          ['mining.set_difficulty', '1'],
          ['mining.notify', '1'],
        ],
        extraNonce1,
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
    this.sendDifficulty(socket, 1024); // 设置初始难度
    this.sendMiningJob(socket);
  }

  // 3. 处理提交 (矿机算出结果了！)
  private handleSubmit(socket: net.Socket, id: any, params: any[]) {
    const [workerName, jobId, extraNonce2, ntime, nonce] = params;

    console.log(`✅ 收到 Share 提交!`);
    console.log(`   - JobID: ${jobId}`);
    console.log(`   - Nonce: ${nonce}`);
    console.log(`   - ExtraNonce2: ${extraNonce2}`);

    // 💡 下一步核心：在这里调用 C++ 模块验证 Hash
    // 目前我们先假装它通过了
    const response = {
      id: id,
      result: true, // true 代表接受，false 代表拒绝
      error: null,
    };
    this.send(socket, response);
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

  // 下发挖矿任务 (这里是写死的模拟数据)
  private sendMiningJob(socket: net.Socket) {
    // 真实场景：这些数据来自比特币全节点 (getblocktemplate)
    const jobId = 'abcd123';
    const prevHash =
      '0000000000000000000000000000000000000000000000000000000000000000'; // 前一个区块Hash
    const coinb1 =
      '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff';
    const coinb2 =
      'ffffffff0100f2052a010000001976a91468cc006093d964f4476c8c474d209e73f400788788ac00000000';
    const merkleBranch = []; // 默克尔树分支
    const version = '20000000';
    const nbits = '1d00ffff'; // 难度目标
    const ntime = '5c6a7935'; // 时间戳
    const cleanJobs = true;

    const payload = {
      method: 'mining.notify',
      params: [
        jobId,
        prevHash,
        coinb1,
        coinb2,
        merkleBranch,
        version,
        nbits,
        ntime,
        cleanJobs,
      ],
      id: null,
    };

    console.log('🚀 下发任务 Job ID:', jobId);
    this.send(socket, payload);
  }

  @OnEvent('job.new')
  handleNewJob(job: any) {
    console.log(
      '📢 Stratum Service received new job, broadcasting to miners...',
    );

    // 这里你需要维护一个所有在线 socket 的列表
    // this.connectionManager.broadcast(job);

    // 下发 Stratum 协议的 mining.notify
    const payload = {
      method: 'mining.notify',
      params: [
        job.jobId,
        job.prevHash, // 注意：Stratum 协议里这里可能需要字节翻转 (Big Endian <-> Little Endian)
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

    // 伪代码：广播给所有连接
    // this.connectedSockets.forEach(socket => this.send(socket, payload));
  }
}

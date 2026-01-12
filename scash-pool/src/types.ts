// 类型定义

// 区块头结构 (112 字节)
export interface BlockHeader {
  version: number;        // 4 字节
  prevBlock: string;      // 32 字节 (hex)
  merkleRoot: string;     // 32 字节 (hex)
  timestamp: number;      // 4 字节
  bits: number;           // 4 字节
  nonce: number;          // 4 字节
  hashRandomX: string;    // 32 字节 (hex) - Scash 新增字段
}

// 挖矿任务
export interface MiningJob {
  jobId: string;          // 任务 ID
  prevHash: string;       // 前一个区块哈希
  coinbase1: string;      // coinbase 交易第一部分 (hex)
  coinbase2: string;      // coinbase 交易第二部分 (hex)
  merkleBranch: string[]; // Merkle 分支
  version: number;        // 区块版本
  nbits: string;          // 难度目标 (hex)
  ntime: string;          // 时间戳 (hex)
  cleanJobs: boolean;     // 是否清理旧任务
  height: number;         // 区块高度
  target: string;         // 目标难度 (hex)
  rxEpochDuration: number; // RandomX epoch 持续时间 (秒)
}

// 矿工提交的份额
export interface Share {
  jobId: string;          // 任务 ID
  extraNonce2: string;    // extra nonce 2 (hex)
  ntime: string;          // 时间戳 (hex)
  nonce: string;          // nonce (hex)
  workerName?: string;    // 矿工名称
  difficulty: number;     // 份额难度
}

// Scash 节点 RPC 响应
export interface GetBlockTemplateResponse {
  version: number;
  previousblockhash: string;
  transactions: any[];
  coinbaseaux: any;
  coinbasetxn?: any;
  longpollid: string;
  target: string;
  mintime: number;
  mutable: string[];
  noncerange: string[];
  sigoplimit: number;
  sizelimit: number;
  weightlimit: number;
  curtime: number;
  bits: string;
  height: number;
  default_witness_commitment?: any;
  capabilities: string[];
  rx_epoch_duration: number; // Scash 特有字段
}

export interface SubmitBlockResponse {
  result: any;
  error?: any;
  id: string;
}

// 矿池统计
export interface PoolStats {
  totalShares: number;      // 总份额数
  validShares: number;      // 有效份额数
  invalidShares: number;    // 无效份额数
  blocksFound: number;      // 发现的区块数
  lastBlockHeight: number;  // 最后发现的区块高度
  poolHashrate: number;     // 矿池算力 (H/s)
}
// RandomX 相关工具函数
// 注意：这是一个简化版本，实际需要集成 RandomX 库

import { BlockHeader } from './types.js';

/**
 * 计算 Epoch
 * @param timestamp 区块时间戳
 * @param epochDuration epoch 持续时间（秒）
 * @returns epoch 编号
 */
export function getEpoch(timestamp: number, epochDuration: number): number {
  return Math.floor(timestamp / epochDuration);
}

/**
 * 派生 RandomX Key
 * @param epoch epoch 编号
 * @returns RandomX Key (32 字节 hex)
 */
export function getSeedHash(epoch: number): string {
  const seedString = `Scash/RandomX/Epoch/${epoch}`;
  
  // 双 SHA256 哈希
  const h1 = sha256(seedString);
  const h2 = sha256(h1);
  
  return h2;
}

/**
 * 简化的 SHA256 实现（仅用于演示）
 * 实际生产环境需要使用加密库或调用 RandomX 库
 */
function sha256(input: string): string {
  // 这里应该使用实际的 SHA256 实现
  // 为了演示，我们使用 Bun 的 crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = Bun.hash(data);
  
  // 转换为 hex 字符串
  return hashBuffer.toString('hex').padStart(64, '0');
}

/**
 * 验证 RandomX Commitment 是否满足目标难度
 * @param blockHeader 区块头
 * @param target 目标难度
 * @returns 是否满足
 */
export function verifyRandomXCommitment(blockHeader: BlockHeader, target: string): boolean {
  // 注意：这是一个简化版本
  // 实际生产环境需要：
  // 1. 计算 epoch
  // 2. 派生 RandomX Key
  // 3. 计算 RandomX hash
  // 4. 计算 RandomX commitment
  // 5. 比较 commitment <= target
  
  // 这里我们使用简化的验证逻辑
  // 实际需要集成 RandomX 库
  
  const commitment = calculateCommitment(blockHeader);
  return compareHash(commitment, target) <= 0;
}

/**
 * 计算 RandomX Commitment（简化版）
 * 实际需要调用 RandomX 库
 */
function calculateCommitment(blockHeader: BlockHeader): string {
  // 实际实现需要：
  // 1. 将区块头序列化（hashRandomX 字段设为 0）
  // 2. 使用 RandomX 库计算 hashRandomX
  // 3. 使用 RandomX 库计算 commitment
  
  // 这里返回一个模拟值
  return '0'.repeat(64);
}

/**
 * 比较两个哈希值
 * @returns -1 (hash1 < hash2), 0 (hash1 == hash2), 1 (hash1 > hash2)
 */
function compareHash(hash1: string, hash2: string): number {
  const n1 = BigInt('0x' + hash1);
  const n2 = BigInt('0x' + hash2);
  
  if (n1 < n2) return -1;
  if (n1 > n2) return 1;
  return 0;
}

/**
 * 将难度转换为目标值
 * @param difficulty 难度值
 * @returns 目标值 (hex)
 */
export function difficultyToTarget(difficulty: number): string {
  // Scash 的 PoW limit: 0x00007fffff000000000000000000000000000000000000000000000000000000
  const powLimit = BigInt('0x00007fffff000000000000000000000000000000000000000000000000000000');
  
  const target = powLimit / BigInt(Math.floor(difficulty));
  
  return target.toString(16).padStart(64, '0');
}

/**
 * 将 nBits 转换为目标值
 * @param nBits 难度位
 * @returns 目标值 (hex)
 */
export function nbitsToTarget(nBits: number): string {
  // 解析 nBits
  const exponent = nBits >> 24;
  const mantissa = nBits & 0x007fffff;
  
  if (exponent <= 3) {
    return (mantissa >> (8 * (3 - exponent))).toString(16).padStart(64, '0');
  } else {
    return (mantissa << (8 * (exponent - 3))).toString(16).padStart(64, '0');
  }
}
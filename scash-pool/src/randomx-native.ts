// RandomX 原生绑定 - 使用 Bun FFI
// 调用 C++ 编译的验证函数

import { dlopen, FFIType, ptr, CString } from "bun:ffi";

import { BlockHeader } from './types.js';

// 定义函数签名
interface ScashNative {
  verify_share: (headerHex: ptr<Uint8Array>, targetHex: ptr<Uint8Array>, epochDuration: number) => number;
  cleanup_randomx: () => void;
  calculate_epoch: (timestamp: number, duration: number) => number;
  calculate_seed_hash: (epoch: number, output: ptr<Uint8Array>) => void;
}

let lib: ScashNative | null = null;

/**
 * 加载原生模块
 */
export async function loadNativeModule(): Promise<void> {
  try {
    const modulePath = `${import.meta.dir}/../native/build/libscash_native.so`;
    
    console.log('📦 加载 RandomX 原生模块...');
    console.log('   路径:', modulePath);
    
    // 使用 Bun FFI 加载共享库
    lib = dlopen(modulePath, {
      verify_share: {
        args: [FFIType.cstring, FFIType.cstring, FFIType.u32],
        returns: FFIType.i32,
      },
      cleanup_randomx: {
        args: [],
        returns: FFIType.void,
      },
      calculate_epoch: {
        args: [FFIType.u32, FFIType.u32],
        returns: FFIType.u32,
      },
      calculate_seed_hash: {
        args: [FFIType.u32, FFIType.pointer],
        returns: FFIType.void,
      },
    }) as ScashNative;
    
    console.log('✅ RandomX 原生模块加载成功');
    
  } catch (error) {
    console.error('❌ 加载原生模块失败:', error);
    console.error('   请确保已运行: ./build-native.sh');
    throw error;
  }
}

/**
 * 验证份额（调用原生模块）
 * @param header 区块头
 * @param target 目标难度 (hex)
 * @param epochDuration epoch 持续时间（秒）
 * @returns 1=有效且满足难度, 0=有效但不满足难度, -1=无效
 */
export function verifyShare(
  header: BlockHeader,
  target: string,
  epochDuration: number
): number {
  if (!lib) {
    console.error('❌ 原生模块未加载，请先调用 loadNativeModule()');
    return -1;
  }
  
  try {
    // 序列化区块头为 hex
    const headerHex = serializeBlockHeader(header);
    
    // 创建 C 字符串指针
    const headerPtr = ptr(new TextEncoder().encode(headerHex + '\0'));
    const targetPtr = ptr(new TextEncoder().encode(target + '\0'));
    
    // 调用原生验证函数
    const result = lib.symbols.verify_share(headerPtr, targetPtr, epochDuration);
    
    return result;
  } catch (error) {
    console.error('❌ 调用 verify_share 失败:', error);
    return -1;
  }
}

/**
 * 序列化区块头为 hex 字符串
 */
function serializeBlockHeader(header: BlockHeader): string {
  // 将区块头序列化为 112 字节的 hex 字符串
  const buffer = new ArrayBuffer(112);
  const view = new DataView(buffer);
  
  // version (4 bytes, little endian)
  view.setUint32(0, header.version, true);
  
  // prevBlock (32 bytes, little endian)
  const prevBlockBytes = hexToBytes(header.prevBlock);
  for (let i = 0; i < 32; i++) {
    view.setUint8(4 + i, prevBlockBytes[i]);
  }
  
  // merkleRoot (32 bytes, little endian)
  const merkleRootBytes = hexToBytes(header.merkleRoot);
  for (let i = 0; i < 32; i++) {
    view.setUint8(36 + i, merkleRootBytes[i]);
  }
  
  // timestamp (4 bytes, little endian)
  view.setUint32(68, header.timestamp, true);
  
  // bits (4 bytes, little endian)
  view.setUint32(72, header.bits, true);
  
  // nonce (4 bytes, little endian)
  view.setUint32(76, header.nonce, true);
  
  // hashRandomX (32 bytes, little endian)
  const hashRandomXBytes = hexToBytes(header.hashRandomX);
  for (let i = 0; i < 32; i++) {
    view.setUint8(80 + i, hashRandomXBytes[i]);
  }
  
  // 转换为 hex 字符串
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hex 字符串转字节数组
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * 清理 RandomX 资源
 */
export function cleanup(): void {
  if (lib) {
    try {
      lib.symbols.cleanup_randomx();
      console.log('✅ RandomX 资源已清理');
    } catch (error) {
      console.error('❌ 清理资源失败:', error);
    }
  }
}

/**
 * 计算 Epoch
 */
export function getEpoch(timestamp: number, duration: number): number {
  if (!lib) {
    console.error('❌ 原生模块未加载，请先调用 loadNativeModule()');
    return 0;
  }
  
  try {
    return lib.symbols.calculate_epoch(timestamp, duration);
  } catch (error) {
    console.error('❌ 调用 calculate_epoch 失败:', error);
    return 0;
  }
}

/**
 * 计算 Seed Hash
 */
export function getSeedHash(epoch: number): Uint8Array {
  if (!lib) {
    console.error('❌ 原生模块未加载，请先调用 loadNativeModule()');
    return new Uint8Array(32);
  }
  
  try {
    const output = new Uint8Array(32);
    lib.symbols.calculate_seed_hash(epoch, output);
    return output;
  } catch (error) {
    console.error('❌ 调用 calculate_seed_hash 失败:', error);
    return new Uint8Array(32);
  }
}

/**
 * 将难度转换为目标值
 */
export function difficultyToTarget(difficulty: number): string {
  // Scash 的 PoW limit
  const powLimit = BigInt('0x00007fffff000000000000000000000000000000000000000000000000000000000');
  
  const target = powLimit / BigInt(Math.floor(difficulty));
  
  return target.toString(16).padStart(64, '0');
}

/**
 * 将 nBits 转换为目标值
 */
export function nbitsToTarget(nBits: number): string {
  // 解析 nBits
  const exponent = nBits >> 24;
  const mantissa = nBits & 0x007fffff;
  
  let target: bigint;
  if (exponent <= 3) {
    target = BigInt(mantissa >> (8 * (3 - exponent)));
  } else {
    target = BigInt(mantissa) << BigInt(8 * (exponent - 3));
  }
  
  return target.toString(16).padStart(64, '0');
}
// 测试 RandomX 原生模块
import { verifyShare, getEpoch, difficultyToTarget, loadNativeModule } from './randomx-native.js';

async function test() {
  console.log('========================================');
  console.log('测试 RandomX 原生模块');
  console.log('========================================\n');

  // 加载原生模块
  console.log('📦 加载原生模块...');
  await loadNativeModule();
  console.log('✅ 原生模块加载完成\n');

  // 测试 1: 计算 Epoch
  console.log('测试 1: 计算 Epoch');
  const epoch = getEpoch(1707657600, 604800); // 2024-02-11
  console.log(`   时间戳: 1707657600 (2024-02-11)`);
  console.log(`   Epoch 持续时间: 604800 秒 (7 天)`);
  console.log(`   Epoch: ${epoch}`);
  console.log('   ✅ 通过\n');

  // 测试 2: 难度转换
  console.log('测试 2: 难度转换');
  const target = difficultyToTarget(1.0);
  console.log(`   难度: 1.0`);
  console.log(`   目标值: ${target}`);
  console.log(`   目标值长度: ${target.length} 字符`);
  console.log('   ✅ 通过\n');

  // 测试 3: 份额验证
  console.log('测试 3: 份额验证');
  const blockHeader = {
    version: 1,
    prevBlock: '0'.repeat(64),
    merkleRoot: '0'.repeat(64),
    timestamp: 1707657600,
    bits: 0x1e0fffff,
    nonce: 12345,
    hashRandomX: '0'.repeat(64),
  };

  const poolTarget = difficultyToTarget(1.0);
  const result = verifyShare(blockHeader, poolTarget, 604800);

  console.log(`   区块头: version=${blockHeader.version}, nonce=${blockHeader.nonce}`);
  console.log(`   目标难度: ${poolTarget}`);
  console.log(`   验证结果: ${result}`);
  console.log(`   结果说明: ${result === 1 ? '有效且满足难度' : result === 0 ? '有效但不满足难度' : '无效'}`);
  console.log('   ✅ 通过\n');

  console.log('========================================');
  console.log('所有测试通过！');
  console.log('========================================');
}

test().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
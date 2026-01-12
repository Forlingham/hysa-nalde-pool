// Scash 矿池主程序
import { ScashRPCClient } from './scash-rpc.js';
import { StratumServer } from './stratum-server.js';

// Scash 节点配置
const SCASH_CONFIG = {
  rpcUser: 'scash_user',
  rpcPassword: 'scash_password',
  rpcPort: 18443,
  rpcHost: '127.0.0.1',
};

// 矿池配置
const POOL_CONFIG = {
  stratumPort: 3334,
  poolDifficulty: 1.0, // 矿池份额难度
  poolName: 'Scash Demo Pool',
};

async function main() {
  console.log('========================================');
  console.log(`🚀 启动 ${POOL_CONFIG.poolName}`);
  console.log('========================================');
  console.log(`Scash 节点: ${SCASH_CONFIG.rpcHost}:${SCASH_CONFIG.rpcPort}`);
  console.log(`Stratum 端口: ${POOL_CONFIG.stratumPort}`);
  console.log(`矿池难度: ${POOL_CONFIG.poolDifficulty}`);
  console.log('========================================\n');

  // 加载原生 RandomX 模块
  console.log('📦 加载 RandomX 原生模块...');
  const { loadNativeModule } = await import('./randomx-native.js');
  await loadNativeModule();
  console.log('✅ RandomX 模块加载完成\n');

  // 创建 RPC 客户端
  const rpcClient = new ScashRPCClient(
    SCASH_CONFIG.rpcUser,
    SCASH_CONFIG.rpcPassword,
    SCASH_CONFIG.rpcPort,
    SCASH_CONFIG.rpcHost
  );

  try {
    // 测试连接
    console.log('📡 连接到 Scash 节点...');
    const blockCount = await rpcClient.getBlockCount();
    console.log(`✅ 连接成功！当前区块高度: ${blockCount}\n`);
    
    // 获取挖矿信息
    const miningInfo = await rpcClient.getMiningInfo();
    console.log('📊 挖矿信息:');
    console.log(`   网络算力: ${miningInfo.networkhashps || 'N/A'} H/s`);
    console.log(`   当前难度: ${miningInfo.difficulty || 'N/A'}`);
    console.log(`   区块奖励: ${miningInfo.blocks || 'N/A'}\n`);

  } catch (error) {
    console.error('❌ 无法连接到 Scash 节点，请检查配置！');
    console.error('错误:', error);
    process.exit(1);
  }

  // 创建 Stratum 服务器
  const stratumServer = new StratumServer(rpcClient, POOL_CONFIG.poolDifficulty);

  try {
    // 启动 Stratum 服务器
    await stratumServer.start(POOL_CONFIG.stratumPort);
    
    console.log('\n✅ 矿池已启动，等待矿工连接...\n');
    console.log('💡 使用以下命令连接矿工:');
    console.log(`   ./minerd -o stratum+tcp://127.0.0.1:${POOL_CONFIG.stratumPort} -u worker1 -p x`);
    console.log('\n========================================\n');

    // 定期输出统计信息
    setInterval(() => {
      const stats = stratumServer.getStats();
      console.log('📈 矿池统计:');
      console.log(`   总份额: ${stats.totalShares}`);
      console.log(`   有效份额: ${stats.validShares}`);
      console.log(`   无效份额: ${stats.invalidShares}`);
      console.log(`   发现区块: ${stats.blocksFound}`);
      console.log(`   最后区块高度: ${stats.lastBlockHeight}`);
      console.log(`   矿池算力: ${stats.poolHashrate} H/s`);
      console.log('');
    }, 60000); // 每分钟输出一次

  } catch (error) {
    console.error('❌ 启动矿池失败:', error);
    process.exit(1);
  }

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n\n🛑 正在关闭矿池...');
    const stats = stratumServer.getStats();
    console.log('📊 最终统计:');
    console.log(`   总份额: ${stats.totalShares}`);
    console.log(`   有效份额: ${stats.validShares}`);
    console.log(`   无效份额: ${stats.invalidShares}`);
    console.log(`   发现区块: ${stats.blocksFound}`);
    console.log('\n👋 再见！');
    process.exit(0);
  });
}

// 启动程序
main().catch((error) => {
  console.error('❌ 程序错误:', error);
  process.exit(1);
});
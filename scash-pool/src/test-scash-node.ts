// 测试 Scash 节点连接
import { ScashRPCClient } from './scash-rpc.js';

const SCASH_RPC_HOST = '127.0.0.1';
const SCASH_RPC_PORT = 18443;
const SCASH_RPC_USER = 'scash_user';
const SCASH_RPC_PASSWORD = 'scash_password';

async function testScashNode() {
  console.log('========================================');
  console.log('测试 Scash 节点连接');
  console.log('========================================');
  
  const rpcClient = new ScashRPCClient(SCASH_RPC_USER, SCASH_RPC_PASSWORD, SCASH_RPC_PORT, SCASH_RPC_HOST);
  
  try {
    console.log('\n📡 连接到 Scash 节点...');
    console.log(`   URL: http://${SCASH_RPC_HOST}:${SCASH_RPC_PORT}`);
    
    // 测试 1: 获取区块高度
    console.log('\n测试 1: 获取区块高度');
    const blockCount = await rpcClient.getBlockCount();
    console.log(`   ✅ 当前区块高度: ${blockCount}`);
    
    // 测试 2: 获取区块信息
    console.log('\n测试 2: 获取最新区块信息');
    if (blockCount > 0) {
      const blockHash = await rpcClient.getBlockHash(blockCount);
      console.log(`   ✅ 最新区块哈希: ${blockHash}`);
      
      const blockInfo = await rpcClient.getBlock(blockHash);
      console.log(`   ✅ 区块时间: ${new Date(blockInfo.time * 1000).toISOString()}`);
      console.log(`   ✅ 区块难度: ${blockInfo.difficulty}`);
      console.log(`   ✅ 区块交易数: ${blockInfo.tx.length}`);
    }
    
    // 测试 3: 获取网络信息
    console.log('\n测试 3: 获取网络信息');
    const networkInfo = await rpcClient.getNetworkInfo();
    console.log(`   ✅ 网络版本: ${networkInfo.version}`);
    console.log(`   ✅ 连接数: ${networkInfo.connections}`);
    console.log(`   ✅ 网络算力: ${networkInfo.networkhashps} H/s`);
    
    // 测试 4: 获取挖矿信息
    console.log('\n测试 4: 获取挖矿信息');
    const miningInfo = await rpcClient.getMiningInfo();
    console.log(`   ✅ 当前难度: ${miningInfo.difficulty}`);
    console.log(`   ✅ 网络算力: ${miningInfo.networkhashps} H/s`);
    console.log(`   ✅ 区块大小: ${miningInfo.currentblocksize} / ${miningInfo.currentblocktx}`);
    
    // 测试 5: 获取区块模板
    console.log('\n测试 5: 获取区块模板');
    const template = await rpcClient.getBlockTemplate();
    console.log(`   ✅ 模板高度: ${template.height}`);
    console.log(`   ✅ 上一个区块哈希: ${template.previousblockhash}`);
    console.log(`   ✅ 区块版本: ${template.version}`);
    console.log(`   ✅ 难度位: ${template.bits}`);
    console.log(`   ✅ 目标值: ${template.target}`);
    if (template.rx_epoch_duration) {
      console.log(`   ✅ RandomX Epoch 持续时间: ${template.rx_epoch_duration} 秒`);
    }
    console.log(`   ✅ 交易数量: ${template.transactions.length}`);
    
    // 测试 6: 获取区块链信息
    console.log('\n测试 6: 获取区块链信息');
    const blockchainInfo = await rpcClient.getBlockchainInfo();
    console.log(`   ✅ 链名称: ${blockchainInfo.chain}`);
    console.log(`   ✅ 区块数量: ${blockchainInfo.blocks}`);
    console.log(`   ✅ 标题区块高度: ${blockchainInfo.headers}`);
    console.log(`   ✅ 验证进度: ${(blockchainInfo.verificationprogress * 100).toFixed(2)}%`);
    console.log(`   ✅ 初始区块下载: ${blockchainInfo.initialblockdownload ? '是' : '否'}`);
    console.log(`   ✅ 难度: ${blockchainInfo.difficulty}`);
    
    console.log('\n========================================');
    console.log('✅ 所有测试通过！Scash 节点运行正常');
    console.log('========================================\n');
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n可能的原因:');
    console.error('1. Scash 节点未启动');
    console.error('2. RPC 端口配置错误 (默认: 18443)');
    console.error('3. RPC 用户名或密码错误');
    console.error('4. 节点未完成同步');
    console.error('\n请检查 scash.conf 配置文件:');
    console.error('   server=1');
    console.error('   rpcuser=user');
    console.error('   rpcpassword=password');
    console.error('   rpcport=18443');
    console.error('');
    process.exit(1);
  }
}

// 运行测试
testScashNode();
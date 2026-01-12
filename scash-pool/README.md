# Scash 矿池 Demo

一个简单的 Scash (RandomX PoW) 矿池实现，用于学习和测试。

## 功能特性

- ✅ Stratum V1 协议支持
- ✅ 从 Scash 节点获取区块模板
- ✅ 分发挖矿任务给矿工
- ✅ 验证矿工提交的份额
- ✅ 统计有效/无效份额
- ✅ 检测满足全网难度的区块
- ✅ 提交区块到 Scash 节点
- ✅ 实时矿池统计

## 前置要求

1. **Bun**: 运行时环境
2. **Scash 节点**: 已配置并运行的 Scash 节点
3. **cpuminer-scash**: Scash 挖矿软件

## 安装

```bash
cd scash-pool
bun install
```

## 配置

编辑 `src/index.ts` 中的配置：

```typescript
// Scash 节点配置
const SCASH_CONFIG = {
  rpcUser: 'scash_user',      // 你的 RPC 用户名
  rpcPassword: 'scash_password', // 你的 RPC 密码
  rpcPort: 18443,             // 你的 RPC 端口
  rpcHost: '127.0.0.1',       // 节点地址
};

// 矿池配置
const POOL_CONFIG = {
  stratumPort: 3333,          // Stratum 监听端口
  poolDifficulty: 1.0,        // 矿池份额难度
  poolName: 'Scash Demo Pool',
};
```

## 启动矿池

```bash
bun run src/index.ts
```

## 使用矿工连接

使用 cpuminer-scash 连接到矿池：

```bash
./minerd -o stratum+tcp://127.0.0.1:3333 -u worker1 -p x
```

参数说明：
- `-o`: Stratum 服务器地址
- `-u`: 矿工用户名
- `-p`: 密码（通常用 `x` 表示不需要密码）

## 矿池输出示例

```
========================================
🚀 启动 Scash Demo Pool
========================================
Scash 节点: 127.0.0.1:18443
Stratum 端口: 3333
矿池难度: 1.0
========================================

📡 连接到 Scash 节点...
✅ 连接成功！当前区块高度: 12345

📊 挖矿信息:
   网络算力: 1234567 H/s
   当前难度: 1.234
   区块奖励: 1234

Stratum 服务器已启动，监听端口 3333

✅ 矿池已启动，等待矿工连接...

💡 使用以下命令连接矿工:
   ./minerd -o stratum+tcp://127.0.0.1:3333 -u worker1 -p x

========================================

新的矿工连接: ::1
矿工已授权: worker1
新任务已创建: 高度 12346, 难度 0x1e0fffff
✅ 有效份额: worker1 (总: 1, 区块: 0)
✅ 有效份额: worker1 (总: 2, 区块: 0)
...
🎉 发现新的区块！矿工: worker1
✅ 区块已成功提交到节点
```

## 文件结构

```
scash-pool/
├── package.json          # 项目配置
├── README.md            # 说明文档
└── src/
    ├── index.ts         # 主程序入口
    ├── types.ts         # 类型定义
    ├── randomx.ts       # RandomX 相关工具
    ├── scash-rpc.ts     # Scash 节点 RPC 客户端
    └── stratum-server.ts # Stratum 服务器实现
```

## 重要说明

### ⚠️ 这是一个演示版本

当前实现有以下限制：

1. **RandomX 验证**: 使用简化的模拟验证，实际需要集成 RandomX 库
2. **区块构建**: 使用模拟的区块数据，实际需要构建真实的区块
3. **Coinbase 交易**: 未实现真实的 coinbase 交易构建
4. **Merkle 树**: 未实现完整的 Merkle 树计算

### 📝 生产环境需要的工作

要将此矿池用于生产环境，需要：

1. **集成 RandomX 库**: 实现真实的 RandomX 哈希和 commitment 计算
2. **实现完整的区块构建**: 包括 coinbase 交易和 Merkle 树
3. **添加数据库**: 存储矿工、份额、支付记录
4. **实现支付系统**: 定期向矿工支付奖励
5. **添加认证系统**: 矿工注册和认证
6. **实现 PPLNS/PPS**: 更公平的奖励分配算法
7. **添加 Web 界面**: 矿池监控和管理界面
8. **实现负载均衡**: 支持多个节点和任务分发

## Scash 与比特币的关键区别

1. **区块头**: Scash 多 32 字节的 `hashRandomX` 字段（112 字节 vs 80 字节）
2. **PoW 算法**: RandomX 1.2.1 vs SHA-256
3. **验证**: 验证 RandomX Commitment 而不是区块哈希
4. **Epoch**: RandomX Key 每 7 天变化一次
5. **难度调整**: ASERT DAA（每区块调整）vs Bitcoin DAA（每 2016 区块调整）

## 故障排查

### 编译原生模块失败

**问题**: CMake 未找到
```bash
# Ubuntu/Debian
sudo apt-get install cmake

# macOS
brew install cmake
```

**问题**: g++ 未找到
```bash
# Ubuntu/Debian
sudo apt-get install g++

# macOS
brew install gcc
```

**问题**: 编译错误
- 检查 Scash 源码路径是否正确
- 检查 RandomX 库是否完整
- 查看 `README_NATIVE.md` 获取详细说明

### 无法连接到 Scash 节点

检查：
- Scash 节点是否正在运行
- RPC 配置是否正确
- 防火墙是否阻止连接

### 矿工无法连接

检查：
- Stratum 端口是否正确
- 防火墙是否阻止连接
- 矿工软件是否支持 Stratum V1

### 所有份额都被拒绝

可能原因：
1. 原生模块未正确编译
2. 区块头格式不正确
3. RandomX VM 初始化失败

检查日志中的错误信息，确保原生模块已正确加载。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
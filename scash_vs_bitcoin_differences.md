# Scash 与比特币的详细技术区别分析

基于对源代码的详细分析，以下是 scash 与比特币的主要区别：

---

## 1. 区块头结构

| 字段 | 大小 | Bitcoin | Scash |
|------|------|---------|-------|
| nVersion | 4 | ✓ | ✓ |
| hashPrevBlock | 32 | ✓ | ✓ |
| hashMerkleRoot | 32 | ✓ | ✓ |
| nTime | 4 | ✓ | ✓ |
| nBits | 4 | ✓ | ✓ |
| nNonce | 4 | ✓ | ✓ |
| **hashRandomX** | **32** | ✗ | ✓ (新增) |

**Scash 区块头总大小**: 112 字节（Bitcoin 是 80 字节）

**位置**: `src/primitives/block.h:31`

---

## 2. 工作量证明算法

### Bitcoin
- **算法**: SHA-256 (double SHA-256)
- **验证**: `SHA256(SHA256(block_header)) <= target`

### Scash
- **算法**: RandomX 1.2.1
- **自定义参数**: `RANDOMX_ARGON_SALT = "RandomX-Scash\x01"`
- **验证流程**:
  1. 计算 RandomX 哈希: `hashRandomX = RandomX(K, block_header_with_null_hashRandomX)`
  2. 计算 Commitment: `CM = RandomX_Commitment(block_header_with_null_hashRandomX, hashRandomX)`
  3. 验证: `CM <= target` 且 `hashRandomX` 正确

**位置**: `src/pow.cpp:600-687`

---

## 3. Epoch 和 Key 派生

### Epoch 计算
```cpp
uint32_t GetEpoch(uint32_t nTimestamp, uint32_t nDuration) {
    return nTimestamp / nDuration;
}
```

### Key 派生
```cpp
uint256 GetSeedHash(uint32_t nEpoch) {
    std::string s = strprintf("Scash/RandomX/Epoch/%d", nEpoch);
    uint256 h1, h2;
    CSHA256().Write((const unsigned char*)s.data(), s.size()).Finalize(h1.begin());
    CSHA256().Write(h1.begin(), 32).Finalize(h2.begin());
    return h2;  // 这是 RandomX 的 Key K
}
```

### Epoch 持续时间
| 网络 | 持续时间 |
|------|----------|
| Scash Mainnet | 7 天 (604800 秒) |
| Scash Testnet | 7 天 (604800 秒) |
| Scash Regtest | 1 天 (86400 秒) |

**位置**: 
- `src/pow.cpp:638-649`
- `src/kernel/chainparams.cpp:628, 730, 843`

---

## 4. 难度调整算法

### Bitcoin (Legacy DAA)
- 每 2016 个区块调整一次
- 调整幅度不超过 4 倍
- 有 off-by-one bug

### Scash
1. **Legacy DAA** (区块 21000 之前):
   - 修复了 Bitcoin 的 off-by-one bug
   - 使用 `arith_uint512` 避免溢出

2. **ASERT DAA** (区块 21000 之后):
   - 每个区块都调整难度
   - Half-life: 2 天
   - Anchor block: 高度 18144, nBits=0x1c7b9d90
   - 激活高度: 21000

**位置**: 
- `src/pow.cpp:250-400` (ASERT 计算)
- `src/kernel/chainparams.cpp:606-614` (ASERT 参数)

---

## 5. 网络参数

### Magic Bytes (网络标识)
| 网络 | Bitcoin | Scash |
|------|---------|-------|
| Mainnet | `0xf9 0xbe 0xb4 0xd9` | `0xfa 0xbf 0xb5 0xda` |
| Testnet | `0x0b 0x11 0x09 0x07` | `0x0c 0x12 0x0a 0x08` |
| Regtest | `0xfa 0xbf 0xb5 0xda` | `0xfb 0xc0 0xb6 0xdb` |

### 端口
| 网络 | Bitcoin | Scash |
|------|---------|-------|
| RPC | 8332 | 8342 |
| P2P | 8333 | 8343 |
| Tor | 8334 | 8344 |

### Bech32 地址前缀
| 网络 | Bitcoin | Scash |
|------|---------|-------|
| Mainnet | `bc` | `scash` |
| Testnet | `tb` | `tscash` |
| Regtest | `bcrt` | `rscash` |

**位置**: `src/kernel/chainparams.cpp:615-630, 733-740, 842-848`

---

## 6. PoW Limit (难度上限)

| 网络 | Bitcoin | Scash |
|------|---------|-------|
| Mainnet | `0x00000000ffff0000000000000000000000000000000000000000000000000000` | `0x00007fffff000000000000000000000000000000000000000000000000000000` |
| Testnet | `0x00000000ffff0000000000000000000000000000000000000000000000000000` | `0x00007fffff000000000000000000000000000000000000000000000000000000` |
| Regtest | `0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff` | `0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff` |

**注意**: Scash 的 PoW limit 比 Bitcoin 更高（更容易挖），因为 RandomX 是 CPU 友好的算法。

**位置**: `src/kernel/chainparams.cpp:589, 710, 826`

---

## 7. Genesis 区块

### Scash Mainnet
- 时间戳: 1708650456 (2024-02-23)
- Nonce: 20076863
- Bits: 0x1e0fffff
- hashRandomX: `33c450e0152826e3a8948b01464cf9182344a1544b3ddcf6153dd04b62938d01`
- 区块哈希: `e3bf1597a568216022dbda6a0945f09b005d19f041e7158c3cbca9d4029ee82d`

### Scash Testnet
- 时间戳: 1296688602
- Nonce: 6107
- Bits: 0x1e7fffff
- hashRandomX: `e848dddfb604a4b1783c8a38b6db5179ccd6911331f2be18bfec02522d95af86`

### Scash Regtest
- 时间戳: 1296688602
- Nonce: 1
- Bits: 0x207fffff
- hashRandomX: `177a9deba97f0dae00a6bf55e03671ec6bce7051d6a5054db49237598b803f93`

**位置**: `src/kernel/chainparams.cpp:627-632, 729-734, 842-847`

---

## 8. 交易传播规则

Scash 禁用了以下 Bitcoin 功能：

1. **Replace-by-Fee (RBF)**: 禁用 `-mempoolfullrbf` 和 `-walletrbf`
2. **Data Carrier**: 禁用 `-datacarrier`，OP_RETURN 输出不会被中继
3. **Ordinals Inscriptions**: 检测并拒绝包含 `OP_FALSE OP_IF` 或 `OP_NOTIF OP_TRUE` 的 Tapscript

**位置**: `sips/scash-protocol-spec.md:6.1-6.3`

---

## 9. JSON-RPC 扩展

Scash 在以下 RPC 端点添加了 RandomX 相关字段：

### `getblock`
- `rx_cm`: RandomX commitment 值 (hex string)
- `rx_hash`: RandomX 哈希值 (hex string)
- `rx_epoch`: Epoch 编号 (integer)

### `getblocktemplate`
- `rx_epoch_duration`: Epoch 持续时间（秒）(integer)

**位置**: `sips/scash-protocol-spec.md:8`

---

## 10. 挖矿流程差异

### Bitcoin 挖矿
```
1. 获取区块模板
2. 递增 nonce
3. 计算 SHA256(SHA256(block_header))
4. 检查 hash <= target
```

### Scash 挖矿
```
1. 获取区块模板（包含 rx_epoch_duration）
2. 计算当前 epoch: E = nTime / nRandomXEpochDuration
3. 计算 RandomX Key: K = SHA256(SHA256("Scash/RandomX/Epoch/{E}"))
4. 递增 nonce
5. 计算 hashRandomX = RandomX(K, block_header_with_null_hashRandomX)
6. 计算 CM = RandomX_Commitment(block_header_with_null_hashRandomX, hashRandomX)
7. 检查 CM <= target
8. 如果通过，设置 hashRandomX 字段并提交
```

**位置**: `cpuminer-scash/randomx-miner.c:22-100`

---

## 11. 验证模式

Scash 支持三种 PoW 验证模式：

```cpp
enum POWVerifyMode_t {
    POW_VERIFY_FULL = 0,           // 完整验证：检查 hashRandomX 和 CM
    POW_VERIFY_COMMITMENT_ONLY,    // 轻量验证：只检查 CM（用于轻客户端）
    POW_VERIFY_MINING              // 挖矿模式：计算 hashRandomX 和 CM
};
```

**位置**: `src/pow.h:63-68`

---

## 12. RandomX 性能优化

Scash 节点支持以下优化选项：

- `-randomxfastmode`: 启用快速模式（需要 2080 MiB 内存）
- `-randomxvmcachesize`: 缓存的 epoch/VM 数量（默认 2）

**位置**: `src/pow.h:71-74`

---

## 对矿池开发的关键要点

1. **Stratum 协议**: Scash 使用标准 Stratum V1 协议，但需要：
   - 在 `getblocktemplate` 响应中包含 `rx_epoch_duration`
   - 在提交的区块中包含 `hashRandomX` 字段

2. **份额验证**: 需要实现 RandomX 算法来验证矿工提交的份额

3. **难度调整**: Scash 使用 ASERT DAA，难度每个区块都会调整

4. **Epoch 管理**: 需要跟踪当前 epoch，因为 RandomX Key 会变化

5. **区块头大小**: Scash 区块头是 112 字节（Bitcoin 是 80 字节）

6. **网络标识**: 使用 Scash 特定的 magic bytes 和端口

---

## 份额验证伪代码

```go
func ValidateScashShare(blockHeader, target) bool {
    // 1. 计算 epoch
    epoch = blockHeader.Time / epochDuration
    
    // 2. 派生 Key
    seedString = fmt.Sprintf("Scash/RandomX/Epoch/%d", epoch)
    key = SHA256(SHA256(seedString))
    
    // 3. 计算 RandomX hash
    blockHeaderWithNullHashRandomX = blockHeader
    blockHeaderWithNullHashRandomX.hashRandomX = 0
    rxHash = RandomX_CalculateHash(key, blockHeaderWithNullHashRandomX)
    
    // 4. 计算 Commitment
    commitment = RandomX_CalculateCommitment(blockHeaderWithNullHashRandomX, rxHash)
    
    // 5. 检查是否满足目标
    return commitment <= target
}
```

---

## RandomX 哈希计算详细流程

### 输入
- Key K (32 字节): 从 epoch 派生
- 区块头 H (112 字节): hashRandomX 字段设为 0

### 输出
- hashRandomX (32 字节)

### 步骤
1. 计算 epoch: `E = nTime / nRandomXEpochDuration`
2. 生成种子字符串: `S = "Scash/RandomX/Epoch/{E}"`
3. 派生 Key: `K = SHA256(SHA256(S))`
4. 初始化 RandomX VM (使用 Key K)
5. 执行 RandomX 哈希: `R = RandomX_VM(K, H)`
6. 返回 R 作为 hashRandomX

---

## RandomX Commitment 计算详细流程

### 输入
- hashRandomX (32 字节)
- 区块头 H (112 字节): hashRandomX 字段设为 0

### 输出
- Commitment CM (32 字节)

### 步骤
1. 使用 hashRandomX 和区块头 H 计算 commitment
2. `CM = RandomX_Commitment(H, hashRandomX)`
3. 返回 CM

---

## ASERT DAA 详细说明

### 公式
```
new_target = old_target * 2^((blocks_time - IDEAL_BLOCK_TIME * (height_diff + 1)) / nHalfLife)
```

### 参数
- `nHalfLife`: 2 天 (172800 秒)
- `IDEAL_BLOCK_TIME`: 600 秒 (10 分钟)
- `anchor_block_height`: 18144
- `anchor_block_nBits`: 0x1c7b9d90
- `anchor_prev_block_time`: 1712987784

### 特性
- 每个区块都调整难度
- 使用指数加权，响应更快
- 能够快速适应算力变化
- 防止时间扭曲攻击

---

## 参考资料

- Scash 协议规范: `sips/scash-protocol-spec.md`
- Scash 挖矿软件: `cpuminer-scash/`
- Scash 核心代码: `scash/src/`
- ASERT DAA 参考: https://reference.cash/protocol/forks/2020-11-15-asert
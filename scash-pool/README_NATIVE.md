# 编译原生 RandomX 模块

## 为什么需要原生模块？

Scash 使用 RandomX 算法进行工作量证明验证。为了实现真实的份额验证，需要调用 RandomX C++ 库。TypeScript/JavaScript 无法直接调用 C++ 代码，因此需要编译原生模块。

## 编译步骤

### 1. 安装依赖

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y cmake g++ make
```

**macOS:**
```bash
brew install cmake gcc make
```

### 2. 编译原生模块

```bash
cd scash-pool
./build-native.sh
```

编译成功后会生成 `native/build/libscash_native.so` 文件。

### 3. 启动矿池

```bash
bun run src/index.ts
```

## 编译输出

成功编译后会生成以下文件：

```
native/build/
├── libscash_native.so   # 主共享库
├── librandomx.a         # RandomX 静态库
└── CMakeFiles/          # CMake 构建文件
```

## 故障排查

### CMake 未找到

```bash
# Ubuntu/Debian
sudo apt-get install cmake

# macOS
brew install cmake
```

### g++ 未找到

```bash
# Ubuntu/Debian
sudo apt-get install g++

# macOS
brew install gcc
```

### 编译错误

如果遇到编译错误，请检查：

1. Scash 源码路径是否正确
2. RandomX 库是否完整
3. CMake 版本是否 >= 3.10

## 原生模块功能

编译后的原生模块提供以下函数：

### `verify_share(header_hex, target_hex, epoch_duration)`

验证矿工提交的份额。

**参数:**
- `header_hex`: 区块头 hex 字符串 (224 字符 = 112 字节)
- `target_hex`: 目标难度 hex 字符串 (64 字符 = 32 字节)
- `epoch_duration`: epoch 持续时间（秒）

**返回值:**
- `1`: 份额有效且满足目标难度
- `0`: 份额有效但不满足目标难度
- `-1`: 份额无效

### `cleanup_randomx()`

清理 RandomX VM 和 cache 资源。

### `calculate_epoch(timestamp, duration)`

计算 epoch 编号。

### `calculate_seed_hash(epoch, output)`

计算 RandomX seed hash。

## RandomX 验证流程

1. **计算 Epoch**: `E = timestamp / epoch_duration`
2. **派生 Key**: `K = SHA256(SHA256("Scash/RandomX/Epoch/{E}"))`
3. **初始化 VM**: 使用 Key K 创建 RandomX VM
4. **计算 Hash**: `hashRandomX = RandomX(K, block_header_with_null_hashRandomX)`
5. **计算 Commitment**: `CM = RandomX_Commitment(block_header_with_null_hashRandomX, hashRandomX)`
6. **比较**: 检查 `CM <= target`

## 性能优化

- **VM 缓存**: 缓存多个 epoch 的 VM，避免重复初始化
- **快速模式**: 使用 `RANDOMX_FLAG_FULL_MEM` 启用快速模式（需要更多内存）
- **批量验证**: 支持批量验证多个份额

## 内存需求

- **Light 模式**: ~256 MB
- **Fast 模式**: ~2080 MB

默认使用 Light 模式以节省内存。

## 注意事项

1. **线程安全**: RandomX VM 不是线程安全的，每个线程需要独立的 VM
2. **Epoch 切换**: 当 epoch 变化时，需要重新初始化 VM
3. **资源清理**: 程序退出时调用 `cleanup_randomx()` 释放资源

## 开发调试

### 查看编译输出

```bash
cd native/build
cmake .. -DCMAKE_BUILD_TYPE=Debug
make VERBOSE=1
```

### 测试原生模块

```bash
# 编译测试程序
g++ -o test_verify test_verify.cpp -L. -lscash_native -lpthread

# 运行测试
LD_LIBRARY_PATH=. ./test_verify
```

## 更新 RandomX 版本

如果需要更新 RandomX 版本：

1. 从 https://github.com/scashnetwork/RandomX 获取最新代码
2. 替换 `native/randomx/` 目录下的文件
3. 重新编译：`./build-native.sh`

## 许可证

RandomX 使用 GPL 3.0 许可证。
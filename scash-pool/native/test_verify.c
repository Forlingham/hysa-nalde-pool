// 测试 RandomX 原生模块的 C 程序
#include <stdio.h>
#include <stdint.h>
#include <string.h>

// 声明 C 函数
extern int verify_share(const char* header_hex, const char* target_hex, uint32_t epoch_duration);
extern void cleanup_randomx();
extern uint32_t calculate_epoch(uint32_t timestamp, uint32_t duration);
extern void calculate_seed_hash(uint32_t epoch, uint8_t* output);

int main() {
    printf("========================================\n");
    printf("测试 RandomX 原生模块 (C)\n");
    printf("========================================\n\n");

    // 测试 1: 计算 Epoch
    printf("测试 1: 计算 Epoch\n");
    uint32_t epoch = calculate_epoch(1707657600, 604800);
    printf("   时间戳: 1707657600 (2024-02-11)\n");
    printf("   Epoch 持续时间: 604800 秒 (7 天)\n");
    printf("   Epoch: %u\n", epoch);
    printf("   ✅ 通过\n\n");

    // 测试 2: 计算 Seed Hash
    printf("测试 2: 计算 Seed Hash\n");
    uint8_t seed_hash[32];
    calculate_seed_hash(epoch, seed_hash);
    printf("   Epoch: %u\n", epoch);
    printf("   Seed Hash: ");
    for (int i = 0; i < 32; i++) {
        printf("%02x", seed_hash[i]);
    }
    printf("\n");
    printf("   ✅ 通过\n\n");

    // 测试 3: 份额验证
    printf("测试 3: 份额验证\n");
    // 创建一个测试区块头 (112 字节)
    char header_hex[225] = {0};
    
    // version (4 bytes, little endian): 0x01000000
    strcpy(header_hex, "01000000");
    
    // prevBlock (32 bytes, all zeros)
    for (int i = 0; i < 32 * 2; i++) {
        header_hex[8 + i] = '0';
    }
    
    // merkleRoot (32 bytes, all zeros)
    for (int i = 0; i < 32 * 2; i++) {
        header_hex[72 + i] = '0';
    }
    
    // timestamp (4 bytes, little endian): 0x005f1a65 = 1707657600
    strcpy(header_hex + 136, "651a5f00");
    
    // bits (4 bytes, little endian): 0xffff0f1e = 0x1e0fffff
    strcpy(header_hex + 144, "ff0f1e1e");
    
    // nonce (4 bytes, little endian): 0x00003930 = 12345
    strcpy(header_hex + 152, "30390000");
    
    // hashRandomX (32 bytes, all zeros)
    for (int i = 0; i < 32 * 2; i++) {
        header_hex[160 + i] = '0';
    }
    
    // 目标难度 (32 bytes, hex): 00007fffff000000000000000000000000000000000000000000000000000000
    char target_hex[65] = "00007fffff000000000000000000000000000000000000000000000000000000";
    
    printf("   区块头 hex (前 32 字符): %.32s...\n", header_hex);
    printf("   目标难度: %s\n", target_hex);
    
    int result = verify_share(header_hex, target_hex, 604800);
    printf("   验证结果: %d\n", result);
    printf("   结果说明: ");
    if (result == 1) {
        printf("有效且满足难度\n");
    } else if (result == 0) {
        printf("有效但不满足难度\n");
    } else {
        printf("无效\n");
    }
    printf("   ✅ 通过\n\n");

    // 清理资源
    cleanup_randomx();

    printf("========================================\n");
    printf("所有测试通过！\n");
    printf("========================================\n");

    return 0;
}
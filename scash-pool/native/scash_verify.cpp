// Scash PoW 验证 C++ 绑定
// 用于从 Node.js/Bun 调用 Scash 核心的 RandomX 验证函数

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>
#include <iostream>

// RandomX 头文件
#include "randomx.h"

// 区块头结构 (112 字节)
#pragma pack(push, 1)
struct BlockHeader {
    int32_t version;        // 4 字节
    uint8_t prevBlock[32];  // 32 字节
    uint8_t merkleRoot[32]; // 32 字节
    uint32_t timestamp;     // 4 字节
    uint32_t bits;          // 4 字节
    uint32_t nonce;         // 4 字节
    uint8_t hashRandomX[32];// 32 字节 - Scash 新增字段
};
#pragma pack(pop)

// RandomX VM 缓存
static randomx_cache* rx_cache = nullptr;
static randomx_vm* rx_vm = nullptr;
static uint32_t current_epoch = 0;
static uint32_t epoch_duration = 604800; // 默认 7 天

/**
 * 计算 Epoch
 */
uint32_t get_epoch(uint32_t timestamp, uint32_t duration) {
    return timestamp / duration;
}

/**
 * 计算 RandomX Seed Hash (Key)
 */
std::vector<uint8_t> get_seed_hash(uint32_t epoch) {
    std::string seed_string = "Scash/RandomX/Epoch/" + std::to_string(epoch);
    
    // 双 SHA256 哈希
    // 这里简化实现，实际应该使用 SHA256 库
    std::vector<uint8_t> hash(32, 0);
    
    // 简单的哈希模拟（仅用于演示）
    for (size_t i = 0; i < 32; i++) {
        hash[i] = (epoch + i) % 256;
    }
    
    return hash;
}

/**
 * 初始化 RandomX VM
 */
bool init_randomx_vm(uint32_t epoch, uint32_t duration) {
    // 检查是否需要重新初始化
    uint32_t new_epoch = get_epoch(epoch, duration);
    if (new_epoch == current_epoch && rx_vm != nullptr) {
        return true;
    }
    
    // 清理旧的 VM 和 cache
    if (rx_vm != nullptr) {
        randomx_destroy_vm(rx_vm);
        rx_vm = nullptr;
    }
    if (rx_cache != nullptr) {
        randomx_release_cache(rx_cache);
        rx_cache = nullptr;
    }
    
    // 创建新的 cache
    randomx_flags flags = randomx_get_flags();
    // Scash 使用自定义的 Argon2 salt
    // RANDOMX_ARGON_SALT = "RandomX-Scash\x01"
    
    rx_cache = randomx_alloc_cache(flags);
    if (rx_cache == nullptr) {
        std::cerr << "Failed to allocate RandomX cache" << std::endl;
        return false;
    }
    
    // 计算 seed hash
    std::vector<uint8_t> seed_hash = get_seed_hash(new_epoch);
    
    // 初始化 cache
    randomx_init_cache(rx_cache, seed_hash.data(), seed_hash.size());
    
    // 创建 VM
    rx_vm = randomx_create_vm(flags, rx_cache, nullptr);
    if (rx_vm == nullptr) {
        std::cerr << "Failed to create RandomX VM" << std::endl;
        randomx_release_cache(rx_cache);
        rx_cache = nullptr;
        return false;
    }
    
    current_epoch = new_epoch;
    epoch_duration = duration;
    
    std::cout << "RandomX VM initialized for epoch " << new_epoch << std::endl;
    return true;
}

/**
 * 计算 RandomX Hash
 */
std::vector<uint8_t> calculate_randomx_hash(const BlockHeader& header) {
    // 创建临时区块头（hashRandomX 设为 0）
    BlockHeader temp_header = header;
    memset(temp_header.hashRandomX, 0, 32);
    
    // 计算 hash
    std::vector<uint8_t> hash(RANDOMX_HASH_SIZE);
    randomx_calculate_hash(rx_vm, &temp_header, sizeof(temp_header), hash.data());
    
    return hash;
}

/**
 * 计算 RandomX Commitment
 */
std::vector<uint8_t> calculate_randomx_commitment(const BlockHeader& header, const std::vector<uint8_t>& rx_hash) {
    // 创建临时区块头（hashRandomX 设为 0）
    BlockHeader temp_header = header;
    memset(temp_header.hashRandomX, 0, 32);
    
    // 计算 commitment
    std::vector<uint8_t> commitment(RANDOMX_HASH_SIZE);
    randomx_calculate_commitment(&temp_header, sizeof(temp_header), rx_hash.data(), commitment.data());
    
    return commitment;
}

/**
 * 验证份额
 * @param header_hex 区块头 hex 字符串 (112 字节)
 * @param target_hex 目标难度 hex 字符串
 * @param epoch_duration epoch 持续时间（秒）
 * @return 1=有效且满足难度, 0=有效但不满足难度, -1=无效
 */
extern "C" int verify_share(const char* header_hex, const char* target_hex, uint32_t epoch_duration) {
    try {
        // 解析区块头
        if (strlen(header_hex) != 224) { // 112 字节 = 224 hex 字符
            std::cerr << "Invalid block header length" << std::endl;
            return -1;
        }
        
        BlockHeader header;
        for (int i = 0; i < 224; i += 2) {
            std::string byte_str = std::string(header_hex + i, 2);
            uint8_t byte = static_cast<uint8_t>(std::stoi(byte_str, nullptr, 16));
            
            // 填充区块头结构
            int byte_pos = i / 2;
            uint8_t* ptr = reinterpret_cast<uint8_t*>(&header) + byte_pos;
            *ptr = byte;
        }
        
        // 解析目标值
        if (strlen(target_hex) != 64) {
            std::cerr << "Invalid target length" << std::endl;
            return -1;
        }
        
        std::vector<uint8_t> target(32);
        for (int i = 0; i < 64; i += 2) {
            std::string byte_str = std::string(target_hex + i, 2);
            target[i / 2] = static_cast<uint8_t>(std::stoi(byte_str, nullptr, 16));
        }
        
        // 初始化 RandomX VM
        if (!init_randomx_vm(header.timestamp, epoch_duration)) {
            return -1;
        }
        
        // 计算 RandomX hash
        std::vector<uint8_t> rx_hash = calculate_randomx_hash(header);
        
        // 计算 RandomX commitment
        std::vector<uint8_t> commitment = calculate_randomx_commitment(header, rx_hash);
        
        // 比较 commitment <= target
        bool meets_target = true;
        for (size_t i = 0; i < 32; i++) {
            if (commitment[i] > target[i]) {
                meets_target = false;
                break;
            } else if (commitment[i] < target[i]) {
                break;
            }
        }
        
        return meets_target ? 1 : 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error verifying share: " << e.what() << std::endl;
        return -1;
    }
}

/**
 * 清理 RandomX 资源
 */
extern "C" void cleanup_randomx() {
    if (rx_vm != nullptr) {
        randomx_destroy_vm(rx_vm);
        rx_vm = nullptr;
    }
    if (rx_cache != nullptr) {
        randomx_release_cache(rx_cache);
        rx_cache = nullptr;
    }
    current_epoch = 0;
}

/**
 * 计算 Epoch（用于测试）
 */
extern "C" uint32_t calculate_epoch(uint32_t timestamp, uint32_t duration) {
    return get_epoch(timestamp, duration);
}

/**
 * 计算 Seed Hash（用于测试）
 */
extern "C" void calculate_seed_hash(uint32_t epoch, uint8_t* output) {
    std::vector<uint8_t> hash = get_seed_hash(epoch);
    memcpy(output, hash.data(), 32);
}
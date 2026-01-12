#!/bin/bash
# 编译 Scash 矿池原生模块

set -e

echo "========================================"
echo "编译 Scash 矿池原生模块"
echo "========================================"

# 检查依赖
echo "🔍 检查依赖..."

if ! command -v cmake &> /dev/null; then
    echo "❌ CMake 未安装，请先安装 CMake"
    echo "   Ubuntu/Debian: sudo apt-get install cmake"
    echo "   macOS: brew install cmake"
    exit 1
fi

if ! command -v g++ &> /dev/null; then
    echo "❌ g++ 未安装，请先安装 g++"
    echo "   Ubuntu/Debian: sudo apt-get install g++"
    echo "   macOS: brew install gcc"
    exit 1
fi

echo "✅ 依赖检查完成"
echo ""

# 进入 native 目录
cd "$(dirname "$0")/native"

# 创建构建目录
if [ ! -d "build" ]; then
    echo "📁 创建构建目录..."
    mkdir build
fi

cd build

# 运行 CMake
echo "🔧 运行 CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release

# 编译
echo "🔨 编译原生模块..."
make -j$(nproc)

# 检查编译结果
if [ -f "libscash_native.so" ]; then
    echo "✅ 编译成功！"
    echo "   输出文件: build/libscash_native.so"
else
    echo "❌ 编译失败"
    exit 1
fi

echo ""
echo "========================================"
echo "编译完成！"
echo "========================================"
echo ""
echo "💡 现在可以启动矿池了："
echo "   cd .. && bun run src/index.ts"
echo ""
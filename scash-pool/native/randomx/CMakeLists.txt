cmake_minimum_required(VERSION 3.10)
project(randomx)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

# 使用绝对路径发现源文件
set(RANDOMX_SRC_DIR "${CMAKE_CURRENT_SOURCE_DIR}/src")

# 手动列出所有源文件（不包含汇编文件）
set(RANDOMX_SOURCES
    ${RANDOMX_SRC_DIR}/aes_hash.cpp
    ${RANDOMX_SRC_DIR}/allocator.cpp
    ${RANDOMX_SRC_DIR}/argon2_avx2.c
    ${RANDOMX_SRC_DIR}/argon2_core.c
    ${RANDOMX_SRC_DIR}/argon2_ref.c
    ${RANDOMX_SRC_DIR}/argon2_ssse3.c
    ${RANDOMX_SRC_DIR}/assembly_generator_x86.cpp
    ${RANDOMX_SRC_DIR}/blake2_generator.cpp
    ${RANDOMX_SRC_DIR}/blake2/blake2b.c
    ${RANDOMX_SRC_DIR}/bytecode_machine.cpp
    ${RANDOMX_SRC_DIR}/cpu.cpp
    ${RANDOMX_SRC_DIR}/dataset.cpp
    ${RANDOMX_SRC_DIR}/instruction.cpp
    ${RANDOMX_SRC_DIR}/instructions_portable.cpp
    # JIT 编译器（使用解释模式，但需要汇编文件中的符号）
    ${RANDOMX_SRC_DIR}/jit_compiler_x86.cpp
    ${RANDOMX_SRC_DIR}/randomx.cpp
    ${RANDOMX_SRC_DIR}/reciprocal.c
    ${RANDOMX_SRC_DIR}/soft_aes.cpp
    ${RANDOMX_SRC_DIR}/superscalar.cpp
    ${RANDOMX_SRC_DIR}/virtual_machine.cpp
    ${RANDOMX_SRC_DIR}/virtual_memory.c
    ${RANDOMX_SRC_DIR}/vm_compiled.cpp
    ${RANDOMX_SRC_DIR}/vm_compiled_light.cpp
    ${RANDOMX_SRC_DIR}/vm_interpreted.cpp
    ${RANDOMX_SRC_DIR}/vm_interpreted_light.cpp
)

message(STATUS "RandomX source directory: ${RANDOMX_SRC_DIR}")
message(STATUS "Using interpreter mode (no JIT)")

# 手动编译汇编文件
add_custom_command(
    OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/jit_compiler_x86_static.o
    COMMAND gcc -c ${RANDOMX_SRC_DIR}/jit_compiler_x86_static.S
        -I${CMAKE_CURRENT_SOURCE_DIR}/src
        -I${CMAKE_CURRENT_SOURCE_DIR}/src/asm
        -o ${CMAKE_CURRENT_BINARY_DIR}/jit_compiler_x86_static.o
    DEPENDS ${RANDOMX_SRC_DIR}/jit_compiler_x86_static.S
    VERBATIM
)

# 创建包含汇编文件的库
add_library(randomx STATIC ${RANDOMX_SOURCES} ${CMAKE_CURRENT_BINARY_DIR}/jit_compiler_x86_static.o)

target_include_directories(randomx PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/asm
)

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_options(randomx PRIVATE -O3)
endif()

# 添加 C++ 标准定义
target_compile_definitions(randomx PRIVATE __STDC_LIMIT_MACROS)

# 添加 -fPIC 以支持共享库
set_target_properties(randomx PROPERTIES
    POSITION_INDEPENDENT_CODE ON
)
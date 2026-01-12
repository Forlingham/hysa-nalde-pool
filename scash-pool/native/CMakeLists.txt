cmake_minimum_required(VERSION 3.10)
project(scash-pool-native)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

# 添加 RandomX 子目录
add_subdirectory(randomx)

# 添加 Scash 验证库
add_library(scash_native SHARED
    scash_verify.cpp
)

# 包含目录
target_include_directories(scash_native PRIVATE
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/randomx/include
    ${CMAKE_SOURCE_DIR}/randomx/src
)

# 链接 RandomX 库
target_link_libraries(scash_native PRIVATE randomx)

# 链接系统库
find_package(Threads REQUIRED)
target_link_libraries(scash_native PRIVATE Threads::Threads)

# 编译选项
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_options(scash_native PRIVATE -O3)
    target_compile_options(scash_native PRIVATE -fPIC)
endif()

# 添加 C++ 标准定义
target_compile_definitions(scash_native PRIVATE __STDC_LIMIT_MACROS)

# 设置输出名称
set_target_properties(scash_native PROPERTIES
    OUTPUT_NAME "scash_native"
    VERSION 1.0.0
    SOVERSION 1
)
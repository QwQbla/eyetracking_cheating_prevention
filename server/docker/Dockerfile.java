# Dockerfile for Java code execution
FROM openjdk:17-jdk-slim

# 设置工作目录
WORKDIR /workspace

# 创建非特权用户
RUN useradd -m -u 1000 runner && \
    chown -R runner:runner /workspace

USER runner

# 默认命令
CMD ["java"]


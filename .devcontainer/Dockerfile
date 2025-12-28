FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

# Basic build tools and utilities
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    jq \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x (required for Claude CLI and web dev)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user with sudo access
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Remove default ubuntu user if it exists (uses UID 1000 in Ubuntu 24.04)
RUN userdel -r ubuntu 2>/dev/null || true \
    && groupdel ubuntu 2>/dev/null || true \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/bash \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME
ENV HOME=/home/$USERNAME
WORKDIR /workspace

CMD ["/bin/bash"]

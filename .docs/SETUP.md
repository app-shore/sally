# REST-OS Setup Guide

Complete setup instructions for REST-OS (Route Planning Platform with intelligent HOS compliance).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Setup](#manual-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: 20.0.0 or higher
  ```bash
  node --version  # Should be v20.x.x or higher
  ```

- **npm**: 10.0.0 or higher (comes with Node.js)
  ```bash
  npm --version   # Should be 10.x.x or higher
  ```

- **Python**: 3.11 or higher
  ```bash
  python --version  # Should be 3.11.x or higher
  ```

- **UV Package Manager**: Latest version
  ```bash
  # Install UV
  curl -LsSf https://astral.sh/uv/install.sh | sh

  # Verify installation
  uv --version
  ```

- **Docker & Docker Compose** (for Docker setup)
  ```bash
  docker --version
  docker-compose --version
  ```

- **PostgreSQL**: 16 or higher (for manual setup)
- **Redis**: 7 or higher (for manual setup)

### Optional Tools

- **Git**: For version control
- **VS Code**: Recommended IDE
- **Postman**: For API testing

---

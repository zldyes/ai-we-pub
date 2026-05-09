# AI 公众号助手

基于 [Wails](https://wails.io) 构建的桌面应用，用于 AI 辅助生成公众号文章并一键发布。

## 功能

- **AI 写文章** — 对接 DeepSeek API，根据主题和风格自动生成文章
- **图片搜索** — 集成 Unsplash / Pexels / Pixabay 等图库，自动配图
- **一键发布** — 支持微信公众平台草稿/发布
- **定时任务** — 按 cron 表达式定时生成并发布文章
- **本地存储** — 使用 SQLite 保存配置、文章历史、任务记录

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `UNSPLASH_API_KEY` | Unsplash API 密钥 |
| `PEXELS_API_KEY` | Pexels API 密钥 |
| `PIXABAY_API_KEY` | Pixabay API 密钥 |
| `WECHAT_APP_ID` | 微信公众平台 AppID |
| `WECHAT_APP_SECRET` | 微信公众平台 AppSecret |

> 也可以在应用内「设置」页面直接填写保存。

## 开发

```bash
# 安装前端依赖
cd frontend && npm install

# 启动开发模式（热重载）
wails dev
```

## 构建

```bash
wails build
```

构建产物位于 `build/bin/` 目录。

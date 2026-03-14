# I Ching

一个基于 React + Express 的六爻起卦应用。

## 配置

复制 `.env.example` 为 `.env`，并填写服务端环境变量：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
```

说明：

- `OPENAI_API_KEY` 只在服务端使用，不再暴露给浏览器。
- 前端统一调用 `/api/interpret`，由服务端转发到 OpenAI 兼容接口。

## 本地开发

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- Vite 前端开发服务器：`http://localhost:3000`
- Express API 服务：`http://localhost:3001`

## 生产构建

```bash
npm run build
npm run start
```

生产模式下，Express 会同时提供静态前端资源和 `/api/interpret` 接口。

## 当前实现

- 解卦 prompt 会注入本卦卦辞、动爻爻辞、变卦卦辞和对应变爻信息。
- 自动起卦与手动起卦共用同一套起爻逻辑和动画节奏。
- 历史记录默认只保留最近 50 条，列表存摘要，全文按展开时读取。

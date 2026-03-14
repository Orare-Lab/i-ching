# I Ching

一个基于 React + Express 的六爻起卦应用。

## 配置

复制 `.env.example` 为 `.env`，并填写服务端环境变量：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
OPENAI_API_PATH=/chat/completions
OPENAI_API_STYLE=chat
SESSION_SECRET=replace_with_a_long_random_string
INVITE_CODES=demo-invite-1,demo-invite-2
```

说明：

- `OPENAI_API_KEY` 只在服务端使用，不再暴露给浏览器。
- 前端统一调用 `/api/interpret`，由服务端转发到 OpenAI 兼容接口。
- `OPENAI_API_PATH` 用于指定上游接口路径，例如 `/chat/completions` 或 `/responses`。
- `OPENAI_API_STYLE` 用于指定请求/响应格式，支持 `chat` 和 `responses`；留空时会按 `OPENAI_API_PATH` 自动推断。
- `INVITE_CODES` 是逗号分隔的邀请码白名单；只有兑换成功的会话才能调用解卦接口。
- `SESSION_SECRET` 用于签发访问会话，生产环境请设置为独立随机字符串。

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

如果部署到 Vercel，`/api/interpret` 由 [api/interpret.js](/Users/wangkaixuan/Coding/i-ching/api/interpret.js) 提供；记得在 Vercel 项目里配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。

Vercel 部署说明：

- 项目根目录保持为仓库根目录。
- 构建命令使用 `npm run build`。
- 前端输出目录是 `dist`。
- `api/*.ts` 会作为 Vercel Functions 部署。
- 需要在 Vercel 项目环境变量里配置：
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
  - `OPENAI_API_PATH`
  - `OPENAI_API_STYLE`
  - `SESSION_SECRET`
  - `INVITE_CODES`

如果首页提示无法确认登录状态，直接访问 `/api/me`，前端现在也会显示该接口的真实状态码和响应内容，便于判断是 `404` 还是 `500`。

## 当前实现

- 解卦 prompt 会注入本卦卦辞、动爻爻辞、变卦卦辞和对应变爻信息。
- 自动起卦与手动起卦共用同一套起爻逻辑和动画节奏。
- 历史记录默认只保留最近 50 条，列表存摘要，全文按展开时读取。
- 站点已支持邀请码访问控制；未通过邀请码验证时不能调用 `/api/interpret`。

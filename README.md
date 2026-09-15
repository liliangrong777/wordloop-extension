# 默默背单词

浏览器插件：划词收藏，之后在英文网页里再次高亮这些词。产品说明见 `docs/`。

当前实现了离线闭环（Onboarding、收藏、高亮、词表、导入）。邮箱登录和云同步还未接。

## 开发

```bash
pnpm install
pnpm dev
```

Chrome 打开 `chrome://extensions`，打开开发者模式，加载 `apps/extension/.output/chrome-mv3-dev`。

Edge：

```bash
pnpm dev:edge
```

加载 `apps/extension/.output/edge-mv3-dev`。

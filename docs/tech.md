# 技术选型

配套：`mvp.md` 看做什么，本文看怎么做。方案已定为 **A：WXT 插件 + Next.js 后端，部署在国内服务器**。

## 结论

WXT 和 Next.js 不是二选一，各管一层：

- **插件（WXT）**：划词、本机词表、页面高亮、提醒、求评弹层。再遇见发生在别人的网页上，必须是 MV3 扩展。
- **网站 + 后端（Next.js）**：邮箱登录、词表云同步、商店用的隐私政策页。
- **部署**：国内机器，`next start` + Nginx HTTPS。不用 Vercel，避免国内访问和以后若加回微信时的回调问题。

有 WXT 使用经验，插件侧不换框架。不用 Next 硬输出成插件，也不用 Plasmo。

## 为什么不用「全部 Next.js」

高亮依赖 content script、`chrome.storage`、background。Next 的 App Router / SSR 在页面脚本里跑不起来。Next 只做站点与 API，不替代 WXT。

## 分层

| 层 | 选型 | 职责 |
|---|---|---|
| 插件 | WXT + React（或沿用以前的 WXT 技术栈） | content / background / popup；Chrome + Edge 同一套 |
| 本机数据 | `chrome.storage.local` | 未登录也能收藏、高亮 |
| 登录站 + API | Next.js Route Handlers | 邮箱验证码、token、词表 CRUD、同步 |
| 词典 / 发音 | 插件内免费数据或免费 API | 不走自建后端 |
| 共享类型 | 可后续加 `packages/shared` | Word、SyncPayload |

仓库按 monorepo 切：`apps/extension`（WXT）+ `apps/web`（Next）。第一期 web 只服务登录和同步，不做第二套背单词前台。

## 数据：本机是主，接口是同步

登录后单词要进云，插件会调接口。但每次划词、每次高亮不依赖网络。

1. 划词 → 写入 `chrome.storage.local` → 页面立刻能高亮
2. 已登录 → background `POST /api/words`（失败进待同步队列，下次重试）
3. 刚登录 / 换设备 → `POST /api/words/sync`：先推本地未上传，再拉云端合并

高亮只读本机词表。接口服务的是云备份和多设备，不是每一次遇见。

## 登录（已简化）

原先考虑微信扫码。标准网站应用要开放平台和主体；个人变通又要挂小程序。MVP 只为同步词表，不值得先养微信生态。

**MVP：邮箱 + 6 位验证码。**

1. 插件弹层输入邮箱，请求验证码
2. Next 发信（腾讯云 / 阿里云邮件等）
3. 用户提交验证码，服务端发 `token`
4. `token` 存 `chrome.storage.local`，同步接口带 `Authorization`

规则：

- 登录为了同步，不为开门；未登录必须能收藏和高亮
- 不在 Onboarding 里强制登录
- 不做微信、短信、Google
- 备选（连发信都不想接）：账号 + 密码，代价是以后要做忘记密码

以后若有主体、要做社群或小程序，再加微信为「多一种登录」。用户表先留 `user_id` + `email`，微信字段空着。

不要用的：`chrome.identity` 走 Google、开放平台扫码、小程序码跳板。

## 第一期接口

| 接口 | 谁用 | 做什么 |
|---|---|---|
| `POST /api/auth/email/send` | 插件弹层 | 发验证码 |
| `POST /api/auth/email/verify` | 插件弹层 | 换 token |
| `GET /api/me` | 插件 | 当前用户 |
| `GET /api/words` | 插件（已登录） | 拉云端词表 |
| `POST /api/words` | 插件（已登录） | 增词 |
| `DELETE /api/words/:id` | 插件（已登录） | 删词 |
| `POST /api/words/sync` | 插件（登录瞬间、定时） | 本地和云对账 |
| 隐私政策页 | 人 / 商店 | 上架用 |

导入：插件本地先解析 txt/csv，再按增词上传，不单独做巨大上传接口。

词典、发音、高亮不走自建后端。

CORS：只允许扩展和自己的域名。Token 不要长期暴露给任意网页。

## 明确不选

- 只用 Next、再「输出成插件」
- 插件里上 Next 全栈，content script 另写一套
- 第一期同时做官网词表 + 插件两套 UI
- Plasmo（已有 WXT，换框架无收益）
- 为登录先做微信开放平台 / 小程序

## 预算含义

1 万为爱发电里，先留：域名、国内服务器、HTTPS、邮件发送。不再为微信认证和小程序预留工期。登录仍有成本，但比扫码回跳轻。

建议实现顺序：先做 WXT 离线闭环（Onboarding → 划词 → 高亮 → 词表 → 导入），再接 Next 邮箱登录和同步。不要让登录挡「再遇见」的验证。

## 还没拍板

- token 用 JWT 还是服务端 session
- 本地和云冲突时以谁为准（倾向：同一词按最新更新时间；删除单独记 tombstone）
- 未登录词表在登录后如何合并进该邮箱
- 免费词典具体用哪一套
- WXT 里 UI 用 React 还是沿用以往习惯

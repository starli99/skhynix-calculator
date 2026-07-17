股票看板升级包

上传到 GitHub 仓库根目录：
1. index.html（覆盖）
2. app.js
3. stock.html
4. stock.js
5. styles.css
6. config.js（可覆盖，Worker 地址已经保留）
7. worker-example.js（仅作为 Cloudflare Worker 升级参考，不会被网页自动执行）

重要：
- 请先把仓库当前 index.html 另存为 hynix.html，这样首页中的“原版换算器”仍然可打开。
- 然后把本包中的 index.html 上传并覆盖。
- Cloudflare Worker 需要增加 /api/quotes?symbols=... 和 /api/history 接口。
- worker-example.js 使用 Yahoo Finance 非官方接口作为港美股和日K备用，可能失效或限流；页面会明确显示失败，不会伪造数据。
- 韩股海力士可继续保留你当前 Worker 已验证的实时来源，并在 Worker 中优先处理 000660.KS。

iPhone GitHub 操作：
仓库 → Add file → Upload files → 选择本包解压后的文件 → Commit changes。

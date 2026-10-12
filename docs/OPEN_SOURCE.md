# GitHub 开源发布准备

V0.12 使用干净源码快照发布于 https://github.com/huangkang9/zhujian-studio 。项目简介：`Local-first bilingual floor plan editor with CAD export and 3D furnishing.`

## 使用干净快照创建仓库

解压本版源码 ZIP，在解压后的项目目录初始化一个新仓库。不要直接公开原开发仓库或复用旧 `.git`：旧历史可能仍保留已删除的私人图片及读图数据。当前包不包含 Git 历史、旧图片、个人识别 JSON、部署项目标识、密钥、node_modules 或构建缓存。仅保留不含项目标识的中性托管配置，方便类型检查；部署到自己的平台时再配置自己的项目。

```sh
git init -b main
git add .
git commit -m "Initial open-source release"
```

上述步骤用于创建独立的新仓库。维护当前仓库时，请先克隆 https://github.com/huangkang9/zhujian-studio ，再提交与推送后续修改。源码公开不改变原托管演示网站的访问范围。

## 运行与验证

Node.js 22.13+：`npm start`，打开 `http://localhost:8080`。本地运行不需要安装 npm 依赖；AI 需自行配置。测试与开发先执行 `npm ci`，再运行 `npm test`、`npm run typecheck`。

仅静态演示可托管 `public/studio` 整个目录，保留相对路径。GitHub Pages 本身不能运行 Node 服务，实时 `/api/recognize` 需另行部署兼容后端；无后端时本地编辑、三维、导出及教学示例可用。不要把 API Key 写进静态网页。

## 许可证与素材

原创代码、原创示例和程序化家具采用 MIT。保留 LICENSE 和 THIRD_PARTY_NOTICES.md；vendored Three.js 保留独立许可证。未包含品牌模型或用户房屋素材。

后续提交截图、复现 JSON 或演示项目时，使用原创示例；不要上传真实地址、私人房屋草图、浏览器数据库或 API Key。`.env.example` 只保留占位值。

已知边界：实时三维是程序化示意，算量按墙体轴线；没有施工图审查、照片级云渲染、云端项目同步或多层建筑模型。详见 PRODUCT-GAPS.md 与 QUALITY.md。

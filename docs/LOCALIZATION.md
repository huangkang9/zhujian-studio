# 中英文界面维护

V0.11 使用 `zh-CN` / `en`。默认中文，语言选择保存在 `zhujian-language`；存储不可用时仍能在当前页面切换。主页、编辑器、对话框和沉浸视图提供 EN / 中文入口。

`public/studio/i18n.js` 只处理显示文本和 title、placeholder、aria-label、alt。原文以 WeakMap 保留，可即时恢复；MutationObserver 处理后续出现的面板。切换不重建应用，不修改模型、输入值、控件 ID、事件或选择。无 value 的 option 先固定原值，避免分类筛选被翻译破坏。

`locales/en.tsv` 是词表源文件；修改后运行 `node scripts/build-locales.mjs` 生成 `en.js`。静态文案优先整句匹配，动态中文片段可按最长词组拼接；新文案需人工审校英文语法。新增 UI 应显式调用 t 或使用受观察的 DOM；canvas、浏览器原生提示和第三方内容不受 DOM 翻译覆盖。

用户名称和原始识别文本的容器必须标记 `data-i18n-user` 或 `translate="no"`。项目、房间及自定义家具名称，品牌／备注，草图标注及模型返回的原文保持原文。默认家具名称可翻译。新拼接提示中含用户文本时应拆为独立受保护节点。原文数据始终不变。

搜索同时匹配中文与英文。SVG、DXF、打印图框和预算 CSV 跟随当前语言；JSON 保留原始工程数据。长度仍为 mm，面积 m²，预算仍为 CNY；无汇率转换或英制切换。日期由相应视图重新绘制时按 locale 格式化，图纸日期保持 ISO 格式。

验证：`node --test tests/i18n.test.mjs tests/ui.test.mjs`，覆盖动态面板、切回中文、option 稳定值、待提交输入、英文搜索、尺寸编辑、预算和导出。自动覆盖检查仅验证静态词组存在，不等同人工语言审校。真实浏览器排版、屏幕阅读器发音和移动触屏仍需验收。

# Super-Paper 工具中心

GitHub Pages 根目录工具入口，现包含 Lumen 待办追踪子网站。

## 上传

把本目录中的所有文件和文件夹上传到 `lumen-todo` 仓库根目录。上传后应形成：

```text
lumen-todo/
├── index.html
├── hub.css
├── hub.js
├── sites.json
├── hub-assets/
└── lumen-todo-tracker/
```

不要再额外套一层 `tool-hub-package` 文件夹。

## 地址

- 目录页：`https://super-paper.github.io/lumen-todo/`
- 待办页：`https://super-paper.github.io/lumen-todo/lumen-todo-tracker/`

## 增加工具

将新工具放入仓库的独立子文件夹，然后在根目录 `sites.json` 的 `sites` 数组中增加一条记录。`href` 必须使用 `./文件夹名/` 形式。

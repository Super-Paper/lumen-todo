# Lumen 待办事项追踪

一个无需构建、适合 GitHub Pages 的待办网页。数据保存在当前浏览器，也可以手动同步到公开 GitHub 仓库的 `data/tasks.json`。

## 本地运行

不要直接双击 `index.html`，请在项目目录启动静态服务器：

```powershell
python -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

运行测试：

```powershell
npm test
```

## 发布到 GitHub Pages

1. 在 GitHub 新建一个 **Public** 仓库，例如 `lumen-todo`。
2. 把本项目全部文件推送到仓库的 `main` 分支。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. Branch 选择 `main`，目录选择 `/ (root)`，然后保存。
6. 等待 GitHub 完成部署。网址通常是 `https://你的用户名.github.io/lumen-todo/`。

## 配置 GitHub 数据同步

> `tasks.json` 位于公开仓库，任何人都可以查看。不要在任务中保存密码、身份证号、Token 或其他敏感信息。

1. 在 GitHub 打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. 新建 Token，只选择这个待办仓库。
3. Repository permissions 仅把 **Contents** 设置为 **Read and write**。
4. 在网页底部打开“同步设置”，填写用户名、仓库名、分支、数据路径和 Token。
5. 点击“拉取”读取仓库数据；点击“推送”更新 `data/tasks.json`。

Token 只保存在当前浏览器的本地存储，不会写入任务 JSON、导出文件或仓库。公共电脑不应保存 Token。GitHub 返回冲突时，网页不会强制覆盖；请先拉取、确认数据，再重新推送。

## 数据备份

- “导出”会下载 JSON 备份。
- “导入”会校验 JSON，再替换当前浏览器数据。
- “重置”会清空浏览器中的任务，但不会自动修改 GitHub 数据。

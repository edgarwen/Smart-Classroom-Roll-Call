# 🚀 智能课堂 AI 点名系统 - GitHub 部署手册

本手册专门为使用云端 IDE 的用户设计，旨在解决“提交失败”并引导您完成 AI 密钥配置。
222
---

## 🛠 第一阶段：准备 GitHub 仓库

1.  登录您的 [GitHub](https://github.com/) 账号。
2.  点击右上角的 **+** -> **New repository**。
3.  **Repository name**: 建议填入 `smart-classroom-roll-call`。
4.  **Public/Private**: 选择 **Public** (公开)。
5.  **不要** 勾选 "Initialize this repository with a README"（保持仓库完全为空）。
6.  点击 **Create repository**。

---

## 💻 第二阶段：从编辑器推送代码

1.  回到您的云端编辑器（即本界面）。
2.  点击右侧边栏的 **GitHub 图标**。
3.  输入您的仓库 URL (例如：`https://github.com/您的用户名/smart-classroom-roll-call.git`)。
4.  点击 **"Stage and commit all changes"**。
    - *如果报错 "Something went wrong":* 请刷新整个浏览器页面，重新点击提交。这是因为云端 Token 有时会失效。
5.  提交成功后，您的代码将出现在 GitHub 仓库中。

---

## 🔐 第三阶段：配置 AI 密钥 (关键！)

由于代码中不含 API Key，您必须在 GitHub 后台手动添加：

1.  在您的 GitHub 仓库页面，点击顶部的 **Settings** (设置)。
2.  在左侧菜单点击 **Secrets and variables** -> **Actions**。
3.  点击右侧绿色的 **New repository secret** 按钮。
4.  **Name (名称)**: 必须填入 `GEMINI_API_KEY`。
5.  **Value (值)**: 粘贴您从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取的密钥。
6.  点击 **Add secret**。

---

## 🌐 第四阶段：启用 GitHub Pages 网页预览

1.  点击仓库顶部的 **Actions** 选项卡。
2.  你会看到一个名为 "Deploy to GitHub Pages" 的工作流正在运行。
3.  等待它变成 **绿色对勾** ✅（大约需要 1-2 分钟）。
4.  回到 **Settings** -> **Pages**。
5.  在 "Build and deployment" 下的 **Branch**，确保选择的是 `gh-pages` 分支（这是构建脚本自动生成的）。
6.  刷新页面，顶部会出现一行文字：`Your site is live at ...`。点击链接即可访问您的点名系统！

---

## ⚠️ 常见问题排查

### Q: 页面打开是白屏或 404？
- **检查 Actions**: 确保构建过程没有报错（红色叉叉）。
- **检查路径**: 我们的 `vite.config.ts` 已配置为相对路径 `./`，这通常能解决 404 问题。

### Q: 摄像头无法启动？
- **HTTPS 限制**: 浏览器安全策略要求必须在 `https` 下才能调用摄像头。GitHub Pages 默认提供 HTTPS。
- **权限拒绝**: 请在浏览器地址栏左侧点击“锁头”图标，确保已允许摄像头访问。

### Q: AI 统计人数不准？
- **拍摄技巧**: 建议录制时从左向右平滑扫视教室，尽量包含所有学生的正脸或头顶。

---
*由 AI 专家团队提供技术支持。  *

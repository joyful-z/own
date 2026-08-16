# 账号急诊室

小红书 AI 账号诊断与选题生成器 MVP 静态站点。

## 本地预览

```bash
npm run dev
```

打开：

```text
http://localhost:4173
```

## 部署到 GitHub Pages

这个项目是纯静态站点，推荐直接使用 GitHub Pages 的分支发布。

### 第一次发布

1. 在 GitHub 新建一个仓库，例如 `xhs-account-doctor`
2. 在本地项目目录执行：

```bash
git init
git add .
git commit -m "init xhs account doctor"
git branch -M main
git remote add origin https://github.com/<你的用户名>/xhs-account-doctor.git
git push -u origin main
```

3. 进入 GitHub 仓库：
   - Settings
   - Pages
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`
   - Folder 选择 `/ (root)`
   - 点击 `Save`
4. 等 GitHub Pages 发布完成后，会得到一个公网地址：

```text
https://<你的用户名>.github.io/xhs-account-doctor/
```

### 后续更新

修改代码后执行：

```bash
git add .
git commit -m "update site"
git push
```

GitHub Pages 会自动重新发布。

## 当前版本说明

当前 MVP 使用浏览器本地 `localStorage` 保存诊断报告和留资数据，适合先验证产品流程。上线后如需多人真实使用，需要接入后端数据库和真实 AI 接口。

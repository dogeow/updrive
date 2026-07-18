# updrive

又拍云文件管理桌面客户端。

## 技术栈（0.40+）

- Electron 41
- Vite 8
- React 19 + Zustand
- Tailwind CSS 4
- `basic-ftp` + REST（主进程 `UpyunSession`）

旧版 Vue 2 + webpack 源码保留在 [`legacy/`](legacy/) 目录，仅作参考。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm start
# 或打包
npm run dist
```

## 功能（MVP）

- 登录 / 退出
- 目录浏览与面包屑导航
- 新建文件夹、删除、上传、下载
- FTP 重命名（IPC `rename`）

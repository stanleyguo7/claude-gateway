# Development Workflow

## Git Workflow

### Important: Auto-commit After Code Changes

**每次修改代码完成后，必须立即提交代码到 Git。**

这个流程确保：
- 所有更改都被版本控制追踪
- 可以随时回滚到之前的状态
- 团队成员可以看到最新的更改
- 保持清晰的开发历史

### 标准开发流程

#### 1. 开始新功能/修复

```bash
# 创建新分支（可选，主要开发可以在 main 分支）
git checkout -b feature/your-feature-name
```

#### 2. 进行代码修改

- 修改代码
- 测试功能
- 确认无错误

#### 3. **提交代码（必须步骤）**

```bash
# 查看修改内容
git status
git diff

# 添加修改的文件
git add .

# 提交更改（使用有意义的提交信息）
git commit -m "feat: add user authentication"

# 推送到远程仓库
git push origin main
```

### 提交信息规范

使用语义化的提交信息：

- `feat:` - 新功能
- `fix:` - 错误修复
- `docs:` - 文档更新
- `style:` - 代码格式（不影响功能）
- `refactor:` - 代码重构
- `test:` - 测试相关
- `chore:` - 构建/工具配置

**示例：**
```bash
git commit -m "feat: implement WebSocket real-time messaging"
git commit -m "fix: resolve CORS issue in chat API"
git commit -m "docs: update API documentation"
git commit -m "refactor: optimize Claude CLI integration"
```

### 完整的开发循环

```
1. 拉取最新代码
   git pull origin main

2. 修改代码
   [编写/修改代码]

3. 测试功能
   npm run dev
   [验证功能正常]

4. 提交代码（必须）
   git add .
   git commit -m "feat: description of changes"
   git push origin main

5. 重复 2-4
```

### 快速提交脚本

创建快捷命令简化提交流程：

```bash
# 添加到 package.json scripts
"commit": "git add . && git commit -m",
"push": "git push origin main"
```

使用方式：
```bash
npm run commit "feat: add new feature"
npm run push
```

### Git 忽略文件

确保不提交以下内容（已在 .gitignore 配置）：
- `node_modules/` - 依赖包
- `.env` - 环境变量（敏感信息）
- `dist/` - 构建输出
- `*.log` - 日志文件

### 分支管理策略

#### 简单项目（推荐）
```
main - 主开发分支
  └─ 直接在 main 上开发，每次修改后提交
```

#### 复杂项目
```
main - 稳定版本
  ├─ develop - 开发分支
  ├─ feature/* - 功能分支
  └─ hotfix/* - 紧急修复分支
```

### 常用 Git 命令

```bash
# 查看状态
git status

# 查看提交历史
git log --oneline

# 查看差异
git diff

# 撤销未提交的修改
git checkout -- <file>

# 修改最后一次提交信息
git commit --amend

# 查看远程仓库
git remote -v

# 拉取最新代码
git pull origin main

# 查看分支
git branch

# 切换分支
git checkout <branch-name>

# 创建并切换分支
git checkout -b <new-branch>

# 合并分支
git merge <branch-name>
```

### 代码审查检查清单

提交前确认：
- ✅ 代码可以正常运行
- ✅ 没有语法错误
- ✅ 已测试核心功能
- ✅ 已移除调试代码（console.log 等）
- ✅ 提交信息清晰明确
- ✅ 没有提交敏感信息（密码、API 密钥等）

### 问题排查

#### 推送失败
```bash
# 远程有新提交，先拉取
git pull origin main --rebase
git push origin main
```

#### 撤销错误提交
```bash
# 撤销最后一次提交，保留修改
git reset --soft HEAD~1

# 撤销最后一次提交，丢弃修改（危险）
git reset --hard HEAD~1
```

#### 查看特定提交的更改
```bash
git show <commit-hash>
```

### 最佳实践

1. **频繁提交** - 小而频繁的提交比大而少的提交更好
2. **清晰的提交信息** - 让他人（包括未来的自己）理解更改的目的
3. **测试后再提交** - 确保代码可以运行
4. **保持提交原子性** - 每次提交只包含一个逻辑更改
5. **定期推送** - 不要让本地积累太多未推送的提交

### 自动化提交钩子（可选）

创建 Git Hooks 自动执行检查：

`.git/hooks/pre-commit`
```bash
#!/bin/sh
# 运行测试
npm test

# 运行 linter
npm run lint

# 检查是否通过
if [ $? -ne 0 ]; then
  echo "Tests or lint failed. Commit aborted."
  exit 1
fi
```

### CI/CD 集成（未来）

- GitHub Actions
- 自动测试
- 自动部署
- 代码质量检查

---

**记住：每次代码修改完成后，立即执行 git commit 和 git push！**

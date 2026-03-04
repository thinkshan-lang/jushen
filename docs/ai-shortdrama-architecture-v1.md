# 《剧神·AI短剧创作智能体》技术架构设计 V1.0（接口级）

## 1. 目标与范围

本设计聚焦 **可直接开发落地** 的接口级架构，覆盖：

- 微服务边界与调用链路
- 核心数据模型
- API 输入/输出契约
- 异步任务与状态回调机制
- MVP 交付优先级

---

## 2. 总体架构

采用：**前后端分离 + 微服务 + AI 调用层 + 渲染引擎层**。

```text
前端层（Web/管理后台）
        ↓
API 网关层
        ↓
业务服务层（微服务）
        ↓
AI 模型调用层
        ↓
渲染与合成层
        ↓
对象存储与 CDN
```

### 2.1 端到端主流程（MVP）

```text
关键词/大纲输入
→ script-service 生成剧集与剧情
→ storyboard-service 生成分镜与镜头 Prompt
→ video-generation-service 异步生成镜头视频
→ render-service 合成整集视频
→ subtitle-service 生成字幕并烧录
→ 返回成片 URL
```

---

## 3. 微服务拆分与职责

## 3.1 用户系统（user-service）

### 职责

- 注册/登录（可对接第三方 OAuth）
- 套餐权限控制（plan）
- 项目管理
- 额度控制（quota）

### 核心数据表

**User**

- `id` (UUID, PK)
- `name` (varchar)
- `email` (varchar, unique)
- `plan_type` (enum: free/pro/enterprise)
- `quota_remaining` (int)
- `created_at` (timestamp)

**Project**

- `id` (UUID, PK)
- `user_id` (UUID, FK -> User.id)
- `title` (varchar)
- `genre` (varchar)
- `status` (enum: draft/generating/done/failed)
- `created_at` (timestamp)

---

## 3.2 剧本生成服务（script-service）

### API

`POST /api/script/generate`

请求：

```json
{
  "project_id": "123",
  "input_type": "outline",
  "content": "现代都市+重生+商战",
  "episode_count": 12
}
```

响应：

```json
{
  "episodes": [
    {
      "episode_no": 1,
      "title": "重生归来",
      "summary": "...",
      "conflict": "...",
      "hook": "..."
    }
  ]
}
```

### 实现建议

- 调用 LLM API（统一由 AI 网关适配）
- 维护可配置 Prompt 模板（按题材、时长、平台版本化）

---

## 3.3 人物生成服务（character-service）

### API

`POST /api/character/generate`

请求：

```json
{
  "project_id": "123",
  "character_name": "林晚",
  "role_type": "女主"
}
```

响应：

```json
{
  "profile": "...",
  "personality_tags": ["冷静", "聪明"],
  "image_prompt": "...",
  "voice_type": "female_soft"
}
```

---

## 3.4 场景生成服务（scene-service）

### API

`POST /api/scene/extract`

请求：

```json
{
  "episode_id": "001"
}
```

响应：

```json
{
  "scenes": [
    {
      "scene_name": "公司会议室",
      "mood": "紧张",
      "image_prompt": "..."
    }
  ]
}
```

---

## 3.5 分镜生成服务（storyboard-service，核心）

### API

`POST /api/storyboard/generate`

请求：

```json
{
  "episode_id": "001",
  "style": "cinematic",
  "duration": 90
}
```

响应：

```json
{
  "shots": [
    {
      "shot_no": 1,
      "duration": 4,
      "camera_move": "push_in",
      "shot_type": "wide",
      "dialogue": "...",
      "emotion": "tense",
      "video_prompt": "..."
    }
  ]
}
```

### 约束建议

- 单镜头时长：2~6s
- 90s 内容推荐 18~30 个镜头
- 每镜头必须具备可直接投喂视频模型的 `video_prompt`

---

## 3.6 视频生成服务（video-generation-service）

### API

`POST /api/video/generate`

请求：

```json
{
  "shot_id": "shot_001",
  "prompt": "...",
  "ratio": "9:16"
}
```

响应：

```json
{
  "task_id": "task_xxx",
  "status": "queued"
}
```

### 回调 API（供 worker 回写）

`POST /internal/video/callback`

```json
{
  "task_id": "task_xxx",
  "status": "success",
  "video_url": "https://cdn.xxx.com/shot001.mp4",
  "error_message": ""
}
```

### 实现建议

- 模型调用采用异步队列（RabbitMQ/Kafka）
- 建议实现重试策略（指数退避，最多 3 次）

---

## 3.7 视频合成服务（render-service）

### API

`POST /api/render/merge`

请求：

```json
{
  "episode_id": "001",
  "bgm": "dramatic.mp3"
}
```

逻辑：

```text
拉取所有 shot 视频
↓
按时间轴排序
↓
插入转场
↓
混合音轨
↓
输出最终视频
```

响应：

```json
{
  "final_video_url": "https://cdn.xxx.com/final001.mp4"
}
```

---

## 3.8 字幕服务（subtitle-service）

### API

`POST /api/subtitle/generate`

请求：

```json
{
  "episode_id": "001",
  "language": "zh-CN"
}
```

响应：

```json
{
  "srt_url": "https://cdn.xxx.com/final001.srt",
  "subtitle_video_url": "https://cdn.xxx.com/final001_sub.mp4"
}
```

---

## 3.9 配音服务（tts-service）

### API

`POST /api/tts/generate`

请求：

```json
{
  "text": "你终于来了",
  "voice_type": "female_cold",
  "emotion": "angry"
}
```

响应：

```json
{
  "audio_url": "https://cdn.xxx.com/voice001.mp3"
}
```

---

## 4. 核心数据模型

## 4.1 Episode

- `id` (UUID, PK)
- `project_id` (UUID, FK)
- `title` (varchar)
- `summary` (text)
- `status` (enum)
- `final_video_url` (varchar)

## 4.2 Shot

- `id` (UUID, PK)
- `episode_id` (UUID, FK)
- `shot_no` (int)
- `duration` (int)
- `camera_move` (varchar)
- `shot_type` (varchar)
- `video_prompt` (text)
- `video_url` (varchar)
- `audio_url` (varchar)

## 4.3 Task（异步任务）

- `id` (UUID, PK)
- `type` (enum: video_generate/render/subtitle)
- `status` (enum: queued/running/success/failed)
- `progress` (int, 0~100)
- `result_url` (varchar)
- `error_message` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## 5. 异步任务机制（必须）

```text
用户发起生成
↓
创建 Task(status=queued)
↓
写入消息队列
↓
Worker 拉取并执行
↓
回调更新 Task 状态与结果
↓
前端轮询 / WebSocket 订阅进度
```

关键点：

- 幂等处理：同一 `task_id` 回调重复写入不应污染状态
- 失败重试：仅对可重试错误重试（超时、限流）
- 可观测性：任务耗时、失败原因、模型耗费 Token 需落库

---

## 6. 推荐技术栈

- 前端：Next.js + Tailwind
- 后端：FastAPI 或 NestJS
- 数据库：PostgreSQL
- 缓存：Redis
- 队列：RabbitMQ
- 对象存储：阿里云 OSS / AWS S3
- CDN：CloudFront

---

## 7. 部署拓扑

```text
Nginx / Ingress
↓
API 网关 + 微服务集群（K8s）
↓
AI 调用层（统一鉴权、限流、模型路由）
↓
渲染节点（GPU/高性能 CPU）
↓
对象存储 + CDN
```

---

## 8. 扩展能力（护城河）

1. 爆款评分模型服务
2. 用户行为反馈学习
3. 完播率预测模型
4. 自动优化剧本 API

---

## 9. 开发优先级（Phase 1）

必须优先：

1. 剧本生成（script-service）
2. 分镜生成（storyboard-service）
3. 视频拼接（render-service）
4. 自动字幕（subtitle-service）

目标：先跑通 **输入关键词 → 生成 1 分钟短剧成片** 的最小闭环。

---

## 10. MVP 明确边界

第一版不做：

- 爆款预测
- 虚拟演员库
- 模板市场

第一版只做：

- 从关键词生成可播放成片
- 支持基础编辑（字幕开关/BGM 选择）
- 支持一键导出与分享链接

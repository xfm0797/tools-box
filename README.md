# 集成工具大全

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个**纯前端、零依赖、可静态部署**的在线工具箱：**509 款**工具全部在浏览器本地完成计算，不上传任何数据。

- 技术栈：HTML + CSS + 原生 JavaScript（ES6），**不使用框架、不使用 npm、不需要构建**
- 部署目标：Cloudflare Pages（构建命令留空，输出目录为根目录）
- 主题：浅色 / 深色，跟随系统并可记忆用户选择（`localStorage`）
- 布局：移动端优先，响应式卡片网格，支持分类筛选与关键词实时搜索

---

## 一、功能清单

共 **509 款**工具，分为 9 个分类（首批 11 款核心工具 + 第一至五批 497 款扩展 + 命理文化 1 款）：

| 分类 | 数量 | 代表工具 |
|------|------|----------|
| 开发辅助 | 89 | JSON 格式化 / 对比 / 路径提取、正则测试与生成、二维码、MD5/SHA、JWT 生成、SQL / HTML / XML / CSS 格式化、CSS 渐变 / 阴影 / 圆角 / Grid / 贝塞尔、Markdown 工具组、docker run 生成、curl 命令生成、日志解析、色盲模拟、Flex / clip-path 生成、TS 接口转 JSON、Dockerfile / Actions / Nginx 配置生成 |
| 编码解码 | 68 | Base64 / Base32 / Base58 / Base64URL / Base85、URL 编解码、JWT 解析、TOTP、摩斯电码、凯撒 / 维吉尼亚 / 仿射 / 栅栏 / 培根密码、Punycode、gzip、Playfair、盲文、HMAC、Luhn、文件哈希、Base45、Code 39 条码、CRC16 |
| 计算换算 | 76 | 进制与大数计算、8 类单位换算、贷款 / 存款 / 个税、BMI、复利、分数、统计、方程、三角形、单价比较、位运算、排列组合、跑步配速、PPI、增值税、电阻色环、毛利率与盈亏平衡、折旧、GPA、纸张尺寸 |
| 文本处理 | 67 | 文本对比（LCS）、去重、排序、命名风格、全角半角、词频统计、相似度（编辑距离）、清洗、打码、折行、对齐、模板替换、行筛选、Slug、竖排文字、NATO 音标、自然排序、花体字、CSV 引号处理 |
| 时间日期 | 58 | 时间戳转换、日期相差 / 加减、时区转换、世界时钟、Cron 解析与下次运行、二十四节气、工作日推算、月历、倒计时、节日倒计时、秒表、番茄钟、年历、夏令时检测、跨时区会议、单双周、时间取整 |
| 图片处理 | 45 | 图片压缩 / 指定体积、尺寸调整、裁剪、旋转、水印、滤镜、九宫格、圆角头像、主色提取、多图拼接、ICO、对比、格式转换、字符画、像素风、直方图、暗角、扫描件增强、锐化、半调网点、色温微调 |
| 随机生成 | 49 | 密码 / 随机数、UUID、短 ID、随机字符串、配色方案、抽奖、骰子表达式、扑克发牌、随机决策、MAC / IP、假数据、加权抽取、口令短语、数独、宾果、随机单词、项目代号、IMEI、车牌、随机 Cron |
| 网络工具 | 36 | 域名解析、子网计算与拆分、IPv4 / IPv6、MAC 格式、HTTP 头 / Cookie / Basic Auth、状态码与端口速查、身份证校验、CIDR 展开、IPv6 子网、邮箱 / 手机号校验、WiFi 二维码、CIDR 合并、缓存策略头、URL 风险特征、curl 转 fetch |
| 生活实用 | 21 | 星座、生肖干支、血型遗传、烹饪换算、睡眠周期、腰臀比、鞋码对照、纪念日、咖啡因代谢、酒精代谢、宠物喂食量、服装尺码、戒指手寸、AQI 折算、紫外线建议、周易起名 |

### 核心工具（11 款首批实现）

| # | 工具 | 分类 | 说明 |
|---|------|------|------|
| 1 | JSON 格式化 | 开发辅助 | 格式化 / 压缩 / 校验，出错时给出**行号与列号** |
| 2 | Base64 编解码 | 编码解码 | UTF-8 中文与 emoji 安全，支持**文件转 Base64 / Data URI** |
| 3 | URL 编解码 | 编码解码 | `encodeURIComponent` / `encodeURI` 双模式，附 URL 结构解析 |
| 4 | 时间戳转换 | 时间日期 | 秒 / 毫秒自动识别，时间戳 ⇄ 日期双向转换，含相对时间 |
| 5 | 文本处理 | 文本处理 | 大小写转换、去空白、反转，实时统计字符 / 汉字 / 单词 / 字节 |
| 6 | 正则测试 | 开发辅助 | 实时高亮、匹配明细与分组、替换结果，非法表达式友好提示 |
| 7 | 二维码生成 | 开发辅助 | **内置编码器**（版本 1–10、L/M/Q/H 容错），导出 PNG / 复制图片 |
| 8 | 颜色格式转换 | 计算换算 | HEX / RGB / HSL 互转，取色器、WCAG 对比度参考 |
| 9 | 随机密码 / 随机数 | 随机生成 | `crypto.getRandomValues` 安全随机源，密码强度（熵）提示 |
| 10 | 图片压缩 / 转 Base64 | 图片处理 | Canvas 本地压缩，可调尺寸 / 质量 / 格式，对比压缩前后体积 |
| 11 | MD5 / SHA 哈希 | 开发辅助 | 内置 MD5 实现 + Web Crypto 的 SHA-1/256/384/512，支持文件 |

### 扩展工具（100 款，按分类）

<details>
<summary><b>文本处理 13 款</b></summary>

文本去重、行排序、文本对比、命名风格转换、全角半角转换、行号增删、转义与反转义、文本分割、信息提取、文本乱序、文本截断、Unicode 转换、模板替换
</details>

<details>
<summary><b>编码解码 16 款</b></summary>

HTML 实体编解码、十六进制互转、二进制互转、ASCII 码表、摩斯电码、凯撒密码、ROT13 / ROT47、Base32、Base58、Base64URL、JWT 解析、UTF-8 字节查看、维吉尼亚密码、埃特巴什密码、Punycode 域名转换、URL 参数构建
</details>

<details>
<summary><b>时间日期 12 款</b></summary>

日期相差计算、日期加减、年龄计算、工作日计算、时区转换、周数与星期、时间戳批量转换、时长换算、日期格式化、倒计时、月历生成、Cron 表达式解析
</details>

<details>
<summary><b>计算换算 16 款</b></summary>

长度 / 重量 / 面积 / 体积 / 速度 / 温度 / 存储 / 时间单位换算、BMI 计算、贷款计算、折扣计算、百分比计算、进制转换、罗马数字转换、中文数字 / 金额大写、复利计算
</details>

<details>
<summary><b>图片处理 10 款</b></summary>

图片尺寸调整、图片裁剪、图片旋转翻转、图片加水印、图片滤镜、图片信息、圆角头像生成、九宫格切图、图片取色器、占位图生成
</details>

<details>
<summary><b>随机生成 10 款</b></summary>

UUID 生成、短 ID 生成、随机字符串、配色方案生成、随机抽奖、掷骰子、抛硬币、随机分组、随机姓名、随机日期时间
</details>

<details>
<summary><b>开发辅助 16 款</b></summary>

JSON 转 TypeScript、JSON 转 CSV、CSV 转 JSON、JSON 转 YAML、CSS 压缩、正则速查表、MIME 类型查询、UA 解析、Git 命令速查、Linux 命令速查、CSS 渐变生成、CSS 阴影生成、CSS 圆角生成、颜色对比度检测、SQL 格式化、HTML 格式化
</details>

<details>
<summary><b>网络工具 7 款</b></summary>

域名解析、Cookie 解析、HTTP 头解析、IPv4 与整数互转、子网计算、HTTP 状态码速查、端口速查
</details>

### 第二批扩展工具（100 款）

| 分类 | 新增工具 |
|------|----------|
| 文本处理 15 款 | 文本反转、对齐填充、文本折行、缩进处理、前后缀与编号、多行合并、文本转对齐列、文本相似度、批量查找替换、按列排序、词频统计、文本清洗、敏感词打码、文本重复拼接、换行符转换 |
| 编码解码 14 款 | Base85、JS 字符串转义、SQL 字符串转义、ROT5 / ROT18、仿射密码、栅栏密码、培根密码、A1Z26、Brainfuck 解释器、哈希类型识别、CRC32、JWT 生成、TOTP 验证码、gzip 压缩编码 |
| 时间日期 11 款 | 二十四节气、日期区间生成、世界时钟、Cron 下次运行、日期格式转换、季度与财年、工作日推算、时间加减、时长批量累加、闰年判断、复活节计算 |
| 计算换算 17 款 | 工资个税、存款利息、压力 / 能量 / 功率 / 角度 / 油耗 / 鞋码换算、分数计算、大数计算、质因数分解、最大公约数、统计计算、一元二次方程、三角形计算、小费分账、单价比较 |
| 图片处理 9 款 | 加边框与圆角、多图拼接、Base64 转图片、马赛克打码、压缩到指定大小、批量缩放、主色提取、favicon 生成、图片对比 |
| 随机生成 9 款 | MAC 地址生成、随机 IP、随机 emoji、随机数表、PIN 验证码、彩票机选、随机决策、扑克牌发牌、骰子表达式 |
| 开发辅助 18 款 | JSON 路径提取 / 对比 / 扁平化、YAML 转 JSON、XML 格式化、px·rem 换算、CSS Grid / 贝塞尔 / 滤镜生成、Markdown 表格 / 目录 / 预览、.gitignore、开源协议、docker run 命令、颜色梯度、版本号、正则生成 |
| 网络工具 7 款 | IPv6 格式化、IP 网段判断、子网拆分、MAC 地址格式、Basic Auth、URL 规范化、身份证校验 |

> 所有工具都带「复制结果 / 清空 / 示例」按钮，操作反馈统一使用 Toast 轻提示；输入类工具会边打字边出结果（`debounce` 120–300ms）。

### 第三批扩展工具（97 款）

| 分类 | 新增工具 |
|------|----------|
| 文本处理 14 款 | 行列互换、行筛选（grep）、Slug 生成、大小写切换、移除 emoji、Markdown 转义、NATO 音标字母、竖排文字、首字母缩写、命名拆词、空白压缩、段落排版、列截取、HTML 转纯文本 |
| 编码解码 12 款 | Quoted-Printable、Base62、Crockford Base32、Hexdump 视图、Playfair 密码、敲击码、盲文转换、HMAC 签名、文件哈希、Luhn 校验位、XOR 加密、正则转义 |
| 时间日期 10 款 | 节日倒计时、儒略日转换、秒表、番茄钟、第 N 个星期几、工作时长计算、月天数查询、夏令时检测、年历生成、年度进度 |
| 计算换算 14 款 | 圆与立体几何、勾股定理、位运算、对数、三角函数、排列组合、跑步配速、屏幕像素密度、宽高比、时薪换算、宠物年龄、下载时间、增值税、电阻色环、毛利率与盈亏平衡、折旧、GPA、纸张尺寸 |
| 图片处理 9 款 | 格式转换、ASCII 字符画、像素风、颜色叠加、噪点纹理、暗角、渐变图生成、图案生成、直方图 |
| 随机生成 9 款 | 随机颜色、加权抽取、假数据生成、对阵表、圣诞抽签、宾果卡片、用户名生成、口令短语、数独生成 |
| 开发辅助 19 款 | JSON 合并 / 键排序、dotenv 转 JSON、curl 命令生成、robots.txt、SEO Meta、假文生成、颜色混合、色盲模拟、clip-path / Flex 生成器、ObjectId、Shell 转义、防抖节流演示、响应式断点、访问日志解析、提交信息、HTML 模板、SQL INSERT |
| 网络工具 10 款 | CIDR 展开、IPv6 子网计算、DNS 记录速查、邮箱校验、手机号校验、hosts 生成、CORS 速查、REST 方法速查、mailto 链接、WiFi 二维码文本 |

### 第四批扩展工具（100 款）

| 分类 | 新增工具 |
|------|----------|
| 文本处理 12 款 | 回文检测、字符统计概览、行统计、行乱序、关键词密度、可读性评分、引用包裹、文本分块、不可见字符清理、字符分组分隔、行集合差异、中英混排对齐 |
| 编码解码 12 款 | Base16、Base36、邮件主题编码（RFC 2047）、Varint 变长整数、Unicode 转义、C 风格转义、UUEncode、凯撒暴力破解、字节频率与熵、乱码修复、URL 分段编码、ROT47 |
| 时间日期 12 款 | 日期合法性校验、两时区时差、时间戳多格式、自定义日期格式、年积日、工时计算、时间戳单位换算、日期智能解析、日期精确差值、星期与周次、时间段重叠、月相与月龄 |
| 计算换算 14 款 | 基础代谢率、每日总消耗、体脂率、标准体重、每日饮水量、油费、电费、涂料用量、瓷砖数量、还款方式对比、储蓄目标测算、投资回报率、年化复合增长率、加班费 |
| 图片处理 8 款 | 图片信息速览、图片转 Data URI、按打印尺寸输出、单色蒙版、加相框、去除元数据、自动去白边、按百分比缩放 |
| 随机生成 10 款 | 随机十六进制、随机日期、中文姓名、公司名、地址、随机模板填充、正态分布随机数、序列号生成、随机渐变、随机短句 |
| 开发辅助 16 款 | UUID 校验、语义化版本比较、JSON 与 Query 互转、Commit 信息校验、CHANGELOG 生成、代码行数统计、缩进风格转换、URL 片段拼接、CSS 变量提取、字段定义生成 JSON、Data URI 解析、正则元字符转义、SQL WHERE 生成、数字格式化、.env 示例生成、路径风格转换 |
| 网络工具 6 款 | IP 类型判断、User-Agent 解析、MIME 类型对照、URL 参数增删改、IPv4 网段换算、Set-Cookie 生成 |
| 生活实用 10 款 | 星座查询、生肖与干支、血型遗传、烹饪单位换算、睡眠周期、腰臀比、鞋码对照、纪念日计算、咖啡因代谢、酒精代谢估算 |

> 第四批新增「生活实用」分类，同时为首页分类筛选提供新的入口；该批工具同样全部离线运行，不请求任何外部接口。


### 第五批扩展工具（100 款）

| 分类 | 新增工具 |
|------|----------|
| 文本处理 12 款 | 自然排序、镜像文字、花体字转换、超长行检测、CSV 引号处理、行转 SQL IN、行转 JSON 数组、数字序列生成、Unicode 归一化、去变音符号、阅读时长估算、按句切分 |
| 编码解码 12 款 | Base45、格雷码、BCD 编码、列置换密码、Zalgo 抖动文字、1337 火星文、Code 39 条形码、CRC16、Netstring、PEM 分块、DNA 碱基编码、键盘错位还原 |
| 时间日期 12 款 | ISO 8601 时长、RFC 邮件日期、日期排序、批量标注星期、时间取整、单双周判断、英文序数日期、相对时间描述、日期分组统计、12 / 24 小时制、最早最晚跨度、跨时区会议 |
| 计算换算 14 款 | 扭矩 / 流量 / 密度换算、数字转英文、比例分配、毛利率换算、盈亏平衡、折旧计算、赔率与期望、GPA 加权、科学计数法、有效数字修约、取整方式对照、纸张尺寸 |
| 图片处理 8 款 | 指定颜色替换、扫描件增强、半调网点、图片锐化、透明合成底色、色调分离、构图网格、色温微调 |
| 随机生成 10 款 | 随机整数列表、随机 IPv6、随机英文单词、项目代号、随机经纬度、IMEI 生成、车牌号生成、随机 Cron、随机 User-Agent、随机 API Key |
| 开发辅助 16 款 | TS 接口转 JSON、JSON 转 Schema、CSS 动画生成、clamp 流式字号、SVG 精简、正则逐段解释、HTML 转 JSX、版本范围判定、package.json 生成、tsconfig 生成、Dockerfile 生成、Actions 工作流、Nginx 反代配置、字段转建表语句、枚举代码生成、分支名生成 |
| 网络工具 6 款 | URL 结构拆解、CIDR 网段合并、缓存策略头生成、URL 风险特征检查、代理环境变量、curl 转 fetch |
| 生活实用 10 款 | 宠物喂食量、服装尺码换算、戒指手寸对照、食谱份量缩放、PM2.5 折算 AQI、紫外线建议、预产期估算、孩子身高预测、分贝与听力、震级能量换算 |

> 第五批把二十余款「日常真的会用」的能力补齐：开发侧覆盖从字段定义到部署配置的整条链路，生活侧补上宠物、穿搭、下厨与空气 / 紫外线这类高频查询；全部工具依旧离线运行，没有一处外部请求。


---

## 二、目录结构

```
集成工具大全/
├── index.html              # 单页入口：头部、OG / favicon 元信息、主题初始化、脚本引入
├── site.webmanifest        # PWA 清单：图标、主题色、快捷方式
├── LICENSE                 # MIT 许可证（Copyright © 2026 XFM）
├── assets/                 # 品牌资源（全部为静态文件，无外部依赖）
│   ├── favicon.svg         # 矢量图标（首选，任意尺寸都清晰）
│   ├── favicon.ico         # 16 / 32 / 48 多尺寸兜底
│   ├── apple-touch-icon.png# iOS 主屏图标 180×180（直角，系统自动裁圆）
│   ├── icon-192.png        # PWA / Android 192×192
│   ├── icon-512.png        # PWA / Android 512×512
│   ├── icon-maskable-512.png # 自适应图标（四周留安全区）
│   ├── logo-mark.svg       # 图形标，页头与页脚直接引用
│   ├── logo.svg            # 图形标 + 中英文组合
│   ├── logo.png            # 组合 logo 的 2× PNG（文档 / 物料用）
│   └── og-image.png        # 1200×630 社交分享封面
├── css/
│   └── style.css           # 全部样式：设计变量、布局、组件、深色主题、响应式
├── js/
│   ├── main.js             # 509 条工具配置、hash 路由、依赖 + 按需加载、搜索筛选、主题、Toast、回到顶部、公共能力
│   └── tools/
│       ├── _kit.js         # 共享 UI 工装（文本 / 表单 / 表格 / 画布 / 安全随机 / 复制），批量工具都依赖它
│       ├── json.js         # ┐
│       ├── base64.js       # │
│       ├── url.js          # │
│       ├── timestamp.js    # │ 首批 11 款工具，
│       ├── text.js         # │ 每款一个独立模块
│       ├── regex.js        # │
│       ├── qrcode.js       # │
│       ├── color.js        # │
│       ├── random.js       # │
│       ├── image.js        # │
│       ├── hash.js         # ┘
│       ├── pack-text.js    # 第一批 · 文本处理 13 款
│       ├── pack-codec.js   # 第一批 · 编码解码 16 款
│       ├── pack-time.js    # 第一批 · 时间日期 12 款
│       ├── pack-calc.js    # 第一批 · 计算换算 16 款
│       ├── pack-image.js   # 第一批 · 图片处理 10 款
│       ├── pack-random.js  # 第一批 · 随机生成 10 款
│       ├── pack-dev.js     # 第一批 · 开发辅助 16 款
│       ├── pack-net.js     # 第一批 · 网络工具 7 款
│       ├── pack-text2.js   # 第二批 · 文本处理 15 款
│       ├── pack-codec2.js  # 第二批 · 编码解码 14 款
│       ├── pack-time2.js   # 第二批 · 时间日期 11 款
│       ├── pack-calc2.js   # 第二批 · 计算换算 17 款
│       ├── pack-image2.js  # 第二批 · 图片处理 9 款
│       ├── pack-random2.js # 第二批 · 随机生成 9 款
│       ├── pack-dev2.js    # 第二批 · 开发辅助 18 款
│       ├── pack-net2.js    # 第二批 · 网络工具 7 款
│       ├── pack-text3.js   # 第三批 · 文本处理 14 款
│       ├── pack-codec3.js  # 第三批 · 编码解码 12 款
│       ├── pack-time3.js   # 第三批 · 时间日期 10 款
│       ├── pack-calc3.js   # 第三批 · 计算换算 14 款
│       ├── pack-image3.js  # 第三批 · 图片处理 9 款
│       ├── pack-random3.js # 第三批 · 随机生成 9 款
│       ├── pack-dev3.js    # 第三批 · 开发辅助 19 款
│       ├── pack-net3.js    # 第三批 · 网络工具 10 款
│       ├── pack-text4.js   # 第四批 · 文本处理 12 款
│       ├── pack-codec4.js  # 第四批 · 编码解码 12 款
│       ├── pack-time4.js   # 第四批 · 时间日期 12 款
│       ├── pack-calc4.js   # 第四批 · 计算换算 14 款
│       ├── pack-image4.js  # 第四批 · 图片处理 8 款
│       ├── pack-random4.js # 第四批 · 随机生成 10 款
│       ├── pack-dev4.js    # 第四批 · 开发辅助 16 款
│       ├── pack-net4.js    # 第四批 · 网络工具 6 款
│       ├── pack-life4.js   # 第四批 · 生活实用 10 款
│       ├── pack-text5.js   # 第五批 · 文本处理 12 款
│       ├── pack-codec5.js  # 第五批 · 编码解码 12 款
│       ├── pack-time5.js   # 第五批 · 时间日期 12 款
│       ├── pack-calc5.js   # 第五批 · 计算换算 14 款
│       ├── pack-image5.js  # 第五批 · 图片处理 8 款
│       ├── pack-random5.js # 第五批 · 随机生成 10 款
│       ├── pack-dev5.js    # 第五批 · 开发辅助 16 款
│       ├── pack-net5.js    # 第五批 · 网络工具 6 款
│       ├── pack-life5.js   # 第五批 · 生活实用 10 款
│       └── pack-fortune.js # 命理文化 · 周易起名
└── README.md               # 本文档
```

**没有任何外部请求**：不加载 CDN 脚本、不加载 Web Font、不接入统计代码；工具模块按需从同域加载，首次进入后即被浏览器缓存。因此不存在「CDN 在国内加载失败」的问题。

首屏只加载 `index.html` + `css/style.css` + `js/main.js`（未压缩合计约 154KB，gzip 后约 43KB）以及两个图标（`favicon.svg`、`logo-mark.svg`，各不到 1KB），其余工具模块在进入对应页面时才加载。`logo.svg`、`logo.png`、`og-image.png` 只在外部引用时才被请求，正常浏览不会下载。

按分类打包而不是「一工具一文件」，是为了让 509 款工具只产生 43 个额外请求（同分类同批次的工具共用一个模块，进过一次后其余工具零加载）；单款工具若逻辑复杂，仍可单独建文件，两种方式可混用。

### 品牌资源与分享卡片

图形标是一块圆角渐变底板 + 2×2 工具格，右下角用青色高亮，呼应首页的卡片网格；除了 `logo-mark.svg` 与 `favicon.svg` 是手写 SVG（两份内容相同，分别供页头与浏览器标签页引用），其余位图都由同一份 SVG 渲染导出；改色时同步改这两个文件里的两个渐变端点，再重新导出位图即可。

| 文件 | 用途 | 说明 |
|------|------|------|
| `favicon.svg` | 浏览器标签页（首选） | 矢量，支持任意缩放与高分屏 |
| `favicon.ico` | 老浏览器 / 部分抓取器 | 内含 16 / 32 / 48 三个尺寸 |
| `apple-touch-icon.png` | iOS 添加到主屏 | 180×180 直角，圆角由系统裁切 |
| `icon-192/512.png` | Android / PWA | `purpose: any` |
| `icon-maskable-512.png` | Android 自适应图标 | `purpose: maskable`，图形在安全区内 |
| `logo-mark.svg` | 页头、页脚 | 直接 `<img>` 引用，34px / 28px |
| `logo.svg` / `logo.png` | 文档、物料、README | 图形标 + 「集成工具大全」组合 |
| `og-image.png` | 社交分享封面 | 1200×630，微信 / Twitter / Slack 等通用 |

页面头部同时写入了 Open Graph 与 Twitter Card 元信息（`og:type/site_name/title/description/url/image` + `twitter:card=summary_large_image`），分享出去会渲染成带封面的大卡片。页脚为「图形标 + 站名 + 版权行 + 隐私说明」的两栏结构，版权年份由 `js/main.js` 的 `bindFooterYear()` 写入当前年份，不需要每年改 HTML。

> **域名已固定**：`index.html` 中 4 处绝对地址（`canonical`、`og:url`、`og:image`、`twitter:image`）均已指向 `https://tools.lovou.pw`。OG 协议要求绝对地址，用相对路径时部分平台抓不到图；若日后更换域名，这 4 处需同步修改。改完可用各平台的调试工具复核：Facebook Sharing Debugger、Twitter Card Validator，或直接发一条私聊看预览。

---

## 三、本地运行

方式一（推荐，能完整使用 Web Crypto 等特性）：

```bash
cd 项目目录
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

方式二：直接双击 `index.html` 用浏览器打开。功能基本可用，但由于 `file://` 不属于安全上下文，**SHA 系列哈希**会提示不可用（MD5 仍可用），建议使用方式一。

---

## 四、部署到 Cloudflare Pages

### 方式 A：连接 GitHub 仓库（推荐，后续 push 自动部署）

1. 把本项目推送到 GitHub 仓库（确保 `index.html` 位于仓库根目录）。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
3. 授权并选择该仓库，点击 **Begin setup**。
4. 构建配置按下表填写：

   | 配置项 | 填写内容 |
   |--------|----------|
   | Project name | 自定义，如 `toolbox` |
   | Production branch | `main`（或你的默认分支） |
   | Framework preset | `None` |
   | **Build command** | **留空** |
   | **Build output directory** | **`/`**（或留空，根目录） |
   | Root directory | 留空 |

5. 点击 **Save and Deploy**，几十秒后即可通过 `https://<项目名>.pages.dev` 访问。
6. 之后每次 `git push` 都会自动重新部署；Pull Request 还会生成预览环境。

### 方式 B：直接上传（无需 Git）

1. 将项目打包为 ZIP（**ZIP 内直接是 `index.html`、`css/`、`js/`，不要多包一层文件夹**）。
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets**。
3. 输入项目名 → 把 ZIP 拖入上传区域（或选择文件夹）→ **Deploy site**。
4. 完成。后续更新时在同一项目里点击 **Create new deployment** 重新上传即可。

### 说明

- **无需任何服务端配置**：没有 Node 运行时、没有环境变量、没有数据库、不需要 `_redirects` 或 `_headers`。
- 路由采用 `#/tool/xxx` 的 hash 形式，刷新任意工具页都由 `index.html` 承载，不会出现 404。
- 自定义域名：在 **Custom domains** 绑定 `tools.lovou.pw`，Cloudflare 会自动签发 HTTPS 证书（Web Crypto 需要 https 或 localhost）。
- 本项目的 OG 绝对地址已按 `https://tools.lovou.pw` 预填（见上一节「品牌资源与分享卡片」），自定义域名生效后无需再改；若换域名则需同步回填。
- `site.webmanifest` 与 `assets/` 都是普通静态文件，无需额外配置 MIME 类型，Cloudflare Pages 会按扩展名正确返回。
- 若希望上传目录更干净，可排除 `.git/`、`.workbuddy/` 等无关目录（不影响运行）。

---

## 五、如何新增一个工具

**只需两步，不用改路由、不用改 index.html**。

### 5.1 简单工具：一行配置搞定（推荐）

绝大多数工具都是「输入 → 转换 → 输出」的形态，直接用 `main.js` 里的 `tool()` 简写，只需在模块文件里写渲染函数：

```js
// js/tools/my-pack.js
(function () {
  'use strict';
  window.ToolModules['my-tool'] = function (root) {
    // Kit 会自动补齐输入框、复制 / 清空 / 示例按钮、状态提示
    Kit.text(root, {
      inputLabel: '输入',
      sample: '示例文本',
      run: function (text) {
        if (!text.trim()) return { error: '请输入内容' };
        return { output: text.toUpperCase() };
      }
    });
  };
})();
```

然后在 `js/main.js` 的 `TOOLS` 数组里加一行（参数依次为：`id, 名称, 分类, 描述, 图标, 搜索关键词, 脚本路径`）：

```js
tool('my-tool', '我的工具', '开发辅助', '一句话描述，显示在卡片上。', 'code', '关键词 别名', 'js/tools/my-pack.js'),
```

`tool()` 会自动补上 `deps: ['js/tools/_kit.js']`：进入页面时先加载 `_kit.js` 再加载工具脚本，**依赖只加载一次**（同分类的多个工具共享同一个 `pack-*.js`，第二次进入不再请求）。

### 5.2 复杂工具：完整配置

需要自定义布局时，直接写完整配置项：

```js
{
  id: 'my-tool',                    // 唯一 id，同时是 URL：#/tool/my-tool
  script: 'js/tools/my-tool.js',    // 首次进入该工具时按需加载
  deps: [],                         // 可选：先于 script 加载的依赖
  name: '我的工具',
  category: '开发辅助',              // 需在 CATEGORY_ORDER 中存在，或自行追加
  desc: '一句话描述，会显示在卡片上。',
  icon: 'code',                     // 取 ICONS 中的键名
  keywords: '关键词 搜索 别名',      // 参与搜索匹配
  render: function (root) { window.ToolModules['my-tool'](root); }
}
```

配置数组是工具的「唯一数据源」：首页卡片、搜索、分类筛选、路由、同类工具推荐、模块按需加载都会自动生效。新分类只要在 `CATEGORY_ORDER` 里补一个名字即可，图标在 `ICONS` 里补一条 SVG path。

### 5.3 异步与自定义结果

`Kit.text` / `Kit.form` 的 `run` 既可以直接返回结果，也可以返回 Promise（工具内部会显示「计算中…」并等待）：

```js
run: function (text) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
    return { output: hex(buf) };
  });
}
```

结果对象支持的字段：

| 字段 | 作用 |
|------|------|
| `output` | 写入文本结果框（`Kit.text`） |
| `html` | 渲染自定义 HTML，如表格、代码块、预览卡片（两个骨架都支持） |
| `rows` | 渲染键值列表，自动带复制按钮（`Kit.form`） |
| `note` / `type` | 底部状态文字与类型（`ok` / `warn` / `err`） |
| `error` | 直接显示为错误提示，不渲染结果 |

纯表格类工具可以给 `Kit.text` 加 `hideOutput: true`，隐藏文本输出框，只展示 `html`。

### 5.4 可用的公共能力

| 能力 | 用法 | 说明 |
|------|------|------|
| `UI.toast(msg, type)` | 轻提示 | `type`：`ok` / `warn` / `err` |
| `UI.copyText(text)` | 复制 | clipboard API + `execCommand` 回退 |
| `UI.downloadBlob / downloadText` | 下载 | 自动创建并回收临时 `<a>` |
| `UI.readFileAsText / DataURL / ArrayBuffer` | 读文件 | 统一封装 `FileReader` |
| `UI.debounce / throttle` | 节流防抖 | 输入类工具默认使用 |
| `UI.formatBytes / escapeHtml / initTabs` | 杂项 | 体积格式化、转义、Tab 组件 |
| `Kit.text(root, cfg)` | 文本工具骨架 | textarea 进出 + 计数 + 运行 / 示例 / 清空 / 复制 |
| `Kit.form(root, cfg)` | 表单工具骨架 | 字段声明式生成，`result.html` + `result.rows` 渲染 |
| `Kit.table / kv / code` | 表格与键值展示 | 长表格自动横向滚动 |
| `Kit.dropzone / loadImage / canvas / canvasBlob` | 图片工具骨架 | 拖拽上传 + Canvas 处理 + 导出 |
| `Kit.randomInt / pick / shuffle` | 安全随机 | 基于 `crypto.getRandomValues`，含拒绝采样 |
| `Kit.esc / num / group / uid` | 杂项 | HTML 转义、数值格式化、千分位、唯一 id |

---

## 六、实现要点

| 主题 | 做法 |
|------|------|
| 路由 | `hashchange` 监听 + 正则匹配 `#/tool/:id`，未知路由回首页 |
| 状态 | 搜索词与分类保存在内存，切换工具页再返回仍保留筛选条件 |
| 按需加载 | 动态注入 `<script>`，按 URL 缓存 Promise；先串行加载 `deps` 再加载工具脚本，失败自动重试 |
| 主题 | `<head>` 内联脚本在首屏渲染前写入 `data-theme`，避免闪烁；仅用户手动切换时写入 `localStorage` |
| 长文本 | 输入类工具统一 `debounce`（120–300ms）；超大 JSON 先提示再 `setTimeout` 让出主线程；文件类工具设置大小上限 |
| 边界处理 | 空输入、非法字符、超范围数值、超大文件均有可读提示，统一 try/catch，不出现白屏或控制台报错 |
| 二维码 | 自实现字节模式编码：GF(256) Reed-Solomon、块交织、8 种掩码 + 惩罚分择优，无第三方库 |
| 哈希 | MD5 为纯 JS 实现（含 UTF-8 与多分块）；SHA 系列调用 `crypto.subtle`，不可用时给出明确提示 |
| 自实现算法 | LCS 文本对比、编辑距离、Base32 / Base58 / Base85、Punycode（RFC 3492）、Cron 五字段解析与下次运行、BigInt 进制转换、子网掩码运算与拆分、等额本息 / 等额本金、ISO 周数、太阳视黄经（节气）、Meeus 复活节算法、身份证校验码 |
| 加密与压缩 | JWT 签名与 TOTP 走 `crypto.subtle` 的 HMAC；gzip 走 `CompressionStream`，均在本地完成，密钥不出浏览器。TOTP 结果已与 RFC 6238 附录 B 测试向量逐条比对（SHA-1 / 256 / 512、6 位 / 8 位、30 / 60 秒周期均一致） |
| 图像处理 | 全部基于 Canvas：缩放、裁剪、圆角、水印、马赛克、主色量化、ICO 多尺寸打包，不上传原图 |
| 时区 | `Intl.DateTimeFormat` + IANA `timeZone` 双向换算，时区 → UTC 用偏移量迭代求解 |
| 剪贴板 | 优先 `navigator.clipboard`，失败回退 `execCommand('copy')` |
| 无障碍 | 语义化标签、`aria-label` / `aria-pressed` / `role=tab`、可见焦点样式、`prefers-reduced-motion` 适配 |

### 浏览器兼容

Chrome / Edge 90+、Firefox 90+、Safari 15+（含 iOS）。依赖 `TextEncoder`、`URL`、`BigInt`、`canvas.toBlob`、CSS 变量与 `color-mix()`；`CompressionStream`（gzip 工具）需要 Chrome 80+ / Safari 16.4+，不支持时该工具会给出明确提示；在不支持 `color-mix()` 的旧浏览器中仅个别半透明边框会退化，不影响功能。

---

## 七、隐私说明

- 没有后端，没有接口请求，没有埋点统计。
- 输入的文本、JSON、图片、文件只存在于当前页面内存，关闭标签页即释放。
- 唯一持久化的数据是主题偏好（`localStorage` 键名 `toolbox.theme`），可随时在浏览器中清除。

## 八、许可

本项目基于 [MIT 许可证](LICENSE) 开源，版权归 XFM 所有，可自由用于个人或商业项目。

- **允许**：使用、复制、修改、合并、发布、分发、再许可、销售
- **要求**：在软件的所有副本或实质性部分中保留版权声明与许可声明
- **免责**：软件按「原样」提供，不附带任何明示或默示担保，作者不对使用后果承担责任

页脚展示的 `© <年份> · XFM · 保留所有权利` 只是站点版权声明，与代码许可（MIT）互不冲突：代码可自由复用，但请不要直接拿本站的品牌名与 logo 做同名站点。

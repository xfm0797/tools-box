/* =============================================================================
 * 集成工具大全 · 主入口
 * -----------------------------------------------------------------------------
 * 职责：
 *   1. 工具配置表（新增工具 = 加一条配置 + 一个 js/tools 模块）
 *   2. 基于 hash 的前端路由（首页 / 工具页），无需服务端配置
 *   3. 首页关键词搜索与分类筛选
 *   4. 主题切换、Toast、剪贴板、文件读取等公共能力（挂载到 window.UI）
 *
 * 说明：本文件不发起任何网络请求，所有数据仅存在于当前页面内存中。
 * ========================================================================== */
(function () {
  'use strict';

  /* 工具模块注册表：各 js/tools/*.js 通过 ToolModules[id] = renderFn 注册 */
  window.ToolModules = window.ToolModules || {};

  /* =========================================================================
   * 一、工具配置（id / 名称 / 分类 / 描述 / 图标 / 关键词 / 渲染函数）
   * ====================================================================== */
  var TOOLS = [
    {
      id: 'json-format',
      script: 'js/tools/json.js', // 需要时才加载该模块
      name: 'JSON 格式化',
      category: '开发辅助',
      desc: '格式化、压缩与校验 JSON，出错时精确定位行列。',
      icon: 'braces',
      keywords: 'json 格式化 美化 压缩 校验 format beautify minify validate',
      render: function (root) { window.ToolModules['json-format'](root); }
    },
    {
      id: 'base64',
      script: 'js/tools/base64.js', // 需要时才加载该模块
      name: 'Base64 编解码',
      category: '编码解码',
      desc: '支持中文（UTF-8）与文件，一键生成 Data URI。',
      icon: 'code',
      keywords: 'base64 编码 解码 加密 文件 utf8 datauri',
      render: function (root) { window.ToolModules['base64'](root); }
    },
    {
      id: 'url-codec',
      script: 'js/tools/url.js', // 需要时才加载该模块
      name: 'URL 编解码',
      category: '编码解码',
      desc: 'URL 编码、解码，并拆解参数与路径组成。',
      icon: 'link',
      keywords: 'url uri 编码 解码 encode decode 参数 query',
      render: function (root) { window.ToolModules['url-codec'](root); }
    },
    {
      id: 'timestamp',
      script: 'js/tools/timestamp.js', // 需要时才加载该模块
      name: '时间戳转换',
      category: '时间日期',
      desc: 'Unix 时间戳与日期互转，自动识别秒 / 毫秒。',
      icon: 'clock',
      keywords: '时间戳 unix timestamp 日期 时间 转换 秒 毫秒',
      render: function (root) { window.ToolModules['timestamp'](root); }
    },
    {
      id: 'text-tools',
      script: 'js/tools/text.js', // 需要时才加载该模块
      name: '文本处理',
      category: '文本处理',
      desc: '大小写转换、去空白，实时统计字数与字节。',
      icon: 'type',
      keywords: '大小写 转换 字数 统计 文本 去空格 uppercase lowercase count',
      render: function (root) { window.ToolModules['text-tools'](root); }
    },
    {
      id: 'regex',
      script: 'js/tools/regex.js', // 需要时才加载该模块
      name: '正则测试',
      category: '开发辅助',
      desc: '实时高亮匹配、查看分组与替换结果。',
      icon: 'regex',
      keywords: '正则 regex 表达式 匹配 替换 测试 match replace',
      render: function (root) { window.ToolModules['regex'](root); }
    },
    {
      id: 'qrcode',
      script: 'js/tools/qrcode.js', // 需要时才加载该模块
      name: '二维码生成',
      category: '开发辅助',
      desc: '纯本地生成二维码，可调容错等级并导出 PNG。',
      icon: 'qr',
      keywords: '二维码 qr qrcode 生成 扫码 链接 png',
      render: function (root) { window.ToolModules['qrcode'](root); }
    },
    {
      id: 'color',
      script: 'js/tools/color.js', // 需要时才加载该模块
      name: '颜色格式转换',
      category: '计算换算',
      desc: 'HEX / RGB / HSL 互相转换，附带取色器。',
      icon: 'palette',
      keywords: '颜色 色彩 hex rgb hsl 转换 取色器 color',
      render: function (root) { window.ToolModules['color'](root); }
    },
    {
      id: 'random',
      script: 'js/tools/random.js', // 需要时才加载该模块
      name: '随机密码 / 随机数',
      category: '随机生成',
      desc: '基于系统安全随机源生成密码与随机整数。',
      icon: 'dice',
      keywords: '随机 密码 password 随机数 数字 uuid 强度',
      render: function (root) { window.ToolModules['random'](root); }
    },
    {
      id: 'image',
      script: 'js/tools/image.js', // 需要时才加载该模块
      name: '图片压缩 / 转 Base64',
      category: '图片处理',
      desc: '本地压缩图片体积，或转换为 Base64 字符串。',
      icon: 'image',
      keywords: '图片 压缩 压缩图片 base64 转换 jpg png webp image',
      render: function (root) { window.ToolModules['image'](root); }
    },
    {
      id: 'hash',
      script: 'js/tools/hash.js', // 需要时才加载该模块
      name: 'MD5 / SHA 哈希',
      category: '开发辅助',
      desc: '计算文本或文件的 MD5、SHA-1、SHA-256 等摘要。',
      icon: 'hash',
      keywords: 'md5 sha sha1 sha256 sha512 哈希 摘要 校验 hash',
      render: function (root) { window.ToolModules['hash'](root); }
    },

    /* ------------------------------ 文本处理 ------------------------------ */
    tool('text-dedupe', '文本去重', '文本处理', '按行去重，可忽略大小写与行首尾空白。', 'list', '去重 重复行 唯一 dedupe unique 合并', 'js/tools/pack-text.js'),
    tool('line-sort', '行排序', '文本处理', '按字典、长度或自然顺序排列文本行。', 'list', '排序 行 升序 降序 sort 自然排序', 'js/tools/pack-text.js'),
    tool('text-diff', '文本对比', '文本处理', '按行对比两段文本，高亮新增与删除。', 'diff', '对比 diff 比较 差异 文本比对', 'js/tools/pack-text.js'),
    tool('case-convert', '命名风格转换', '文本处理', 'camelCase、snake_case 等 9 种命名风格互转。', 'type', '命名 camel snake kebab pascal 变量名 大小写', 'js/tools/pack-text.js'),
    tool('width-convert', '全角半角转换', '文本处理', '全角与半角字符互转，包含全角空格处理。', 'type', '全角 半角 转换 字符宽度 fullwidth', 'js/tools/pack-text.js'),
    tool('line-number', '行号增删', '文本处理', '为每行添加序号，或移除文本里已有的行号。', 'list', '行号 序号 编号 line number 添加 移除', 'js/tools/pack-text.js'),
    tool('text-escape', '转义与反转义', '文本处理', '处理换行、制表符、HTML 实体与 JSON 字符串转义。', 'code', '转义 escape 反转义 html json 换行 制表符', 'js/tools/pack-text.js'),
    tool('text-split', '文本分割', '文本处理', '按分隔符、固定长度或正则把文本切成多段。', 'scissors', '分割 拆分 split 分隔符 正则 长度', 'js/tools/pack-text.js'),
    tool('text-extract', '信息提取', '文本处理', '从文本中批量提取邮箱、网址、手机号、IP 等。', 'search', '提取 邮箱 url 手机号 ip 身份证 正则', 'js/tools/pack-text.js'),
    tool('text-shuffle', '文本乱序', '文本处理', '按行、词或字符随机打乱顺序。', 'shuffle', '乱序 打乱 shuffle 随机 洗牌', 'js/tools/pack-text.js'),
    tool('text-truncate', '文本截断', '文本处理', '按字符或 UTF-8 字节截断，不会截出乱码。', 'scissors', '截断 省略 truncate 字节 长度 裁剪', 'js/tools/pack-text.js'),
    tool('unicode-convert', 'Unicode 转换', '文本处理', '中文与 Unicode 转义、HTML 数字实体互转。', 'code', 'unicode 转义 编码 实体 中文', 'js/tools/pack-text.js'),
    tool('text-template', '模板替换', '文本处理', '用 key=value 变量填充 {{占位符}} 模板。', 'braces', '模板 替换 template 占位符 变量 批量', 'js/tools/pack-text.js'),

    /* ------------------------------ 编码解码 ------------------------------ */
    tool('html-entities', 'HTML 实体编解码', '编码解码', 'HTML 特殊字符转义与实体还原。', 'code', 'html 实体 转义 entity 编码 解码', 'js/tools/pack-codec.js'),
    tool('hex-text', '十六进制互转', '编码解码', '文本与十六进制字节串互转，支持空格分隔。', 'code', '十六进制 hex 字节 编码 解码', 'js/tools/pack-codec.js'),
    tool('binary-text', '二进制互转', '编码解码', '文本与 8 位二进制串互转。', 'code', '二进制 binary 位 编码 解码', 'js/tools/pack-codec.js'),
    tool('ascii-table', 'ASCII 码表', '编码解码', '0–127 全码表查询，支持按十进制与字符筛选。', 'list', 'ascii 码表 字符 编码 查询', 'js/tools/pack-codec.js'),
    tool('morse-code', '摩斯电码', '编码解码', '文本与摩斯电码互转，支持字母数字与常用标点。', 'terminal', '摩斯 电码 morse 编码 解码', 'js/tools/pack-codec.js'),
    tool('caesar-cipher', '凯撒密码', '编码解码', '古典移位密码，附 25 种偏移的暴力破解对照。', 'shield', '凯撒 密码 移位 加密 解密 古典', 'js/tools/pack-codec.js'),
    tool('rot-cipher', 'ROT13 / ROT47', '编码解码', '自反移位密码，再执行一次即可还原。', 'shuffle', 'rot13 rot47 rot18 移位 加密', 'js/tools/pack-codec.js'),
    tool('base32', 'Base32 编解码', '编码解码', 'RFC 4648 标准 Base32，适合大小写不敏感场景。', 'code', 'base32 编码 解码 rfc4648', 'js/tools/pack-codec.js'),
    tool('base58', 'Base58 编解码', '编码解码', 'Bitcoin 字母表的 Base58，去掉了易混淆字符。', 'code', 'base58 编码 解码 比特币 bitcoin', 'js/tools/pack-codec.js'),
    tool('jwt-decode', 'JWT 解析', '编码解码', '解析 JWT 的 Header 与 Payload，检查过期时间。', 'key', 'jwt token 解析 payload header 过期', 'js/tools/pack-codec.js'),
    tool('utf8-bytes', 'UTF-8 字节查看', '编码解码', '逐字符查看码点与 UTF-8 字节占用。', 'type', 'utf8 字节 码点 编码 字符 长度', 'js/tools/pack-codec.js'),
    tool('vigenere', '维吉尼亚密码', '编码解码', '多表替换密码，需要字母密钥。', 'lock', '维吉尼亚 vigenere 密码 密钥 加密', 'js/tools/pack-codec.js'),
    tool('atbash', '埃特巴什密码', '编码解码', '字母表首尾对应的自反替换密码。', 'lock', 'atbash 反切 密码 替换 希伯来', 'js/tools/pack-codec.js'),
    tool('base64url', 'Base64URL 编解码', '编码解码', 'URL 安全的 Base64 变体，去掉 + / 与填充。', 'code', 'base64url 编码 解码 无填充 url 安全', 'js/tools/pack-codec.js'),
    tool('punycode', 'Punycode 域名转换', '编码解码', '中文域名与 xn-- 形式的 Punycode 互转。', 'globe', 'punycode 域名 中文 xn-- idn 国际化', 'js/tools/pack-codec.js'),
    tool('url-builder', 'URL 参数构建', '编码解码', '按 key=value 列表拼装带查询参数的完整链接。', 'link', 'url 参数 构建 查询串 query 拼接', 'js/tools/pack-codec.js'),

    /* ------------------------------ 时间日期 ------------------------------ */
    tool('date-diff', '日期相差计算', '时间日期', '计算两个日期相差的天数、周数、年月日与工作日。', 'calendar', '日期 相差 天数 diff 间隔 工作日', 'js/tools/pack-time.js'),
    tool('date-add', '日期加减', '时间日期', '在指定日期上加减年月日小时，自动处理月末。', 'calendar', '日期 加减 推算 偏移 add', 'js/tools/pack-time.js'),
    tool('age-calc', '年龄计算', '时间日期', '按生日计算周岁、虚岁、生肖、星座与下次生日。', 'calendar', '年龄 周岁 虚岁 生日 星座 生肖', 'js/tools/pack-time.js'),
    tool('workday-calc', '工作日计算', '时间日期', '统计工作日天数，或推算 N 个工作日后的日期。', 'calendar', '工作日 节假日 周末 排期 计算', 'js/tools/pack-time.js'),
    tool('timezone-convert', '时区转换', '时间日期', '在 11 个常用时区之间换算时间，自动处理夏令时。', 'clock', '时区 转换 夏令时 utc 纽约 东京', 'js/tools/pack-time.js'),
    tool('week-info', '周数与星期', '时间日期', '查询 ISO 周数、年内第几天、季度与闰年信息。', 'calendar', '周数 星期 iso 季度 第几天', 'js/tools/pack-time.js'),
    tool('ts-batch', '时间戳批量转换', '时间日期', '每行一个时间戳，批量转为可读日期或反向转换。', 'clock', '时间戳 批量 timestamp 转换 秒 毫秒', 'js/tools/pack-time.js'),
    tool('duration-format', '时长换算', '时间日期', '秒数与天时分秒、HH:MM:SS 之间互转。', 'clock', '时长 秒 分钟 小时 换算 duration', 'js/tools/pack-time.js'),
    tool('date-format', '日期格式化', '时间日期', '用 YYYY-MM-DD 等占位符自定义输出格式。', 'calendar', '日期 格式化 format 模板 yyyy mm dd', 'js/tools/pack-time.js'),
    tool('countdown', '倒计时', '时间日期', '实时倒计时到指定时刻，支持元旦与周末快捷选择。', 'clock', '倒计时 countdown 纪念日 目标时间', 'js/tools/pack-time.js'),
    tool('calendar-gen', '月历生成', '时间日期', '生成可截图的月历，高亮今天并可选每周起始日。', 'grid', '月历 日历 calendar 排版 打印', 'js/tools/pack-time.js'),
    tool('cron-parser', 'Cron 表达式解析', '时间日期', '解析 5 段 Cron，展示匹配范围与接下来 5 次执行时间。', 'clock', 'cron 表达式 定时 任务 解析 下次执行', 'js/tools/pack-time.js'),

    /* ------------------------------ 计算换算 ------------------------------ */
    tool('unit-length', '长度换算', '计算换算', '米、厘米、英尺、英寸、市尺、英里等互转。', 'ruler', '长度 换算 米 厘米 英尺 英寸 里', 'js/tools/pack-calc.js'),
    tool('unit-weight', '重量换算', '计算换算', '千克、斤、磅、盎司、克拉等互转。', 'ruler', '重量 换算 千克 斤 磅 盎司 克', 'js/tools/pack-calc.js'),
    tool('unit-area', '面积换算', '计算换算', '平方米、亩、坪、公顷、英亩等互转。', 'ruler', '面积 换算 平方米 亩 坪 公顷', 'js/tools/pack-calc.js'),
    tool('unit-volume', '体积换算', '计算换算', '升、毫升、立方米、加仑、杯等互转。', 'ruler', '体积 容积 换算 升 加仑 立方米', 'js/tools/pack-calc.js'),
    tool('unit-speed', '速度换算', '计算换算', '米每秒、千米每小时、英里每小时、节、马赫互转。', 'ruler', '速度 换算 迈 码 节 马赫 km/h', 'js/tools/pack-calc.js'),
    tool('unit-temperature', '温度换算', '计算换算', '摄氏度、华氏度、开尔文、兰氏度互转。', 'ruler', '温度 摄氏 华氏 开尔文 换算', 'js/tools/pack-calc.js'),
    tool('unit-data', '存储单位换算', '计算换算', 'bit、字节、KB/MB/GB 与 KiB/MiB/GiB 对照。', 'database', '存储 流量 单位 换算 mb gb kib 字节', 'js/tools/pack-calc.js'),
    tool('unit-time', '时间单位换算', '计算换算', '毫秒、秒、分、时、天、周、月、年互转。', 'clock', '时间 单位 换算 秒 小时 天 年', 'js/tools/pack-calc.js'),
    tool('bmi-calc', 'BMI 计算', '计算换算', '按身高体重计算 BMI、健康区间与基础代谢。', 'chart', 'bmi 体重 身高 健康 胖瘦 代谢', 'js/tools/pack-calc.js'),
    tool('loan-calc', '贷款计算', '计算换算', '等额本息与等额本金对比，含前 12 期还款明细。', 'percent', '贷款 房贷 月供 利息 等额本息 等额本金', 'js/tools/pack-calc.js'),
    tool('discount-calc', '折扣计算', '计算换算', '原价、折扣与立减组合，算出实付与节省金额。', 'percent', '折扣 打折 优惠 满减 实付 价格', 'js/tools/pack-calc.js'),
    tool('percentage-calc', '百分比计算', '计算换算', '占比、增长率、增减百分比的五种常见算法。', 'percent', '百分比 占比 增长率 涨跌幅 计算', 'js/tools/pack-calc.js'),
    tool('number-base', '进制转换', '计算换算', '二、八、十、十六及 2–36 任意进制互转，支持大整数。', 'cpu', '进制 转换 二进制 十六进制 36 bigint', 'js/tools/pack-calc.js'),
    tool('roman-numeral', '罗马数字转换', '计算换算', '1–3999 的阿拉伯数字与罗马数字互转。', 'type', '罗马数字 roman 转换 数字', 'js/tools/pack-calc.js'),
    tool('chinese-number', '中文数字 / 金额大写', '计算换算', '数字转人民币金额大写，或中文读法。', 'type', '中文 大写 金额 人民币 数字 读法', 'js/tools/pack-calc.js'),
    tool('compound-interest', '复利计算', '计算换算', '按复利频率计算到期本息，并与单利对比。', 'chart', '复利 理财 收益 年化 投资 利息', 'js/tools/pack-calc.js'),

    /* ------------------------------ 图片处理 ------------------------------ */
    tool('image-resize', '图片尺寸调整', '图片处理', '按指定宽高缩放图片，可锁定宽高比。', 'image', '图片 缩放 尺寸 resize 宽高', 'js/tools/pack-image.js'),
    tool('image-crop', '图片裁剪', '图片处理', '按 1:1、16:9 等比例裁剪，可选取景位置。', 'scissors', '图片 裁剪 crop 比例 头像 封面', 'js/tools/pack-image.js'),
    tool('image-rotate', '图片旋转翻转', '图片处理', '顺时针旋转 90/180/270 度，支持水平垂直翻转。', 'image', '图片 旋转 翻转 rotate 镜像', 'js/tools/pack-image.js'),
    tool('image-watermark', '图片加水印', '图片处理', '添加文字水印，可调位置、字号、透明度与平铺。', 'brush', '水印 watermark 图片 文字 版权', 'js/tools/pack-image.js'),
    tool('image-grayscale', '图片滤镜', '图片处理', '黑白、复古、反色、冷暖色调等 8 种滤镜。', 'palette', '滤镜 黑白 复古 反色 图片 filter', 'js/tools/pack-image.js'),
    tool('image-info', '图片信息', '图片处理', '查看尺寸、体积、格式、宽高比与平均色。', 'file', '图片 信息 尺寸 大小 格式 平均色', 'js/tools/pack-image.js'),
    tool('avatar-maker', '圆角头像生成', '图片处理', '居中裁成正方形，导出圆形或圆角头像。', 'image', '头像 avatar 圆形 圆角 社交', 'js/tools/pack-image.js'),
    tool('image-split', '九宫格切图', '图片处理', '把图片切成 9 宫格或自定义网格，可批量下载。', 'grid', '九宫格 切图 朋友圈 分割 grid', 'js/tools/pack-image.js'),
    tool('image-eyedropper', '图片取色器', '图片处理', '点击图片任意位置取出 HEX / RGB 色值。', 'eye', '取色 吸管 颜色 hex rgb 图片', 'js/tools/pack-image.js'),
    tool('placeholder-gen', '占位图生成', '图片处理', '生成指定尺寸的占位图，可下载 PNG 或复制 SVG。', 'grid', '占位图 placeholder 设计 联调 svg', 'js/tools/pack-image.js'),

    /* ------------------------------ 随机生成 ------------------------------ */
    tool('uuid-gen', 'UUID 生成', '随机生成', '批量生成 UUID v4，可选大写与去连字符。', 'key', 'uuid guid 唯一 标识 主键 生成', 'js/tools/pack-random.js'),
    tool('nanoid-gen', '短 ID 生成', '随机生成', '生成 NanoID 风格的短标识，字符集与长度可调。', 'hash', 'nanoid 短id 随机 标识 文件 key', 'js/tools/pack-random.js'),
    tool('random-string', '随机字符串', '随机生成', '自定义字符集生成随机串，可选去除易混淆字符。', 'shuffle', '随机 字符串 字符集 验证码 密钥', 'js/tools/pack-random.js'),
    tool('palette-gen', '配色方案生成', '随机生成', '基于基准色生成邻近、互补、三角等配色方案。', 'palette', '配色 色板 palette 互补色 设计', 'js/tools/pack-random.js'),
    tool('lottery-pick', '随机抽奖', '随机生成', '从名单中抽取中奖者，支持不重复抽取。', 'dice', '抽奖 抽取 名单 随机 中奖 摇号', 'js/tools/pack-random.js'),
    tool('dice-roll', '掷骰子', '随机生成', '支持 d4 到 d100，多颗骰子同时投掷并求和。', 'dice', '骰子 掷骰 d6 d20 跑团 随机', 'js/tools/pack-random.js'),
    tool('coin-flip', '抛硬币', '随机生成', '批量抛硬币，统计正反比例与最长连续。', 'dice', '硬币 抛硬币 正反 随机 概率', 'js/tools/pack-random.js'),
    tool('team-split', '随机分组', '随机生成', '把名单随机分成若干小组，人数最多相差 1 人。', 'grid', '分组 随机 团队 抽签 分班', 'js/tools/pack-random.js'),
    tool('name-gen', '随机姓名', '随机生成', '生成中文姓名，可选性别倾向与单双名。', 'type', '姓名 随机 中文 假数据 测试 角色', 'js/tools/pack-random.js'),
    tool('random-datetime', '随机日期时间', '随机生成', '在指定区间内批量生成随机时刻，可排序。', 'clock', '随机 日期 时间 测试数据 区间', 'js/tools/pack-random.js'),

    /* ------------------------------ 开发辅助 ------------------------------ */
    tool('json-to-ts', 'JSON 转 TypeScript', '开发辅助', '根据 JSON 结构自动生成 TS 接口定义。', 'braces', 'json typescript ts 接口 interface 类型', 'js/tools/pack-dev.js'),
    tool('json-to-csv', 'JSON 转 CSV', '开发辅助', '把对象数组转成 CSV，自动合并字段并处理转义。', 'file', 'json csv 表格 导出 转换', 'js/tools/pack-dev.js'),
    tool('csv-to-json', 'CSV 转 JSON', '开发辅助', '解析 CSV（支持引号与逗号）为 JSON 对象数组。', 'file', 'csv json 导入 解析 表格', 'js/tools/pack-dev.js'),
    tool('json-to-yaml', 'JSON 转 YAML', '开发辅助', '把 JSON 递归转换为 2 空格缩进的 YAML。', 'file', 'json yaml 配置 转换 k8s', 'js/tools/pack-dev.js'),
    tool('css-minify', 'CSS 压缩', '开发辅助', '去除注释与多余空白，显示压缩前后体积对比。', 'code', 'css 压缩 minify 体积 优化', 'js/tools/pack-dev.js'),
    tool('regex-cheatsheet', '正则速查表', '开发辅助', '常用正则语法与断言速查，支持搜索复制。', 'regex', '正则 regex 速查 语法 断言 分组', 'js/tools/pack-dev.js'),
    tool('mime-lookup', 'MIME 类型查询', '开发辅助', '按扩展名查询 Content-Type，覆盖 40+ 常见格式。', 'file', 'mime content-type 类型 扩展名 查询', 'js/tools/pack-dev.js'),
    tool('user-agent-parse', 'UA 解析', '开发辅助', '解析 User-Agent，识别浏览器、引擎、系统与设备。', 'globe', 'ua user-agent 浏览器 系统 设备 解析', 'js/tools/pack-dev.js'),
    tool('git-cheatsheet', 'Git 命令速查', '开发辅助', '28 条高频 Git 命令，含撤销、变基与找回提交。', 'terminal', 'git 命令 速查 提交 分支 rebase', 'js/tools/pack-dev.js'),
    tool('linux-cheatsheet', 'Linux 命令速查', '开发辅助', '文件、进程、网络、权限等常用命令速查。', 'terminal', 'linux 命令 shell 速查 运维', 'js/tools/pack-dev.js'),
    tool('css-gradient', 'CSS 渐变生成', '开发辅助', '可视化调节线性/径向渐变，实时生成 CSS。', 'palette', 'css 渐变 gradient 背景 生成器', 'js/tools/pack-dev.js'),
    tool('box-shadow', 'CSS 阴影生成', '开发辅助', '拖动滑块调整偏移、模糊与颜色，生成 box-shadow。', 'layers', 'css 阴影 box-shadow 卡片 生成器', 'js/tools/pack-dev.js'),
    tool('border-radius', 'CSS 圆角生成', '开发辅助', '四角独立调节，生成 border-radius 代码。', 'grid', 'css 圆角 border-radius 形状 生成器', 'js/tools/pack-dev.js'),
    tool('color-contrast', '颜色对比度检测', '开发辅助', '计算 WCAG 对比度，判断 AA / AAA 是否达标。', 'eye', '对比度 wcag 无障碍 可读性 颜色', 'js/tools/pack-dev.js'),
    tool('sql-formatter', 'SQL 格式化', '开发辅助', '关键字大写、子句换行，快速整理 SQL。', 'database', 'sql 格式化 美化 查询 关键字', 'js/tools/pack-dev.js'),
    tool('html-formatter', 'HTML 格式化', '开发辅助', '按标签层级缩进整理 HTML，脚本样式原样保留。', 'code', 'html 格式化 缩进 美化 排版', 'js/tools/pack-dev.js'),

    /* ------------------------------ 网络工具 ------------------------------ */
    tool('domain-parse', '域名解析', '网络工具', '拆解 URL 的协议、主机、端口、路径与主域子域。', 'globe', '域名 url 解析 主域 子域 tld 端口', 'js/tools/pack-net.js'),
    tool('cookie-parse', 'Cookie 解析', '网络工具', '解析 Cookie 键值与 Path、SameSite 等属性。', 'server', 'cookie 解析 属性 samesite session', 'js/tools/pack-net.js'),
    tool('http-header', 'HTTP 头解析', '网络工具', '把原始请求头/响应头解析为表格与 JSON。', 'server', 'http header 请求头 响应头 解析', 'js/tools/pack-net.js'),
    tool('ipv4-convert', 'IPv4 与整数互转', '网络工具', '点分 IP 与十进制、十六进制、二进制互转。', 'network', 'ip ipv4 整数 转换 十六进制 二进制', 'js/tools/pack-net.js'),
    tool('subnet-calc', '子网计算', '网络工具', '按 CIDR 计算网络地址、广播地址与可用主机范围。', 'network', '子网 掩码 cidr 网络地址 广播 主机', 'js/tools/pack-net.js'),
    tool('http-status', 'HTTP 状态码速查', '网络工具', '33 个常见状态码的含义与排查方向。', 'server', 'http 状态码 404 500 301 速查', 'js/tools/pack-net.js'),
    tool('port-lookup', '端口速查', '网络工具', '40+ 常用端口与对应服务，支持关键词搜索。', 'network', '端口 port 服务 443 3306 6379', 'js/tools/pack-net.js'),

    /* ---------------------- 文本处理（第二批 15 款） ---------------------- */
    tool('text-reverse', '文本反转', '文本处理', '整段、每行或词序倒置，支持中英文与 emoji。', 'list', '反转 倒序 reverse 倒置 字符 行', 'js/tools/pack-text2.js'),
    tool('text-pad', '对齐填充', '文本处理', '按显示宽度补齐空格或符号，中文按两列计算。', 'type', '对齐 填充 补位 pad 宽度 等宽', 'js/tools/pack-text2.js'),
    tool('text-wrap', '文本折行', '文本处理', '按设定宽度自动断行，支持中文按字与英文按词。', 'file', '折行 换行 wrap 自动换行 宽度 排版', 'js/tools/pack-text2.js'),
    tool('text-indent', '缩进处理', '文本处理', '批量增加或移除行首缩进，支持空格与 Tab。', 'list', '缩进 indent 空格 tab 首行 排版', 'js/tools/pack-text2.js'),
    tool('text-prefix', '前后缀与编号', '文本处理', '为每行添加前缀、后缀与序号，可跳过空行。', 'list', '前缀 后缀 编号 序号 prefix suffix', 'js/tools/pack-text2.js'),
    tool('text-merge', '多行合并', '文本处理', '把多行合并成一段，可自定义连接符并去空行。', 'list', '合并 一行 merge 连接 拼接 段落', 'js/tools/pack-text2.js'),
    tool('text-columns', '文本转对齐列', '文本处理', '按分隔符拆列并对齐成等宽表格。', 'grid', '列 对齐 表格 columns 分隔符 csv', 'js/tools/pack-text2.js'),
    tool('text-similarity', '文本相似度', '文本处理', '编辑距离、字符相似度与词集相似度对比。', 'diff', '相似度 编辑距离 levenshtein 比较 重复', 'js/tools/pack-text2.js'),
    tool('text-replace', '批量查找替换', '文本处理', '支持正则与分组替换，统计替换次数。', 'search', '替换 replace 查找 正则 批量', 'js/tools/pack-text2.js'),
    tool('text-sort-multi', '按列排序', '文本处理', '按指定列对 CSV / TSV 行排序，支持数字与降序。', 'list', '排序 列 sort csv 数字 降序', 'js/tools/pack-text2.js'),
    tool('text-frequency', '词频统计', '文本处理', '统计字频、词频或行频，输出前 N 名与占比。', 'chart', '词频 字频 统计 frequency 出现次数 top', 'js/tools/pack-text2.js'),
    tool('text-clean', '文本清洗', '文本处理', '一键去空行、去零宽字符、合并空格、中英文加空格。', 'brush', '清洗 清理 clean 空行 零宽 空格 标签', 'js/tools/pack-text2.js'),
    tool('text-censor', '敏感词打码', '文本处理', '把指定关键词替换为星号，粘贴日志前快速遮盖。', 'lock', '打码 敏感词 屏蔽 星号 censor 脱敏', 'js/tools/pack-text2.js'),
    tool('text-repeat', '文本重复拼接', '文本处理', '把文本按次数重复，可每行单独重复并选连接符。', 'layers', '重复 拼接 repeat 次数 复制', 'js/tools/pack-text2.js'),
    tool('text-newline', '换行符转换', '文本处理', '检测 CRLF / LF / CR 并统一为指定换行符。', 'file', '换行 crlf lf cr 转换 检测 windows', 'js/tools/pack-text2.js'),

    /* ---------------------- 编码解码（第二批 14 款） ---------------------- */
    tool('base85', 'Base85 编解码', '编码解码', 'Adobe Ascii85 编码，支持 z 零字节压缩。', 'code', 'base85 ascii85 编码 解码 压缩', 'js/tools/pack-codec2.js'),
    tool('escape-js', 'JS 字符串转义', '编码解码', '转义换行、引号与 Unicode，或还原为普通文本。', 'code', 'js javascript 转义 escape 字符串 unicode', 'js/tools/pack-codec2.js'),
    tool('escape-sql', 'SQL 字符串转义', '编码解码', 'MySQL 与标准 SQL 两种方言的转义与还原。', 'database', 'sql 转义 注入 escape 引号 mysql', 'js/tools/pack-codec2.js'),
    tool('rot18', 'ROT5 / ROT18', '编码解码', '字母移位 13、数字移位 5，一次操作即可还原。', 'shield', 'rot18 rot5 rot13 移位 加密 数字', 'js/tools/pack-codec2.js'),
    tool('affine-cipher', '仿射密码', '编码解码', '古典替换密码，按 a·x+b 变换并自动求逆元。', 'shield', '仿射 密码 affine 加密 解密 古典', 'js/tools/pack-codec2.js'),
    tool('rail-fence', '栅栏密码', '编码解码', '锯齿形分组换位，支持 2–12 栏加密解密。', 'layers', '栅栏 密码 rail fence 换位 加密', 'js/tools/pack-codec2.js'),
    tool('bacon-cipher', '培根密码', '编码解码', '字母与 AB 序列互转，支持 24 / 26 字母表。', 'type', '培根 密码 bacon ab 隐写 古典', 'js/tools/pack-codec2.js'),
    tool('a1z26', 'A1Z26 字母数字', '编码解码', 'A=1 … Z=26 的数字编码与还原。', 'type', 'a1z26 字母 数字 编码 解码 替换', 'js/tools/pack-codec2.js'),
    tool('brainfuck', 'Brainfuck 解释器', '编码解码', '在浏览器里运行 BF 代码，带步数上限保护。', 'terminal', 'brainfuck bf 解释器 运行 代码 编程', 'js/tools/pack-codec2.js'),
    tool('hash-identify', '哈希类型识别', '编码解码', '按长度与特征判断 MD5、SHA、bcrypt 等类型。', 'hash', '哈希 识别 hash 类型 md5 sha bcrypt 长度', 'js/tools/pack-codec2.js'),
    tool('crc32', 'CRC32 校验', '编码解码', '计算文本的 CRC-32 值，可与预期值对照。', 'hash', 'crc32 校验 校验和 crc 完整性', 'js/tools/pack-codec2.js'),
    tool('jwt-sign', 'JWT 生成', '编码解码', '本地用 HMAC 签发 HS256 / 384 / 512 Token。', 'lock', 'jwt 生成 签名 hs256 token hmac', 'js/tools/pack-codec2.js'),
    tool('totp', 'TOTP 验证码', '编码解码', '按 RFC 6238 生成动态验证码，自动倒计时刷新。', 'clock', 'totp 验证码 动态口令 2fa 身份验证器', 'js/tools/pack-codec2.js'),
    tool('gzip-base64', 'gzip 压缩编码', '编码解码', '文本 gzip 压缩后转 Base64，也可反向解压。', 'file', 'gzip 压缩 解压 base64 压缩率 deflate', 'js/tools/pack-codec2.js'),

    /* ---------------------- 时间日期（第二批 11 款） ---------------------- */
    tool('solar-term', '二十四节气', '时间日期', '按太阳黄经计算全年节气时刻（北京时间）。', 'calendar', '节气 二十四 solar term 立春 冬至 黄经', 'js/tools/pack-time2.js'),
    tool('date-range', '日期区间生成', '时间日期', '按天 / 周 / 月生成日期列表，可只保留工作日。', 'calendar', '日期 区间 列表 range 批量 工作日', 'js/tools/pack-time2.js'),
    tool('world-clock', '世界时钟', '时间日期', '12 个城市的当前时间与时差，每秒刷新。', 'clock', '世界时钟 时区 时差 城市 当前时间', 'js/tools/pack-time2.js'),
    tool('cron-next', 'Cron 下次运行', '时间日期', '解析 5 字段表达式并列出未来运行时间。', 'clock', 'cron 表达式 下次 运行 定时 计划任务', 'js/tools/pack-time2.js'),
    tool('date-reformat', '日期格式转换', '时间日期', '识别常见日期写法，输出 ISO、时间戳、周数等。', 'calendar', '日期 格式化 解析 时间戳 iso 周数', 'js/tools/pack-time2.js'),
    tool('quarter-calc', '季度与财年', '时间日期', '计算自然季度、财年季度与进度。', 'calendar', '季度 财年 quarter 财报 进度', 'js/tools/pack-time2.js'),
    tool('workday-add', '工作日推算', '时间日期', '推算 N 个工作日后的日期，可加自定义节假日。', 'calendar', '工作日 推算 跳过 周末 节假日 截止日', 'js/tools/pack-time2.js'),
    tool('time-arith', '时间加减', '时间日期', '时分秒加减运算，支持 90m、1.5h 等写法。', 'clock', '时间 加减 时长 计算 hh:mm:ss', 'js/tools/pack-time2.js'),
    tool('duration-sum', '时长批量累加', '时间日期', '把多行工时累加为总时长，自动识别多种格式。', 'clock', '时长 累加 工时 汇总 求和 分钟', 'js/tools/pack-time2.js'),
    tool('leap-year', '闰年判断', '时间日期', '判断闰年并列出前后最近的闰年。', 'calendar', '闰年 leap 二月 天数 判断', 'js/tools/pack-time2.js'),
    tool('date-easter', '复活节计算', '时间日期', '按 Meeus 算法计算复活节及相关节日。', 'calendar', '复活节 easter 受难日 升天节 节日', 'js/tools/pack-time2.js'),

    /* ---------------------- 计算换算（第二批 17 款） ---------------------- */
    tool('salary-tax', '工资个税', '计算换算', '按月薪、五险一金与专项扣除估算个税与到手。', 'percent', '工资 个税 税后 到手 五险一金 所得税', 'js/tools/pack-calc2.js'),
    tool('savings', '存款利息', '计算换算', '单利与复利（年/月/日）的本息与收益曲线。', 'percent', '存款 利息 复利 单利 收益 理财', 'js/tools/pack-calc2.js'),
    tool('unit-pressure', '压力换算', '计算换算', 'Pa、bar、psi、atm、mmHg 等压力单位互转。', 'ruler', '压力 换算 pa bar psi atm mmhg', 'js/tools/pack-calc2.js'),
    tool('unit-energy', '能量换算', '计算换算', '焦耳、卡路里、千瓦时、BTU 互转。', 'ruler', '能量 热量 卡路里 千卡 焦耳 kwh btu', 'js/tools/pack-calc2.js'),
    tool('unit-power', '功率换算', '计算换算', '瓦、千瓦、马力（hp / PS）与 BTU/h 互转。', 'ruler', '功率 马力 hp ps 瓦 千瓦', 'js/tools/pack-calc2.js'),
    tool('unit-angle', '角度换算', '计算换算', '度、弧度、百分度、角分角秒互转。', 'ruler', '角度 弧度 rad 度 角分 角秒', 'js/tools/pack-calc2.js'),
    tool('unit-fuel', '油耗换算', '计算换算', 'L/100km、km/L 与美制/英制 MPG 互转。', 'ruler', '油耗 百公里 mpg 换算 汽油 每公里', 'js/tools/pack-calc2.js'),
    tool('unit-shoe', '鞋码换算', '计算换算', '脚长与欧码、美码、英码、中国码对照。', 'ruler', '鞋码 尺码 脚长 欧码 美码 英码', 'js/tools/pack-calc2.js'),
    tool('fraction-calc', '分数计算', '计算换算', '分数加减乘除并自动约分，输出带分数与小数。', 'percent', '分数 约分 通分 计算 分子 分母', 'js/tools/pack-calc2.js'),
    tool('bignum-calc', '大数计算', '计算换算', '基于 BigInt 的任意长度整数四则与幂运算。', 'cpu', '大数 bigint 大整数 计算 精度 幂', 'js/tools/pack-calc2.js'),
    tool('prime-factor', '质因数分解', '计算换算', '判断质数、分解质因数、统计约数个数与和。', 'cpu', '质数 素数 分解 因数 约数 prime', 'js/tools/pack-calc2.js'),
    tool('gcd-lcm', '最大公约数', '计算换算', '多个整数的最大公约数与最小公倍数。', 'cpu', '最大公约数 最小公倍数 gcd lcm 互质', 'js/tools/pack-calc2.js'),
    tool('stat-basic', '统计计算', '计算换算', '均值、中位数、众数、方差、四分位与异常值。', 'chart', '统计 均值 中位数 方差 标准差 四分位', 'js/tools/pack-calc2.js'),
    tool('quadratic', '一元二次方程', '计算换算', '求根、判别式、顶点与对称轴，支持复数根。', 'percent', '方程 二次 求根 判别式 顶点 复数', 'js/tools/pack-calc2.js'),
    tool('triangle-calc', '三角形计算', '计算换算', '已知三边求面积、角度、高与外接/内切圆。', 'ruler', '三角形 面积 海伦 角度 边长 外接圆', 'js/tools/pack-calc2.js'),
    tool('tip-split', '小费与分账', '计算换算', '按比例加小费并均摊，可向上取整到元。', 'percent', '小费 分账 aa 均摊 聚餐 服务费', 'js/tools/pack-calc2.js'),
    tool('price-unit', '单价比较', '计算换算', '比较两件商品的单位价格，判断哪个更划算。', 'percent', '单价 比价 划算 单位价格 超市', 'js/tools/pack-calc2.js'),

    /* ---------------------- 图片处理（第二批 9 款） ---------------------- */
    tool('image-border', '加边框与圆角', '图片处理', '给图片加内边距、边框与圆角，可自定义颜色。', 'image', '边框 圆角 图片 border radius 相框', 'js/tools/pack-image2.js'),
    tool('image-collage', '多图拼接', '图片处理', '2–9 张图横向、纵向或网格拼接。', 'layers', '拼接 拼图 多图 网格 collage 长图', 'js/tools/pack-image2.js'),
    tool('image-base64-view', 'Base64 转图片', '图片处理', '粘贴 Base64 / Data URI 直接预览并下载。', 'image', 'base64 图片 预览 data uri 还原', 'js/tools/pack-image2.js'),
    tool('image-mosaic', '马赛克打码', '图片处理', '像素化或模糊处理，遮挡人脸与隐私信息。', 'image', '马赛克 打码 像素 模糊 隐私', 'js/tools/pack-image2.js'),
    tool('image-target-size', '压缩到指定大小', '图片处理', '二分查找质量参数，把图片压到目标 KB。', 'image', '压缩 指定大小 kb 体积 质量', 'js/tools/pack-image2.js'),
    tool('image-batch-resize', '批量缩放', '图片处理', '一次处理 20 张图片，按最大宽高等比缩小。', 'image', '批量 缩放 压缩 多图 resize 缩略图', 'js/tools/pack-image2.js'),
    tool('image-palette', '主色提取', '图片处理', '量化统计出现最多的颜色，生成配色板。', 'palette', '主色 配色 取色 palette 颜色 提取', 'js/tools/pack-image2.js'),
    tool('image-ico', 'favicon 生成', '图片处理', '生成含 6 种尺寸的 ICO，可直接当网站图标。', 'grid', 'ico favicon 图标 网站 生成', 'js/tools/pack-image2.js'),
    tool('image-compare', '图片对比', '图片处理', '两张图叠加擦除对比，同尺寸时统计差异像素。', 'eye', '对比 比较 图片 diff 擦除 差异', 'js/tools/pack-image2.js'),

    /* ---------------------- 随机生成（第二批 9 款） ---------------------- */
    tool('random-mac', 'MAC 地址生成', '随机生成', '批量生成单播 MAC，可指定 OUI 前缀与分隔符。', 'network', 'mac 地址 网卡 生成 oui 虚拟', 'js/tools/pack-random2.js'),
    tool('random-ip', '随机 IP', '随机生成', '在指定网段内生成随机 IP，支持自定义 CIDR。', 'network', 'ip 随机 网段 局域网 测试数据', 'js/tools/pack-random2.js'),
    tool('random-emoji', '随机 emoji', '随机生成', '按分类随机抽取 emoji，适合测试与占位。', 'dice', 'emoji 表情 随机 符号 占位', 'js/tools/pack-random2.js'),
    tool('random-matrix', '随机数表', '随机生成', '生成行列可调的随机数表，支持不重复。', 'grid', '随机数 表 矩阵 抽样 测试数据', 'js/tools/pack-random2.js'),
    tool('random-pin', 'PIN 验证码', '随机生成', '批量生成数字/字母验证码，可排除易混字符。', 'key', 'pin 验证码 密码 随机 邀请码', 'js/tools/pack-random2.js'),
    tool('lottery-numbers', '彩票机选', '随机生成', '双色球与大乐透随机选号，仅供娱乐。', 'dice', '彩票 双色球 大乐透 机选 随机', 'js/tools/pack-random2.js'),
    tool('random-decision', '随机决策', '随机生成', '纠结时让随机数帮你从多个选项里挑一个。', 'shuffle', '决策 选择 随机 抽签 决定', 'js/tools/pack-random2.js'),
    tool('card-deal', '扑克牌发牌', '随机生成', '洗牌并按人数发牌，可加入大小王与排序。', 'layers', '扑克 发牌 洗牌 纸牌 游戏', 'js/tools/pack-random2.js'),
    tool('dice-expression', '骰子表达式', '随机生成', '支持 2d6+3 这类表达式，输出每次点数明细。', 'dice', '骰子 d6 d20 跑团 随机 表达式', 'js/tools/pack-random2.js'),

    /* ---------------------- 开发辅助（第二批 18 款） ---------------------- */
    tool('json-path', 'JSON 路径提取', '开发辅助', '按 a.b[0] 路径取值，或列出全部叶子路径。', 'braces', 'json 路径 path 提取 取值 jsonpath', 'js/tools/pack-dev2.js'),
    tool('json-diff', 'JSON 对比', '开发辅助', '递归比较两个 JSON 的新增、删除与修改。', 'diff', 'json 对比 diff 差异 比较 变更', 'js/tools/pack-dev2.js'),
    tool('json-flatten', 'JSON 扁平化', '开发辅助', '把嵌套 JSON 压平成点号键值，便于导出表格。', 'braces', 'json 扁平 flatten 展开 键值 嵌套', 'js/tools/pack-dev2.js'),
    tool('yaml-to-json', 'YAML 转 JSON', '开发辅助', '解析常见 YAML 结构并输出格式化 JSON。', 'file', 'yaml yml json 转换 配置', 'js/tools/pack-dev2.js'),
    tool('xml-format', 'XML 格式化', '开发辅助', '按标签层级缩进 XML，保留注释与声明。', 'code', 'xml 格式化 缩进 美化 标签', 'js/tools/pack-dev2.js'),
    tool('css-unit', 'px / rem 换算', '开发辅助', 'px、rem、em、pt、vw 之间互相换算。', 'ruler', 'px rem em pt 换算 css 单位 响应式', 'js/tools/pack-dev2.js'),
    tool('css-grid-gen', 'CSS Grid 生成器', '开发辅助', '可视化调整列数、间距与对齐，生成网格代码。', 'grid', 'grid css 布局 生成器 网格 列', 'js/tools/pack-dev2.js'),
    tool('css-bezier', '贝塞尔曲线', '开发辅助', '调整 cubic-bezier 控制点并实时预览动效。', 'chart', '贝塞尔 bezier 动画 缓动 css transition', 'js/tools/pack-dev2.js'),
    tool('css-filter-gen', 'CSS 滤镜生成器', '开发辅助', '亮度、对比度、模糊等滤镜实时预览与导出。', 'brush', '滤镜 filter css 亮度 模糊 饱和度', 'js/tools/pack-dev2.js'),
    tool('markdown-table', 'Markdown 表格', '开发辅助', '把 CSV / TSV 文本转成 Markdown 表格。', 'grid', 'markdown 表格 md table csv 转换', 'js/tools/pack-dev2.js'),
    tool('markdown-toc', 'Markdown 目录', '开发辅助', '根据标题层级生成带锚点的目录列表。', 'list', 'markdown 目录 toc 标题 锚点 大纲', 'js/tools/pack-dev2.js'),
    tool('markdown-preview', 'Markdown 预览', '开发辅助', '本地渲染 Markdown 为 HTML 并即时预览。', 'file', 'markdown 预览 md 渲染 排版', 'js/tools/pack-dev2.js'),
    tool('gitignore-gen', '.gitignore 生成', '开发辅助', '按技术栈勾选，合并生成 .gitignore 规则。', 'file', 'gitignore git 忽略 规则 生成', 'js/tools/pack-dev2.js'),
    tool('license-gen', '开源协议生成', '开发辅助', '生成 MIT、BSD、ISC、Unlicense 协议全文。', 'file', '协议 license mit bsd apache 版权 开源', 'js/tools/pack-dev2.js'),
    tool('docker-run-gen', 'Docker 命令生成', '开发辅助', '按端口、卷、环境变量拼出 docker run 命令。', 'terminal', 'docker run 命令 容器 端口 挂载', 'js/tools/pack-dev2.js'),
    tool('color-shade', '颜色梯度', '开发辅助', '由基色生成明暗渐变并导出 CSS 变量。', 'palette', '颜色 梯度 明暗 色阶 css 变量', 'js/tools/pack-dev2.js'),
    tool('semver', '版本号工具', '开发辅助', '解析 SemVer、比较大小并给出下一版本号。', 'code', '版本 semver 版本号 比较 递增 npm', 'js/tools/pack-dev2.js'),
    tool('regex-generator', '正则生成器', '开发辅助', '一键生成手机号、邮箱、身份证等常用正则。', 'regex', '正则 regex 生成 手机号 邮箱 身份证', 'js/tools/pack-dev2.js'),

    /* ---------------------- 网络工具（第二批 7 款） ---------------------- */
    tool('ipv6-format', 'IPv6 格式化', '网络工具', 'IPv6 地址展开、压缩与类型识别。', 'network', 'ipv6 压缩 展开 地址 格式化', 'js/tools/pack-net2.js'),
    tool('ip-in-subnet', 'IP 网段判断', '网络工具', '判断 IP 是否属于某 CIDR 网段并给出范围。', 'network', 'ip 网段 判断 cidr 归属 子网', 'js/tools/pack-net2.js'),
    tool('cidr-split', '子网拆分', '网络工具', '把一个网段拆成多个等长子网并列出范围。', 'network', '子网 拆分 cidr 划分 掩码', 'js/tools/pack-net2.js'),
    tool('mac-format', 'MAC 地址格式', '网络工具', '冒号、短横线、点分写法互转并识别单播组播。', 'network', 'mac 格式 转换 冒号 短横线 cisco', 'js/tools/pack-net2.js'),
    tool('basic-auth', 'Basic Auth 工具', '网络工具', '生成或解析 HTTP Basic 认证头。', 'lock', 'basic auth 认证 base64 authorization http', 'js/tools/pack-net2.js'),
    tool('url-normalize', 'URL 规范化', '网络工具', '去掉 utm 等跟踪参数、排序参数并统一格式。', 'link', 'url 规范化 去参数 utm 清洗 链接', 'js/tools/pack-net2.js'),
    tool('id-card-validate', '身份证校验', '网络工具', '校验 18 位身份证并解析生日、性别与省份。', 'shield', '身份证 校验 号码 生日 性别 15位 18位', 'js/tools/pack-net2.js'),

    /* ---------------------- 文本处理（第三批 14 款） ---------------------- */
    tool('text-transpose', '行列互换', '文本处理', '把分隔符分隔的行与列整体转置。', 'grid', '转置 行列 互换 transpose 表格 交换', 'js/tools/pack-text3.js'),
    tool('text-grep', '行筛选', '文本处理', '按关键词或正则保留 / 删除匹配行，类似 grep。', 'search', '筛选 grep 过滤 匹配行 删除行 保留', 'js/tools/pack-text3.js'),
    tool('text-slug', 'Slug 生成', '文本处理', '标题转 URL 友好短横线格式，保留中文。', 'link', 'slug url 文件名 短横线 seo 别名', 'js/tools/pack-text3.js'),
    tool('text-case-toggle', '大小写切换', '文本处理', '全大写、全小写、每词首字母与句首字母转换。', 'type', '大小写 大写 小写 首字母 uppercase title', 'js/tools/pack-text3.js'),
    tool('text-emoji-strip', '移除 emoji', '文本处理', '去掉表情符号与零宽字符，只留干净文本。', 'brush', 'emoji 表情 移除 清理 零宽 不可见', 'js/tools/pack-text3.js'),
    tool('text-md-escape', 'Markdown 转义', '文本处理', '转义星号井号等特殊字符，或还原转义。', 'file', 'markdown 转义 md 星号 井号 escape', 'js/tools/pack-text3.js'),
    tool('text-nato', 'NATO 音标字母', '文本处理', '字母数字转 Alfa Bravo Charlie 通话字母表。', 'terminal', 'nato 音标 字母表 无线电 报读 icao', 'js/tools/pack-text3.js'),
    tool('text-vertical', '竖排文字', '文本处理', '文字改竖排从右往左读，支持分列。', 'type', '竖排 竖式 古文 排版 vertical 列', 'js/tools/pack-text3.js'),
    tool('text-abbrev', '首字母缩写', '文本处理', '从标题生成缩写词，中文取首字英文取词首。', 'type', '缩写 首字母 abbreviation 简称 acronyms', 'js/tools/pack-text3.js'),
    tool('text-camel-split', '命名拆词', '文本处理', 'camelCase / snake_case 拆成可读单词。', 'type', '拆词 驼峰 snake kebab 分词 标识符', 'js/tools/pack-text3.js'),
    tool('text-squeeze', '空白压缩', '文本处理', '压缩连续空格、空行与行首尾空白。', 'scissors', '压缩 空格 空白 squeeze 合并 清理', 'js/tools/pack-text3.js'),
    tool('text-para-format', '段落排版', '文本处理', '合并断行成段，支持首行缩进与中英加空格。', 'file', '段落 排版 缩进 断行 合并 中英文', 'js/tools/pack-text3.js'),
    tool('text-cut', '列截取', '文本处理', '按字段或字符位置截取，等价 cut 命令。', 'scissors', '截取 列 字段 cut 位置 裁剪', 'js/tools/pack-text3.js'),
    tool('text-strip-html', 'HTML 转纯文本', '文本处理', '去掉标签与脚本，保留可读文本与链接。', 'code', 'html 转文本 纯文本 去标签 strip 提取', 'js/tools/pack-text3.js'),

    /* ---------------------- 编码解码（第三批 12 款） ---------------------- */
    tool('quoted-printable', 'QP 编解码', '编码解码', 'RFC 2045 邮件 Quoted-Printable 编码与还原。', 'code', 'qp quoted printable 邮件 编码 =xx', 'js/tools/pack-codec3.js'),
    tool('base62', 'Base62 编解码', '编码解码', '0-9a-zA-Z 的 62 进制，短链常用。', 'code', 'base62 编码 解码 短链接 短id', 'js/tools/pack-codec3.js'),
    tool('crockford-base32', 'Crockford Base32', '编码解码', '去掉 I L O U 的易读 Base32 变体。', 'code', 'crockford base32 编码 解码 易读', 'js/tools/pack-codec3.js'),
    tool('hexdump', 'Hexdump 视图', '编码解码', '偏移 + 十六进制 + ASCII 三段对照。', 'code', 'hexdump xxd 十六进制 视图 字节', 'js/tools/pack-codec3.js'),
    tool('playfair', 'Playfair 密码', '编码解码', '5×5 双字母方阵密码，加密解密双向。', 'shield', 'playfair 密码 双字母 古典 方阵', 'js/tools/pack-codec3.js'),
    tool('tap-code', '敲击码', '编码解码', '波利比乌斯方阵敲点编码，隔墙传信。', 'terminal', '敲击码 tap 波利比乌斯 编码 隐写', 'js/tools/pack-codec3.js'),
    tool('braille', '盲文转换', '编码解码', '字母数字与 Unicode 盲文点字互转。', 'type', '盲文 braille 点字 编码 unicode', 'js/tools/pack-codec3.js'),
    tool('hmac-gen', 'HMAC 签名', '编码解码', '任意消息的 HMAC-SHA 签名，输出多种格式。', 'hash', 'hmac 签名 消息认证 sha256 验签', 'js/tools/pack-codec3.js'),
    tool('file-hash', '文件哈希', '编码解码', '计算文件 SHA-1/256/384/512 校验值。', 'hash', '文件 哈希 校验 sha256 下载 验证 完整性', 'js/tools/pack-codec3.js'),
    tool('luhn', 'Luhn 校验位', '编码解码', '校验卡号合法性或计算末位校验数字。', 'shield', 'luhn 校验位 卡号 信用卡 号码 银行卡', 'js/tools/pack-codec3.js'),
    tool('xor-cipher', 'XOR 加密', '编码解码', '字节级异或加解密，密钥循环使用。', 'shield', 'xor 异或 加密 解密 密钥 十六进制', 'js/tools/pack-codec3.js'),
    tool('escape-regex', '正则转义', '编码解码', '把用户输入安全嵌入正则或还原转义。', 'regex', '正则 转义 escape 元字符 字面匹配', 'js/tools/pack-codec3.js'),

    /* ---------------------- 时间日期（第三批 10 款） ---------------------- */
    tool('festival-countdown', '节日倒计时', '时间日期', '全年公历节日倒计时，附农历节日参考。', 'calendar', '节日 倒计时 春节 国庆 假期 纪念日', 'js/tools/pack-time3.js'),
    tool('julian-day', '儒略日转换', '时间日期', '公历与儒略日数 JDN / MJD 互转。', 'calendar', '儒略日 julian jdn mjd 天文 换算', 'js/tools/pack-time3.js'),
    tool('stopwatch', '秒表', '时间日期', '在线秒表，支持暂停、计次与圆环进度。', 'clock', '秒表 计时 stopwatch 计次 毫秒', 'js/tools/pack-time3.js'),
    tool('pomodoro', '番茄钟', '时间日期', '专注 / 休息自动切换的番茄工作法计时。', 'clock', '番茄钟 pomodoro 专注 计时 休息', 'js/tools/pack-time3.js'),
    tool('nth-weekday', '第 N 个星期几', '时间日期', '算母亲节这类「第 N 个星期 X」的日期。', 'calendar', '第几周 星期 母亲节 父亲节 感恩节 日期', 'js/tools/pack-time3.js'),
    tool('biz-hours', '工作时长计算', '时间日期', '统计区间内净工作时长，跳过周末节假日。', 'clock', '工作时长 排班 净时长 加班 统计', 'js/tools/pack-time3.js'),
    tool('days-in-month', '月天数查询', '时间日期', '全年 12 个月天数与第一天星期一览。', 'calendar', '天数 月份 大月 小月 二月 星期', 'js/tools/pack-time3.js'),
    tool('dst-check', '夏令时检测', '时间日期', '检测时区在指定年份是否切换夏令时。', 'clock', '夏令时 dst 时区 切换 检测', 'js/tools/pack-time3.js'),
    tool('year-calendar', '年历生成', '时间日期', '12 个月年历网格，高亮今天可打印。', 'grid', '年历 日历 全年 打印 calendar 一年', 'js/tools/pack-time3.js'),
    tool('year-progress', '年度进度', '时间日期', '今日 / 本周 / 本月 / 今年实时进度条。', 'chart', '进度 年度 本周 本月 百分比 时间', 'js/tools/pack-time3.js'),

    /* ---------------------- 计算换算（第三批 14 款） ---------------------- */
    tool('circle-calc', '圆与立体几何', '计算换算', '输入半径算圆、球、圆柱、圆锥全部几何量。', 'ruler', '圆 面积 周长 球 圆柱 圆锥 几何', 'js/tools/pack-calc3.js'),
    tool('pythagoras', '勾股定理', '计算换算', '已知两边求第三边，附角度与面积。', 'ruler', '勾股 直角三角形 斜边 边长 求边', 'js/tools/pack-calc3.js'),
    tool('bitwise', '位运算计算器', '计算换算', '与或非异或移位，附 32 位二进制对照。', 'cpu', '位运算 与 或 异或 移位 binary bit', 'js/tools/pack-calc3.js'),
    tool('log-calc', '对数计算', '计算换算', '任意底数对数，附 ln / lg / log2。', 'cpu', '对数 log ln lg 换底 计算', 'js/tools/pack-calc3.js'),
    tool('trig-calc', '三角函数', '计算换算', '正弦余弦正切与反三角，角度弧度互转。', 'cpu', '三角函数 sin cos tan 弧度 反三角', 'js/tools/pack-calc3.js'),
    tool('combinatorics', '排列组合', '计算换算', 'C(n,r)、P(n,r) 与阶乘，BigInt 精确。', 'cpu', '排列 组合 阶乘 c n r 概率 概算', 'js/tools/pack-calc3.js'),
    tool('pace-calc', '跑步配速', '计算换算', '距离与用时算配速，反推完赛时间。', 'percent', '配速 跑步 马拉松 pace 完赛 速度', 'js/tools/pack-calc3.js'),
    tool('dpi-calc', '屏幕像素密度', '计算换算', '分辨率与尺寸算 PPI、点距与有效密度。', 'chart', 'ppi dpi 像素密度 屏幕 点距 分辨率', 'js/tools/pack-calc3.js'),
    tool('aspect-ratio', '宽高比计算', '计算换算', '等比缩放换算宽高，识别常见比例。', 'ruler', '宽高比 比例 aspect 缩放 视频 图片', 'js/tools/pack-calc3.js'),
    tool('hourly-rate', '时薪换算', '计算换算', '年薪月薪日薪时薪互转，含加班倍率。', 'percent', '时薪 日薪 月薪 年薪 收入 换算', 'js/tools/pack-calc3.js'),
    tool('pet-age', '宠物年龄换算', '计算换算', '猫狗年龄折算人类年龄，按体型分档。', 'chart', '宠物 狗 猫 年龄 换算 狗龄', 'js/tools/pack-calc3.js'),
    tool('data-transfer', '下载时间计算', '计算换算', '按带宽算下载耗时，对比不同宽带。', 'chart', '下载 时间 带宽 宽带 mbps 传输', 'js/tools/pack-calc3.js'),
    tool('vat-calc', '增值税计算', '计算换算', '含税不含税价互转，13/9/6/3% 税率。', 'percent', '增值税 税额 含税 发票 税率 报价', 'js/tools/pack-calc3.js'),
    tool('resistor-color', '电阻色环', '计算换算', '4/5 环色环电阻读值，附色环对照。', 'chart', '电阻 色环 阻值 欧姆 电子 resistor', 'js/tools/pack-calc3.js'),

    /* ---------------------- 图片处理（第三批 9 款） ---------------------- */
    tool('image-format-convert', '图片格式转换', '图片处理', 'PNG / JPEG / WebP 互转并下载。', 'image', '格式转换 webp jpeg png 转 转换', 'js/tools/pack-image3.js'),
    tool('image-ascii', 'ASCII 字符画', '图片处理', '把图片转成字符画，可复制文本。', 'brush', '字符画 ascii 文字画 马赛克艺术 字符', 'js/tools/pack-image3.js'),
    tool('image-pixel-art', '像素风转换', '图片处理', '马赛克像素化并量化调色板，复古游戏风。', 'image', '像素风 像素画 复古 8bit 调色板 量化', 'js/tools/pack-image3.js'),
    tool('image-tint', '颜色叠加', '图片处理', '正片叠底、滤色等混合模式上色。', 'brush', '叠加 上色 色调 混合模式 duotone 染色', 'js/tools/pack-image3.js'),
    tool('image-noise', '噪点纹理', '图片处理', '生成胶片颗粒、彩色噪点或星空纹理。', 'image', '噪点 颗粒 星空 纹理 背景 noise', 'js/tools/pack-image3.js'),
    tool('image-vignette', '暗角效果', '图片处理', '径向渐变暗角，聚焦画面主体。', 'brush', '暗角 vignette 径向 聚焦 摄影', 'js/tools/pack-image3.js'),
    tool('image-gradient-gen', '渐变图生成', '图片处理', '生成可下载的渐变背景图与 CSS 代码。', 'palette', '渐变 背景 生成 gradient 色卡 壁纸', 'js/tools/pack-image3.js'),
    tool('image-pattern', '图案生成', '图片处理', '棋盘格、斜纹、波点、方格纸纹理。', 'palette', '图案 棋盘格 条纹 波点 底纹 纹理', 'js/tools/pack-image3.js'),
    tool('image-histogram', '图片直方图', '图片处理', '亮度与 RGB 通道直方图，判断曝光。', 'chart', '直方图 曝光 亮度 通道 histogram 色阶', 'js/tools/pack-image3.js'),

    /* ---------------------- 随机生成（第三批 9 款） ---------------------- */
    tool('random-color', '随机颜色', '随机生成', '限定亮度的可用配色，点击复制。', 'palette', '随机颜色 配色 hex 色值 调色', 'js/tools/pack-random3.js'),
    tool('weighted-pick', '加权抽取', '随机生成', '按权重比例抽取，统计与理论值对比。', 'dice', '加权 抽取 概率 抽奖 权重 随机', 'js/tools/pack-random3.js'),
    tool('mock-data', '假数据生成', '随机生成', '姓名手机邮箱假数据，TSV/CSV/JSON 输出。', 'list', '假数据 测试数据 mock 姓名 手机号 邮箱', 'js/tools/pack-random3.js'),
    tool('tournament', '对阵表生成', '随机生成', '单败淘汰抽签对阵，自动安排轮空。', 'grid', '对阵 淘汰赛 抽签 bracket 赛程 比赛', 'js/tools/pack-random3.js'),
    tool('secret-santa', '圣诞抽签', '随机生成', '礼物互送配对，不抽到自己。', 'dice', '圣诞 抽签 互送 礼物 santa 配对', 'js/tools/pack-random3.js'),
    tool('bingo-card', '宾果卡片', '随机生成', '美式 / 英式宾果卡片，可批量生成。', 'grid', '宾果 bingo 卡片 游戏 号码', 'js/tools/pack-random3.js'),
    tool('random-username', '用户名生成', '随机生成', '形容词 + 名词 + 数字的三段式用户名。', 'type', '用户名 昵称 username 注册 假名', 'js/tools/pack-random3.js'),
    tool('passphrase', '口令短语', '随机生成', 'XKCD 风格单词口令，好记且熵值高。', 'key', '口令短语 密码 短语 passphrase xkcd 记忆', 'js/tools/pack-random3.js'),
    tool('random-sudoku', '数独生成', '随机生成', '按难度生成数独题目与答案。', 'grid', '数独 sudoku 谜题 益智 生成', 'js/tools/pack-random3.js'),

    /* ---------------------- 开发辅助（第三批 19 款） ---------------------- */
    tool('json-merge', 'JSON 合并', '开发辅助', '深合并两份 JSON，数组可选拼接去重。', 'braces', 'json 合并 merge 深合并 覆盖 配置', 'js/tools/pack-dev3.js'),
    tool('json-sort-keys', 'JSON 键排序', '开发辅助', '按键名字典序递归排序，方便 diff。', 'braces', 'json 排序 键 sort 字典序 review', 'js/tools/pack-dev3.js'),
    tool('dotenv-parse', 'dotenv 转 JSON', '开发辅助', '解析 .env / INI 为 JSON，可转嵌套。', 'file', 'dotenv env ini 配置 转json 解析', 'js/tools/pack-dev3.js'),
    tool('curl-builder', 'curl 命令生成', '开发辅助', '按方法、头与请求体生成可粘贴 curl。', 'terminal', 'curl 命令 http 请求 生成 调试 api', 'js/tools/pack-dev3.js'),
    tool('robots-gen', 'robots.txt 生成', '开发辅助', '允许 / 禁止策略与自定义路径规则。', 'file', 'robots 爬虫 seo 抓取 收录 sitemap', 'js/tools/pack-dev3.js'),
    tool('meta-gen', 'SEO Meta 生成', '开发辅助', 'title、description 与 OG 分享标签。', 'file', 'meta og 分享 卡片 seo 标签 head', 'js/tools/pack-dev3.js'),
    tool('lorem-gen', '假文生成', '开发辅助', '拉丁 Lorem ipsum 或中文乱数假文。', 'file', '假文 lorem 占位 乱数 排版 测试', 'js/tools/pack-dev3.js'),
    tool('color-mix', '颜色混合', '开发辅助', '两色按比例插值，附透明叠白底效果。', 'palette', '颜色 混合 插值 透明 color-mix 调色', 'js/tools/pack-dev3.js'),
    tool('color-blind', '色盲模拟', '开发辅助', '模拟四类色觉障碍，检查图表配色。', 'eye', '色盲 色觉 无障碍 可访问性 配色 模拟', 'js/tools/pack-dev3.js'),
    tool('clip-path-gen', 'clip-path 生成', '开发辅助', '圆形、箭头、五角星等裁剪路径。', 'brush', 'clip-path 裁剪 形状 多边形 css 形状', 'js/tools/pack-dev3.js'),
    tool('flex-gen', 'Flex 布局生成器', '开发辅助', '可视化调 justify / align / gap。', 'grid', 'flex 弹性 布局 对齐 justify align', 'js/tools/pack-dev3.js'),
    tool('objectid-gen', 'MongoDB ObjectId', '开发辅助', '批量生成 ObjectId 并解析时间戳。', 'database', 'objectid mongodb mongo id 生成 解析', 'js/tools/pack-dev3.js'),
    tool('shell-escape', 'Shell 转义', '开发辅助', '参数安全转义为 bash / cmd / PS。', 'terminal', 'shell 转义 引号 bash cmd powershell', 'js/tools/pack-dev3.js'),
    tool('debounce-demo', '防抖节流演示', '开发辅助', '交互对比防抖与节流的触发时机。', 'cpu', '防抖 节流 debounce throttle 演示 事件', 'js/tools/pack-dev3.js'),
    tool('media-query-gen', '响应式断点', '开发辅助', '生成移动优先 / 桌面优先媒体查询。', 'grid', '媒体查询 响应式 断点 media query mobile', 'js/tools/pack-dev3.js'),
    tool('log-parser', '访问日志解析', '开发辅助', 'nginx 日志转表格，统计 IP 与状态码。', 'server', '日志 nginx 解析 访问 状态码 分析', 'js/tools/pack-dev3.js'),
    tool('commit-gen', '提交信息生成', '开发辅助', 'Conventional Commits 规范提交模板。', 'terminal', 'commit 提交 规范 conventional changelog', 'js/tools/pack-dev3.js'),
    tool('html-skeleton', 'HTML 模板生成', '开发辅助', '含 viewport 与暗色适配的页面骨架。', 'code', 'html 模板 骨架 boilerplate 脚手架 页面', 'js/tools/pack-dev3.js'),
    tool('sql-insert', 'SQL INSERT 生成', '开发辅助', 'CSV / TSV 数据转 INSERT，自动转义。', 'database', 'sql insert 插入 csv 转sql 批量', 'js/tools/pack-dev3.js'),

    /* ---------------------- 网络工具（第三批 10 款） ---------------------- */
    tool('ip-range-list', 'CIDR 展开', '网络工具', '网段展开为 IP 清单并标注首末地址。', 'network', 'ip 展开 清单 网段 cidr 地址列表', 'js/tools/pack-net3.js'),
    tool('ipv6-subnet', 'IPv6 子网计算', '网络工具', '网络地址、地址总数与掩码范围。', 'network', 'ipv6 子网 网段 前缀 计算 v6', 'js/tools/pack-net3.js'),
    tool('dns-records', 'DNS 记录速查', '网络工具', 'A / MX / TXT 等 10 类记录用法。', 'server', 'dns 记录 a mx cname txt 解析', 'js/tools/pack-net3.js'),
    tool('email-validate', '邮箱校验', '网络工具', '批量校验邮箱格式并纠正常见拼写。', 'shield', '邮箱 校验 email 格式 批量 拼写', 'js/tools/pack-net3.js'),
    tool('phone-validate', '手机号校验', '网络工具', '大陆 11 位号段校验并推测运营商。', 'shield', '手机号 校验 号段 运营商 移动 联通', 'js/tools/pack-net3.js'),
    tool('hosts-gen', 'hosts 记录生成', '网络工具', '批量生成 hosts 条目，本地调试解析。', 'server', 'hosts 域名 映射 解析 本地 调试', 'js/tools/pack-net3.js'),
    tool('cors-cheatsheet', 'CORS 速查', '网络工具', '常用 CORS 头与三大高频坑排查。', 'server', 'cors 跨域 预检 options credentials', 'js/tools/pack-net3.js'),
    tool('rest-cheatsheet', 'REST 方法速查', '网络工具', 'GET/POST/PUT 等语义与幂等性对照。', 'server', 'rest 方法 http 幂等 get put 语义', 'js/tools/pack-net3.js'),
    tool('mailto-builder', 'mailto 链接', '网络工具', '生成带主题正文的邮件唤起链接。', 'link', 'mailto 邮件 链接 联系我们 主题', 'js/tools/pack-net3.js'),
    tool('wifi-qr', 'WiFi 二维码文本', '网络工具', '生成扫码连 WiFi 的 WIFI: 字符串。', 'network', 'wifi 二维码 连接 扫码 网络 配置', 'js/tools/pack-net3.js'),

    /* ===== 第四批扩展（100 款） ===== */
    /* 文本处理 12 款 */
    tool('palindrome-check', '回文检测', '文本处理', '逐行判断是否回文，可忽略大小写与标点。', 'list', '回文 palindrome 对称 检测', 'js/tools/pack-text4.js'),
    tool('char-counter', '字符统计概览', '文本处理', '字符、字数、句数、字节与高频字符一次看清。', 'type', '字数 统计 字符 词数 高频', 'js/tools/pack-text4.js'),
    tool('line-stats', '行统计', '文本处理', '最长行、平均行长、中位数与行长分布。', 'list', '行 统计 长度 分布 最长', 'js/tools/pack-text4.js'),
    tool('line-shuffle', '行乱序', '文本处理', '按行随机打乱顺序，适合名单与题目洗牌。', 'shuffle', '乱序 打乱 随机 行 洗牌', 'js/tools/pack-text4.js'),
    tool('keyword-density', '关键词密度', '文本处理', '统计中英关键词频次与密度，辅助 SEO 与文案自查。', 'search', '关键词 密度 词频 seo 分析', 'js/tools/pack-text4.js'),
    tool('readability-score', '可读性评分', '文本处理', 'Flesch 阅读难度与句长统计，判断文案是否好读。', 'type', '可读性 flesch 阅读 难度 句长', 'js/tools/pack-text4.js'),
    tool('text-quote', '引用包裹', '文本处理', '给多行文本加引用前缀，一键生成 Markdown 引用块。', 'type', '引用 quote markdown 前缀', 'js/tools/pack-text4.js'),
    tool('text-chunk', '文本分块', '文本处理', '按字符或单词切分成固定长度的小块。', 'scissors', '分块 切分 分段 chunk 截断', 'js/tools/pack-text4.js'),
    tool('invisible-chars', '不可见字符清理', '文本处理', '揪出零宽空格、BOM、全角空格并一键清理。', 'eye', '零宽 不可见 空格 bom 清理 乱码', 'js/tools/pack-text4.js'),
    tool('group-separator', '字符分组分隔', '文本处理', '卡号、单号按 4 位分组，支持从右往左对齐。', 'type', '分组 银行卡 单号 分隔符 格式化', 'js/tools/pack-text4.js'),
    tool('line-diff-simple', '行集合差异', '文本处理', '比较两份清单的独有行与共有行。', 'diff', '差异 对比 行 集合 清单', 'js/tools/pack-text4.js'),
    tool('cjk-pad', '中英混排对齐', '文本处理', '按显示宽度补齐，汉字算两格，等宽对齐不乱。', 'grid', '对齐 中文 全角 宽度 补空格', 'js/tools/pack-text4.js'),

    /* 编码解码 12 款 */
    tool('base16', 'Base16 十六进制', '编码解码', '文本与十六进制互转，可加 0x 前缀与空格分隔。', 'hash', 'base16 hex 十六进制 编码', 'js/tools/pack-codec4.js'),
    tool('base36', 'Base36 编解码', '编码解码', '把 UTF-8 字节整体转成 0-9a-z 的短串。', 'hash', 'base36 编码 短id 进制', 'js/tools/pack-codec4.js'),
    tool('mime-encoded-word', '邮件主题编码', '编码解码', '中文主题转 RFC 2047 编码字，或反向解码。', 'code', '邮件 主题 编码 rfc2047 mime 乱码', 'js/tools/pack-codec4.js'),
    tool('varint', 'Varint 变长整数', '编码解码', 'Protobuf 风格变长整数与十六进制互转。', 'code', 'varint 变长整数 protobuf 编码', 'js/tools/pack-codec4.js'),
    tool('unicode-escape', 'Unicode 转义', '编码解码', '文本与 \\uXXXX / \\u{XXXXX} 转义序列互转。', 'code', 'unicode 转义 u4 码点 字面量', 'js/tools/pack-codec4.js'),
    tool('c-escape', 'C 风格转义', '编码解码', '处理 \\n \\t \\\\ 等转义，适合写进代码字符串。', 'code', 'c 转义 字符串 换行 反斜杠', 'js/tools/pack-codec4.js'),
    tool('uuencode', 'UUEncode 编解码', '编码解码', '老式邮件附件编码，3 字节转 4 个可打印字符。', 'code', 'uuencode uudecode 编码 邮件 附件', 'js/tools/pack-codec4.js'),
    tool('caesar-brute', '凯撒暴力破解', '编码解码', '一次列出 26 种位移结果，肉眼找出明文。', 'lock', '凯撒 破解 位移 暴力 密码', 'js/tools/pack-codec4.js'),
    tool('byte-frequency', '字节频率分析', '编码解码', '统计各字节出现次数与信息熵，判断数据特征。', 'chart', '字节 频率 熵 分析 统计', 'js/tools/pack-codec4.js'),
    tool('mojibake-fix', '乱码修复', '编码解码', '尝试 UTF-8 / GBK 反向还原，救回乱码文本。', 'eye', '乱码 修复 编码 gbk utf8 还原', 'js/tools/pack-codec4.js'),
    tool('url-part-encode', 'URL 分段编码', '编码解码', '区分 encodeURI 与 Component，避免多编码。', 'link', 'url 编码 参数 encodeuri component', 'js/tools/pack-codec4.js'),
    tool('rot47', 'ROT47 变形', '编码解码', '可打印 ASCII 的 47 位位移，自反可逆。', 'lock', 'rot47 位移 变形 加密 ascii', 'js/tools/pack-codec4.js'),

    /* 时间日期 12 款 */
    tool('date-valid', '日期合法性校验', '时间日期', '批量检查日期是否存在，含闰年与月末天数。', 'calendar', '日期 校验 合法 闰年 月末', 'js/tools/pack-time4.js'),
    tool('timezone-diff', '两时区时差', '时间日期', '对照两个时区的当前时间与偏移，自动处理夏令时。', 'clock', '时区 时差 对照 夏令时 utc', 'js/tools/pack-time4.js'),
    tool('unix-multi', '时间戳多格式', '时间日期', '一次给出秒、毫秒、ISO、RFC 与相对时间。', 'clock', '时间戳 unix 多格式 iso 相对', 'js/tools/pack-time4.js'),
    tool('date-format-custom', '自定义日期格式', '时间日期', '用 YYYY MM DD HH 等占位符拼出任意格式。', 'calendar', '格式化 模板 日期 yyyy mm dd', 'js/tools/pack-time4.js'),
    tool('day-of-year', '年积日', '时间日期', '一年中的第几天、剩余天数与年度进度。', 'calendar', '年积日 doy 第几天 进度', 'js/tools/pack-time4.js'),
    tool('work-hours', '工时计算', '时间日期', '上下班时间算有效工时、加班差与月度合计。', 'clock', '工时 上下班 打卡 加班 计算', 'js/tools/pack-time4.js'),
    tool('timestamp-units', '时间戳单位换算', '时间日期', '秒、毫秒、微秒、纳秒之间互相换算。', 'clock', '时间戳 毫秒 微秒 纳秒 单位', 'js/tools/pack-time4.js'),
    tool('date-parse', '日期智能解析', '时间日期', '识别多种日期写法并统一成标准格式。', 'calendar', '解析 日期 识别 格式 智能', 'js/tools/pack-time4.js'),
    tool('date-diff-exact', '日期精确差值', '时间日期', '年月日差值、总天数与工作日统计。', 'calendar', '日期 差值 工作日 天数 相差', 'js/tools/pack-time4.js'),
    tool('weekday-info', '星期与周次', '时间日期', '星期几、是否周末、ISO 周次与本周起止。', 'calendar', '星期 周次 周末 iso 周', 'js/tools/pack-time4.js'),
    tool('range-overlap', '时间段重叠', '时间日期', '判断两个时间段是否冲突并算出重叠时长。', 'clock', '时间段 重叠 冲突 区间', 'js/tools/pack-time4.js'),
    tool('moon-phase', '月相与月龄', '时间日期', '按朔望月周期推算月相、月龄与照亮比例。', 'calendar', '月相 月龄 满月 新月 天文', 'js/tools/pack-time4.js'),

    /* 计算换算 14 款 */
    tool('bmr', '基础代谢率', '计算换算', 'Mifflin-St Jeor 公式估算每日静息消耗。', 'chart', 'bmr 基础代谢 热量 卡路里', 'js/tools/pack-calc4.js'),
    tool('tdee', '每日总消耗', '计算换算', '按活动强度算 TDEE，给出减脂增肌热量目标。', 'chart', 'tdee 总消耗 热量 减脂 增肌', 'js/tools/pack-calc4.js'),
    tool('body-fat', '体脂率估算', '计算换算', '美国海军围度公式，输入颈腰臀围即可。', 'percent', '体脂 体脂率 围度 navy', 'js/tools/pack-calc4.js'),
    tool('ideal-weight', '标准体重', '计算换算', '四种经典公式 + 健康 BMI 区间对照。', 'ruler', '标准体重 理想体重 devine bmi', 'js/tools/pack-calc4.js'),
    tool('water-intake', '每日饮水量', '计算换算', '按体重、运动量与气温估算建议饮水。', 'chart', '饮水 喝水 每日 补水', 'js/tools/pack-calc4.js'),
    tool('fuel-cost', '油费计算', '计算换算', '按里程、百公里油耗与油价算油费与人均分摊。', 'chart', '油费 油耗 油钱 自驾 分摊', 'js/tools/pack-calc4.js'),
    tool('electricity-cost', '电费计算', '计算换算', '功率与时长算出度数、日/月/年电费。', 'chart', '电费 度数 功率 电耗 kwh', 'js/tools/pack-calc4.js'),
    tool('paint-calc', '涂料用量', '计算换算', '按面积、遍数、遮盖率算涂料升数与桶数。', 'brush', '涂料 乳胶漆 用量 刷墙 装修', 'js/tools/pack-calc4.js'),
    tool('tile-calc', '瓷砖数量', '计算换算', '铺贴面积算片数，含损耗与整片排版。', 'grid', '瓷砖 片数 装修 铺贴 损耗', 'js/tools/pack-calc4.js'),
    tool('loan-compare', '还款方式对比', '计算换算', '等额本息与等额本金逐项对比，看清利息差。', 'percent', '房贷 等额本息 等额本金 月供 利息', 'js/tools/pack-calc4.js'),
    tool('savings-goal', '储蓄目标测算', '计算换算', '给定目标与年限，反推每月需要存多少钱。', 'percent', '储蓄 目标 每月 存钱 理财', 'js/tools/pack-calc4.js'),
    tool('roi', '投资回报率', '计算换算', 'ROI 与年化 CAGR 一起算，适合横向比较。', 'chart', 'roi 回报率 投资 收益 年化', 'js/tools/pack-calc4.js'),
    tool('cagr', '年化复合增长率', '计算换算', '由首尾值算 CAGR，附 72 法则翻倍年数。', 'chart', 'cagr 年化 增长 复利 72法则', 'js/tools/pack-calc4.js'),
    tool('overtime-pay', '加班费计算', '计算换算', '按 1.5 / 2 / 3 倍计算加班费与月总收入。', 'clock', '加班费 加班 工资 倍率 劳动法', 'js/tools/pack-calc4.js'),

    /* 图片处理 8 款 */
    tool('img-info', '图片信息速览', '图片处理', '尺寸、宽高比、百万像素与打印尺寸一次看清。', 'image', '图片 信息 尺寸 分辨率 像素', 'js/tools/pack-image4.js'),
    tool('img-datauri', '图片转 Data URI', '图片处理', '生成可直接内联的 Base64 字符串并显示体积。', 'image', 'datauri base64 内联 图片', 'js/tools/pack-image4.js'),
    tool('img-print-size', '按打印尺寸输出', '图片处理', '按厘米 + DPI 换算像素，导出可冲印尺寸的图。', 'ruler', '打印 尺寸 dpi 冲印 像素 换算', 'js/tools/pack-image4.js'),
    tool('img-tint', '图片单色蒙版', '图片处理', '给照片叠加主题色，四种混合模式可调强度。', 'palette', '蒙版 色调 tint 滤镜 主题色', 'js/tools/pack-image4.js'),
    tool('img-frame', '图片加相框', '图片处理', '留白边框 + 内描边 + 投影，适合发图配文。', 'image', '相框 边框 留白 投影 图片', 'js/tools/pack-image4.js'),
    tool('img-strip-meta', '去除图片元数据', '图片处理', '重绘导出，清掉 EXIF、GPS 与相机信息。', 'shield', 'exif 元数据 隐私 去除 图片', 'js/tools/pack-image4.js'),
    tool('img-trim', '图片自动去白边', '图片处理', '按四角颜色自动裁掉纯色留白，可留边距。', 'scissors', '去白边 裁剪 留白 扫描件', 'js/tools/pack-image4.js'),
    tool('img-scale-percent', '按百分比缩放', '图片处理', '输入 25% / 50% 直接缩放导出，可选格式质量。', 'image', '缩放 百分比 放大 缩小 图片', 'js/tools/pack-image4.js'),

    /* 随机生成 10 款 */
    tool('random-hex', '随机十六进制', '随机生成', '批量生成指定字节数的安全随机十六进制串。', 'dice', '随机 hex 十六进制 密钥 随机数', 'js/tools/pack-random4.js'),
    tool('random-date', '随机日期', '随机生成', '在指定区间内生成随机日期或日期时间。', 'dice', '随机 日期 时间 区间 测试数据', 'js/tools/pack-random4.js'),
    tool('random-name-cn', '随机中文姓名', '随机生成', '常见姓氏与名字组合，支持去重与 JSON 输出。', 'dice', '姓名 中文 随机 假数据 测试', 'js/tools/pack-random4.js'),
    tool('random-company', '随机公司名', '随机生成', '地区 + 行业 + 后缀组合出公司名称。', 'dice', '公司 名称 随机 企业 占位', 'js/tools/pack-random4.js'),
    tool('random-address', '随机地址', '随机生成', '按省市 + 道路 + 门牌生成虚构地址。', 'dice', '地址 随机 省市区 门牌 假数据', 'js/tools/pack-random4.js'),
    tool('random-template', '随机模板填充', '随机生成', '用姓名 / 城市 / 日期等占位符批量生成文本。', 'type', '模板 占位符 假数据 批量 生成', 'js/tools/pack-random4.js'),
    tool('random-gaussian', '正态分布随机数', '随机生成', 'Box-Muller 生成指定均值与标准差的样本。', 'dice', '正态分布 高斯 随机数 标准差 模拟', 'js/tools/pack-random4.js'),
    tool('random-serial', '序列号生成', '随机生成', '可设字符集、长度、前缀与分隔的批量序列号。', 'dice', '序列号 券码 激活码 随机 生成', 'js/tools/pack-random4.js'),
    tool('random-gradient', '随机渐变', '随机生成', '生成 linear-gradient CSS，附可视化预览。', 'palette', '渐变 gradient css 背景 随机', 'js/tools/pack-random4.js'),
    tool('random-sentence', '随机短句', '随机生成', '词库组合生成文案占位句，两种风格可选。', 'type', '短句 文案 随机 占位 句子', 'js/tools/pack-random4.js'),

    /* 开发辅助 16 款 */
    tool('uuid-validate', 'UUID 校验', '开发辅助', '批量校验 UUID 并识别版本与变体。', 'shield', 'uuid 校验 版本 变体 guid', 'js/tools/pack-dev4.js'),
    tool('semver-compare', '语义化版本比较', '开发辅助', '严格按 SemVer 2.0 比较，支持批量排序。', 'layers', 'semver 版本 比较 排序 语义化', 'js/tools/pack-dev4.js'),
    tool('json-query', 'JSON 与 Query 互转', '开发辅助', '嵌套 JSON 拍平成 query string，或反向还原。', 'braces', 'json query 参数 转换 拍平', 'js/tools/pack-dev4.js'),
    tool('commit-lint', 'Commit 信息校验', '开发辅助', '按 Conventional Commits 检查格式与长度。', 'terminal', 'commit 提交信息 规范 校验 conventional', 'js/tools/pack-dev4.js'),
    tool('changelog-gen', 'CHANGELOG 生成', '开发辅助', '提交列表按 type 归类，输出标准变更日志。', 'list', 'changelog 变更日志 提交 版本', 'js/tools/pack-dev4.js'),
    tool('code-stats', '代码行数统计', '开发辅助', '区分代码行、注释行、空行并算占比。', 'terminal', '代码 行数 统计 注释 空行', 'js/tools/pack-dev4.js'),
    tool('indent-convert', '缩进风格转换', '开发辅助', 'Tab 与 2 / 4 / 8 空格互转，保持层级。', 'code', '缩进 tab 空格 转换 格式化', 'js/tools/pack-dev4.js'),
    tool('url-join', 'URL 片段拼接', '开发辅助', '安全拼接路径，自动去重斜杠与相对路径。', 'link', 'url 拼接 路径 斜杠 join', 'js/tools/pack-dev4.js'),
    tool('css-var-extract', 'CSS 变量提取', '开发辅助', '从样式表里抽出全部自定义属性并生成声明。', 'palette', 'css 变量 var 提取 主题', 'js/tools/pack-dev4.js'),
    tool('api-mock', '字段定义生成 JSON', '开发辅助', '按字段与类型生成示例 JSON，可输出数组。', 'braces', 'mock 接口 字段 json 示例 假数据', 'js/tools/pack-dev4.js'),
    tool('datauri-info', 'Data URI 解析', '开发辅助', '解析 MIME、编码方式、体积并预览图片。', 'image', 'datauri 解析 mime base64 体积', 'js/tools/pack-dev4.js'),
    tool('regex-escape', '正则元字符转义', '开发辅助', '把用户输入安全转成正则字面量或反向还原。', 'regex', '正则 转义 元字符 字面量', 'js/tools/pack-dev4.js'),
    tool('sql-where', 'SQL WHERE 生成', '开发辅助', '多条件行转 WHERE 子句，自动加引号。', 'database', 'sql where 条件 生成 查询', 'js/tools/pack-dev4.js'),
    tool('number-format', '数字格式化', '开发辅助', '千分位、货币、百分比、万 / 亿缩写一键转换。', 'chart', '数字 格式化 千分位 货币 百分比', 'js/tools/pack-dev4.js'),
    tool('env-example', '.env 生成示例', '开发辅助', '把真实配置转成可提交的 .env.example。', 'lock', 'env 环境变量 示例 密钥 打码', 'js/tools/pack-dev4.js'),
    tool('path-normalize', '路径风格转换', '开发辅助', 'Windows 与 Unix 路径互转并规范化 ..', 'file', '路径 windows unix 斜杠 规范化', 'js/tools/pack-dev4.js'),

    /* 网络工具 6 款 */
    tool('ip-classify', 'IP 类型判断', '网络工具', '识别私有、回环、链路本地、组播与保留地址。', 'globe', 'ip 类型 私有 公网 回环 保留', 'js/tools/pack-net4.js'),
    tool('ua-parse', 'User-Agent 解析', '网络工具', '从 UA 中拆出浏览器、内核、系统与设备。', 'eye', 'ua useragent 浏览器 设备 解析', 'js/tools/pack-net4.js'),
    tool('mime-type', 'MIME 类型对照', '网络工具', '扩展名与 MIME 双向查询，覆盖常见格式。', 'file', 'mime 扩展名 类型 content-type', 'js/tools/pack-net4.js'),
    tool('url-query-edit', 'URL 参数增删改', '网络工具', '用命令式语句修改 query，保留其余部分。', 'link', 'url 参数 query 修改 删除 重命名', 'js/tools/pack-net4.js'),
    tool('ipv4-range', 'IPv4 网段换算', '网络工具', 'IP 与整数互转，算出网络、广播与可用范围。', 'network', 'ipv4 网段 cidr 掩码 广播 整数', 'js/tools/pack-net4.js'),
    tool('cookie-builder', 'Set-Cookie 生成', '网络工具', '拼装带 SameSite / Secure / HttpOnly 的响应头。', 'server', 'cookie set-cookie samesite secure httponly', 'js/tools/pack-net4.js'),

    /* 生活实用 10 款（新分类） */
    tool('zodiac-sign', '星座查询', '生活实用', '按公历生日查星座、属性、守护星与性格。', 'calendar', '星座 生日 日期 火象 水象', 'js/tools/pack-life4.js'),
    tool('chinese-zodiac', '生肖与干支', '生活实用', '由年份推生肖、干支与大致年龄。', 'calendar', '生肖 干支 属相 年龄 农历', 'js/tools/pack-life4.js'),
    tool('blood-type', '血型遗传', '生活实用', '父母血型推算子女可能的血型与概率。', 'shield', '血型 遗传 abo 父母 子女', 'js/tools/pack-life4.js'),
    tool('cooking-convert', '烹饪单位换算', '生活实用', '杯、勺、毫升、克按食材密度互换。', 'ruler', '烹饪 换算 杯 勺 克 毫升', 'js/tools/pack-life4.js'),
    tool('sleep-cycle', '睡眠周期', '生活实用', '按 90 分钟周期推算最佳入睡或起床时间。', 'clock', '睡眠 周期 起床 入睡 90分钟', 'js/tools/pack-life4.js'),
    tool('waist-hip', '腰臀比', '生活实用', '算腰臀比并按 WHO 标准评估代谢风险。', 'chart', '腰臀比 whr 腰围 健康 风险', 'js/tools/pack-life4.js'),
    tool('shoe-size', '鞋码对照', '生活实用', '由脚长换算中国、欧、美、英、日码。', 'ruler', '鞋码 脚长 尺码 换算 eu us', 'js/tools/pack-life4.js'),
    tool('anniversary', '纪念日计算', '生活实用', '在一起多少天、周年与下一个整百天。', 'calendar', '纪念日 天数 周年 恋爱 倒计时', 'js/tools/pack-life4.js'),
    tool('caffeine', '咖啡因代谢', '生活实用', '按半衰期推算何时降到安全水平、几点后别喝。', 'chart', '咖啡因 代谢 半衰期 睡眠 咖啡', 'js/tools/pack-life4.js'),
    tool('alcohol', '酒精代谢估算', '生活实用', 'Widmark 公式估算血液酒精浓度与代谢时间。', 'chart', '酒精 代谢 血液酒精 bac 解酒', 'js/tools/pack-life4.js'),
    /* ===== 第五批扩展（100 款） ===== */
    /* 文本处理 12 款 */
    tool('text-sort-natural', '自然排序', '文本处理', '把 file2 排在 file10 前面，按数字与拼音自然排序。', 'list', '自然排序 文件名 数字 拼音 sort', 'js/tools/pack-text5.js'),
    tool('text-mirror', '镜像文字', '文本处理', '水平镜像与上下翻转，括号会对称替换。', 'type', '镜像 翻转 倒序 文字 mirror', 'js/tools/pack-text5.js'),
    tool('fancy-text', '花体字转换', '文本处理', '把字母转成粗体、手写、双线等 Unicode 花体。', 'type', '花体 字体 unicode 粗体 手写', 'js/tools/pack-text5.js'),
    tool('text-long-lines', '超长行检测', '文本处理', '找出超过指定长度的行，便于排查长行与折行问题。', 'list', '超长行 行宽 检测 lint 折行', 'js/tools/pack-text5.js'),
    tool('csv-quote', 'CSV 引号处理', '文本处理', '给含逗号或引号的字段补引号，或反向去掉。', 'file', 'csv 引号 转义 逗号 字段', 'js/tools/pack-text5.js'),
    tool('lines-to-sql', '行转 SQL IN', '文本处理', '多行文本转成 SQL IN 列表，自动加引号。', 'database', 'sql in 列表 引号 批量 查询', 'js/tools/pack-text5.js'),
    tool('lines-to-json', '行转 JSON 数组', '文本处理', '每行转成 JSON 字符串元素，支持按类型推断。', 'braces', '行 json 数组 转换 引号', 'js/tools/pack-text5.js'),
    tool('number-sequence', '数字序列生成', '文本处理', '按起始值、步长与位数批量生成数字序列。', 'list', '序列 数字 步长 生成 编号', 'js/tools/pack-text5.js'),
    tool('unicode-normalize', 'Unicode 归一化', '文本处理', 'NFC / NFD / NFKC 互转，排查看起来一样却不相等。', 'type', 'unicode nfc nfd 归一化 组合字符', 'js/tools/pack-text5.js'),
    tool('text-remove-accents', '去变音符号', '文本处理', '把 café 变成 cafe，生成可做文件名的 ASCII 文本。', 'type', '变音 重音 符号 ascii 拉丁', 'js/tools/pack-text5.js'),
    tool('text-reading-time', '阅读时长估算', '文本处理', '按中英文语速估算朗读与阅读所需时间。', 'clock', '阅读 时长 字数 朗读 语速', 'js/tools/pack-text5.js'),
    tool('text-split-sentence', '按句切分', '文本处理', '按中英文句末标点切句，每句一行便于翻译。', 'type', '切句 分句 句子 标点 翻译', 'js/tools/pack-text5.js'),

    /* 编码解码 12 款 */
    tool('base45', 'Base45 编解码', '编码解码', '比 Base64 更适合二维码字母数字模式的编码方式。', 'code', 'base45 编码 二维码 rfc9285', 'js/tools/pack-codec5.js'),
    tool('gray-code', '格雷码转换', '编码解码', '二进制与格雷码互转，相邻码只差一位。', 'cpu', '格雷码 gray 二进制 编码器 转换', 'js/tools/pack-codec5.js'),
    tool('bcd-code', 'BCD 编码', '编码解码', '十进制数字与压缩 / 非压缩 BCD 字节互转。', 'cpu', 'bcd 8421 压缩 字节 时钟', 'js/tools/pack-codec5.js'),
    tool('columnar-cipher', '列置换密码', '编码解码', '按密钥字母顺序重排列，经典换位加密。', 'lock', '列置换 换位 密码 密钥 加密', 'js/tools/pack-codec5.js'),
    tool('zalgo-text', 'Zalgo 抖动文字', '编码解码', '叠加 Unicode 组合符，做出上下抖动的字效。', 'type', 'zalgo 抖动 组合符 乱码 特效', 'js/tools/pack-codec5.js'),
    tool('leetspeak', '1337 火星文', '编码解码', '把字母替换成数字与符号，也可反向还原。', 'type', '1337 leet 火星文 替代 黑客', 'js/tools/pack-codec5.js'),
    tool('barcode-code39', 'Code 39 条形码', '编码解码', '纯本地生成 Code 39 条码 SVG，可加 MOD-43 校验。', 'grid', '条形码 code39 条码 svg 标签', 'js/tools/pack-codec5.js'),
    tool('crc16', 'CRC16 校验', '编码解码', '一次算出 CCITT / MODBUS / XMODEM 等五种校验值。', 'shield', 'crc16 modbus 校验 校验和 通讯', 'js/tools/pack-codec5.js'),
    tool('netstring', 'Netstring 编码', '编码解码', '长度:数据, 格式的编码与解析，适合流式协议。', 'code', 'netstring 长度 协议 序列化 解析', 'js/tools/pack-codec5.js'),
    tool('pem-format', 'PEM 分块', '编码解码', '给 Base64 加证书包头并按 64 字符换行。', 'key', 'pem 证书 密钥 base64 换行', 'js/tools/pack-codec5.js'),
    tool('dna-encode', 'DNA 碱基编码', '编码解码', '每字节 4 个碱基，把文本编码成 ACGT 序列。', 'hash', 'dna 碱基 acgt 编码 序列', 'js/tools/pack-codec5.js'),
    tool('keyboard-offset', '键盘错位还原', '编码解码', '把整体偏一格的乱码文本按 QWERTY 还原。', 'type', '键盘 错位 还原 qwerty 乱码', 'js/tools/pack-codec5.js'),

    /* 时间日期 12 款 */
    tool('iso-duration', 'ISO 8601 时长', '时间日期', '解析或生成 P1Y2M3DT4H5M6S 形式的时长。', 'clock', 'iso8601 时长 duration 周期 解析', 'js/tools/pack-time5.js'),
    tool('rfc-date', 'RFC 邮件日期', '时间日期', '一次生成 RFC 2822 / 3339 / HTTP Date 三种格式。', 'clock', 'rfc2822 rfc3339 邮件 日期 格式', 'js/tools/pack-time5.js'),
    tool('date-sort', '日期排序', '时间日期', '多行日期按时间排序并统一格式，识别多种写法。', 'calendar', '日期 排序 批量 格式 统一', 'js/tools/pack-time5.js'),
    tool('date-weekday-tag', '批量标注星期', '时间日期', '给每行日期补上星期与 ISO 周次，可标记周末。', 'calendar', '星期 周次 标注 批量 周末', 'js/tools/pack-time5.js'),
    tool('time-round', '时间取整', '时间日期', '按 6 / 15 / 30 分钟取整，直接算计费金额。', 'clock', '取整 计费 分钟 账单 时间', 'js/tools/pack-time5.js'),
    tool('week-parity', '单双周判断', '时间日期', '按基准周推算单双周，排班与轮值不再算错。', 'calendar', '单双周 轮换 排班 基准 周', 'js/tools/pack-time5.js'),
    tool('date-en-ordinal', '英文序数日期', '时间日期', '生成 January 1st, 2026 等英美两种写法。', 'calendar', '英文 日期 序数 ordinal 美式 英式', 'js/tools/pack-time5.js'),
    tool('time-ago', '相对时间描述', '时间日期', '把时间戳转成「3 天前」这类友好描述。', 'clock', '相对时间 多久 之前 时间戳 友好', 'js/tools/pack-time5.js'),
    tool('date-bucket', '日期分组统计', '时间日期', '按年 / 季 / 月 / 周 / 星期分组计数并显示占比。', 'chart', '分组 统计 按月 按周 占比', 'js/tools/pack-time5.js'),
    tool('time-12-24', '12 / 24 小时制', '时间日期', '两种时间制互转，12 AM 与 12 PM 不再搞混。', 'clock', '12小时 24小时 am pm 转换', 'js/tools/pack-time5.js'),
    tool('date-extremes', '最早最晚跨度', '时间日期', '找出最早、最晚日期与总跨度、平均间隔。', 'calendar', '最早 最晚 跨度 区间 间隔', 'js/tools/pack-time5.js'),
    tool('meeting-planner', '跨时区会议', '时间日期', '把会议时间换算到 8 个城市并标出工作时段。', 'network', '时区 会议 换算 跨时区 夏令时', 'js/tools/pack-time5.js'),

    /* 计算换算 14 款 */
    tool('unit-torque', '扭矩换算', '计算换算', 'N·m、kgf·m、lbf·ft 互转，拧螺丝不再靠猜。', 'ruler', '扭矩 牛米 磅力 换算 扳手', 'js/tools/pack-calc5.js'),
    tool('unit-flow', '流量换算', '计算换算', 'L/min、m³/h、GPM、CFM 互相换算。', 'ruler', '流量 升 立方米 cfm gpm 换算', 'js/tools/pack-calc5.js'),
    tool('unit-density', '密度换算', '计算换算', 'g/cm³、kg/m³、lb/ft³ 互转，判断抛货与重货。', 'ruler', '密度 比重 kg/m3 磅 换算', 'js/tools/pack-calc5.js'),
    tool('number-to-words-en', '数字转英文', '计算换算', '把 1234567 写成英文单词，支票与合同常用。', 'type', '英文 数字 单词 金额 支票', 'js/tools/pack-calc5.js'),
    tool('ratio-alloc', '比例分配', '计算换算', '按比例分账、分摊费用，余数自动补齐合计。', 'percent', '比例 分配 分账 分摊 占比', 'js/tools/pack-calc5.js'),
    tool('margin-calc', '毛利率换算', '计算换算', '毛利率、加价率与毛利额，一次算清定价。', 'percent', '毛利率 加价率 定价 成本 利润', 'js/tools/pack-calc5.js'),
    tool('break-even', '盈亏平衡', '计算换算', '算保本销量与安全边际，判断这门生意能不能做。', 'chart', '盈亏 保本 边际贡献 安全边际 销量', 'js/tools/pack-calc5.js'),
    tool('depreciation', '折旧计算', '计算换算', '直线法、双倍余额递减、年数总和逐年列清。', 'chart', '折旧 直线法 余额递减 年数总和 资产', 'js/tools/pack-calc5.js'),
    tool('probability-odds', '赔率与期望', '计算换算', '赔率反推隐含概率，并算出下注期望收益。', 'dice', '赔率 概率 期望 下注 价值', 'js/tools/pack-calc5.js'),
    tool('gpa-calc', 'GPA 加权计算', '计算换算', '按学分加权算 GPA，也支持百分制加权平均。', 'percent', 'gpa 绩点 学分 加权 成绩', 'js/tools/pack-calc5.js'),
    tool('sci-notation', '科学计数法', '计算换算', '科学计数法、工程计数法与普通写法互转。', 'hash', '科学计数法 数量级 工程 指数 转换', 'js/tools/pack-calc5.js'),
    tool('significant-figs', '有效数字修约', '计算换算', '数清有效位数并按指定位数修约，实验记录必备。', 'hash', '有效数字 修约 精度 保留 位数', 'js/tools/pack-calc5.js'),
    tool('round-modes', '取整方式对照', '计算换算', 'floor / ceil / trunc / 银行家舍入一次看清差异。', 'percent', '取整 四舍五入 银行家 截断 舍入', 'js/tools/pack-calc5.js'),
    tool('paper-size', '纸张尺寸对照', '计算换算', 'A / B / C 系列毫米、英寸与指定 DPI 像素。', 'file', '纸张 a4 尺寸 开本 dpi 打印', 'js/tools/pack-calc5.js'),

    /* 图片处理 8 款 */
    tool('img-color-swap', '指定颜色替换', '图片处理', '按容差替换某个颜色，纯色底换品牌色。', 'palette', '颜色 替换 容差 抠图 换色', 'js/tools/pack-image5.js'),
    tool('img-scan-doc', '扫描件增强', '图片处理', '手机拍的纸文件转成白底黑字，接近扫描仪效果。', 'file', '扫描 文档 增强 白底 去灰', 'js/tools/pack-image5.js'),
    tool('img-halftone', '半调网点', '图片处理', '用大小不一的圆点表现明暗，印刷风质感。', 'grid', '半调 网点 印刷 圆点 质感', 'js/tools/pack-image5.js'),
    tool('img-sharpen', '图片锐化', '图片处理', '卷积锐化增强边缘，截图文字更清晰。', 'image', '锐化 卷积 边缘 清晰 增强', 'js/tools/pack-image5.js'),
    tool('img-flatten', '透明合成底色', '图片处理', '把 PNG 透明区合成到指定底色，避免显示为黑块。', 'layers', '透明 png 底色 合成 不透明', 'js/tools/pack-image5.js'),
    tool('img-posterize', '色调分离', '图片处理', '压缩色阶做出大色块海报与丝网印风格。', 'palette', '色调分离 色阶 海报 插画 量化', 'js/tools/pack-image5.js'),
    tool('img-grid', '构图网格', '图片处理', '叠加三分线或等分网格，构图参考一目了然。', 'grid', '构图 三分法 网格 参考线 摄影', 'js/tools/pack-image5.js'),
    tool('img-white-balance', '色温微调', '图片处理', '用色温与色调增益修正偏黄、偏蓝的照片。', 'palette', '白平衡 色温 色调 偏色 修正', 'js/tools/pack-image5.js'),

    /* 随机生成 10 款 */
    tool('random-number-list', '随机整数列表', '随机生成', '区间内取数，可去重、排序、选分隔符。', 'dice', '随机 整数 去重 抽奖 列表', 'js/tools/pack-random5.js'),
    tool('random-ipv6', '随机 IPv6', '随机生成', '批量生成 IPv6 地址，可固定前缀与压缩写法。', 'network', 'ipv6 随机 地址 前缀 测试', 'js/tools/pack-random5.js'),
    tool('random-word', '随机英文单词', '随机生成', '从 1200 个常用词里抽取，做命名与练习出题。', 'type', '随机 单词 英文 词库 命名', 'js/tools/pack-random5.js'),
    tool('random-codename', '项目代号', '随机生成', '生成「静默信标」「NEBULA-42」这类内部代号。', 'dice', '代号 项目 命名 版本 分支', 'js/tools/pack-random5.js'),
    tool('random-coords', '随机经纬度', '随机生成', '按全球、中国或自定义范围生成坐标文本。', 'globe', '经纬度 坐标 随机 地图 测试', 'js/tools/pack-random5.js'),
    tool('random-imei', 'IMEI 生成', '随机生成', '生成带 Luhn 校验位的 15 位 IMEI 测试号。', 'hash', 'imei 随机 设备 luhn 测试', 'js/tools/pack-random5.js'),
    tool('random-plate', '车牌号生成', '随机生成', '生成普通与新能源车牌，用于表单与界面测试。', 'list', '车牌 号码 随机 新能源 测试', 'js/tools/pack-random5.js'),
    tool('random-cron', '随机 Cron', '随机生成', '生成能跑的 cron 表达式，附中文调度说明。', 'clock', 'cron 定时 随机 表达式 调度', 'js/tools/pack-random5.js'),
    tool('random-ua', '随机 User-Agent', '随机生成', '按浏览器与系统拼装 UA，爬虫与埋点造样本。', 'globe', 'ua user-agent 随机 浏览器 爬虫', 'js/tools/pack-random5.js'),
    tool('random-api-key', '随机 API Key', '随机生成', '带 sk_live_ 等前缀的占位密钥，标注熵值。', 'key', 'api key 随机 密钥 token 测试', 'js/tools/pack-random5.js'),

    /* 开发辅助 16 款 */
    tool('ts-to-json', 'TS 接口转 JSON', '开发辅助', '按接口字段类型生成一份可用的 JSON 样例。', 'braces', 'typescript 接口 json mock 样例', 'js/tools/pack-dev5.js'),
    tool('json-schema-gen', 'JSON 转 Schema', '开发辅助', '由真实数据反推 JSON Schema，直接用于校验。', 'braces', 'json schema 生成 校验 draft', 'js/tools/pack-dev5.js'),
    tool('css-animation-gen', 'CSS 动画生成', '开发辅助', '预览并导出 fadeIn / slideUp 等 keyframes 动画。', 'brush', 'css 动画 keyframes 过渡 缓动', 'js/tools/pack-dev5.js'),
    tool('css-clamp-gen', 'clamp 流式字号', '开发辅助', '按两端字号算出 clamp() 公式，省掉媒体查询。', 'ruler', 'clamp 字号 响应式 视口 流体', 'js/tools/pack-dev5.js'),
    tool('svg-optimize', 'SVG 精简', '开发辅助', '去掉注释、metadata 与多余精度，体积立减一半。', 'image', 'svg 精简 压缩 优化 体积', 'js/tools/pack-dev5.js'),
    tool('regex-explain', '正则逐段解释', '开发辅助', '把复杂正则拆成单元逐条说明，读别人的正则不再发懵。', 'regex', '正则 解释 拆解 说明 学习', 'js/tools/pack-dev5.js'),
    tool('html-to-jsx', 'HTML 转 JSX', '开发辅助', 'class、style、自闭合标签一并转成 JSX 写法。', 'code', 'html jsx react 转换 classname', 'js/tools/pack-dev5.js'),
    tool('semver-range', '版本范围判定', '开发辅助', '判断版本是否满足 ^ ~ >= 与 x 范围写法。', 'layers', '版本 范围 semver 依赖 匹配', 'js/tools/pack-dev5.js'),
    tool('package-json-gen', 'package.json 生成', '开发辅助', '填几个字段就生成规范的 package.json。', 'file', 'package.json npm 生成 依赖 脚本', 'js/tools/pack-dev5.js'),
    tool('tsconfig-gen', 'tsconfig 生成', '开发辅助', '按框架选型生成合理的 compilerOptions 与别名。', 'terminal', 'tsconfig typescript 配置 别名 编译', 'js/tools/pack-dev5.js'),
    tool('dockerfile-gen', 'Dockerfile 生成', '开发辅助', '按技术栈生成多阶段、非 root 的 Dockerfile。', 'server', 'dockerfile docker 镜像 多阶段 构建', 'js/tools/pack-dev5.js'),
    tool('github-action-gen', 'Actions 工作流', '开发辅助', '生成带缓存与多步骤的 GitHub Actions CI 配置。', 'shuffle', 'github actions ci 工作流 yml', 'js/tools/pack-dev5.js'),
    tool('nginx-config-gen', 'Nginx 反代配置', '开发辅助', '含 HTTPS、WebSocket 与静态目录的反向代理配置。', 'server', 'nginx 反向代理 https websocket 配置', 'js/tools/pack-dev5.js'),
    tool('sql-create-table', '字段转建表语句', '开发辅助', '写字段列表就生成 CREATE TABLE，含主键与默认值。', 'database', 'sql 建表 create table 字段 ddl', 'js/tools/pack-dev5.js'),
    tool('enum-gen', '枚举代码生成', '开发辅助', '一份枚举同时生成 TS / Python / Go / Java / C#。', 'list', '枚举 enum 代码 多语言 常量', 'js/tools/pack-dev5.js'),
    tool('branch-name', '分支名生成', '开发辅助', '按 type/工单号/slug 生成规范分支名，也能反向解析。', 'code', '分支 git branch 命名 规范 工单', 'js/tools/pack-dev5.js'),

    /* 网络工具 6 款 */
    tool('url-anatomy', 'URL 结构拆解', '网络工具', '逐段拆解协议、主机、端口、路径与查询参数。', 'link', 'url 解析 结构 参数 片段', 'js/tools/pack-net5.js'),
    tool('cidr-merge', 'CIDR 网段合并', '网络工具', '把重叠或相邻网段合并成最小 CIDR 集合。', 'network', 'cidr 网段 合并 白名单 路由', 'js/tools/pack-net5.js'),
    tool('cache-control-gen', '缓存策略头', '网络工具', '按场景生成 Cache-Control 与对应服务器语法。', 'server', '缓存 cache-control etag cdn 头', 'js/tools/pack-net5.js'),
    tool('url-risk-check', 'URL 风险特征', '网络工具', '检查 @ 混淆、IP 直连、punycode 等可疑特征。', 'shield', 'url 风险 钓鱼 安全 检查 punycode', 'js/tools/pack-net5.js'),
    tool('proxy-env', '代理环境变量', '网络工具', '生成 bash / PowerShell / cmd / Docker 的代理变量。', 'globe', '代理 proxy 环境变量 http_proxy 终端', 'js/tools/pack-net5.js'),
    tool('curl-to-fetch', 'curl 转 fetch', '网络工具', '把 curl 命令转成 fetch 或 axios 代码，请求头不丢。', 'terminal', 'curl fetch axios 转换 请求 代码', 'js/tools/pack-net5.js'),

    /* 生活实用 10 款 */
    tool('pet-food', '宠物喂食量', '生活实用', '按体重与活动量算每日克数与月用量。', 'chart', '宠物 狗 猫 喂食 热量 克数', 'js/tools/pack-life5.js'),
    tool('clothing-size', '服装尺码换算', '生活实用', '按身高体重推荐中 / 美 / 欧码，可选版型。', 'layers', '尺码 服装 衣服 码数 换算', 'js/tools/pack-life5.js'),
    tool('ring-size', '戒指手寸对照', '生活实用', '周长、内径与港版、美版号一次换算清楚。', 'ruler', '戒指 手寸 圈口 周长 号数', 'js/tools/pack-life5.js'),
    tool('recipe-scale', '食谱份量缩放', '生活实用', '按人数缩放配料，分数写法与计数类自动处理。', 'list', '食谱 配料 缩放 份量 烘焙', 'js/tools/pack-life5.js'),
    tool('aqi-calc', 'PM2.5 折算 AQI', '生活实用', '按国标分段折算 AQI 等级并给出健康提示。', 'chart', 'aqi pm2.5 空气 指数 污染', 'js/tools/pack-life5.js'),
    tool('uv-advice', '紫外线建议', '生活实用', '按 UVI 给防晒等级、SPF 建议与晒伤时间。', 'eye', '紫外线 uv 防晒 spf 晒伤', 'js/tools/pack-life5.js'),
    tool('due-date', '预产期估算', '生活实用', '按末次月经与周期推算预产期与当前孕周。', 'calendar', '预产期 孕周 怀孕 产检 内格勒', 'js/tools/pack-life5.js'),
    tool('child-height', '孩子身高预测', '生活实用', '用父母身高算遗传靶身高与常见区间。', 'ruler', '身高 预测 遗传 孩子 靶身高', 'js/tools/pack-life5.js'),
    tool('noise-db', '分贝与听力', '生活实用', '算安全暴露时长与日剂量，判断听力风险。', 'chart', '分贝 噪音 听力 耳机 暴露', 'js/tools/pack-life5.js'),
    tool('quake-energy', '震级能量换算', '生活实用', '震级换算焦耳与 TNT 当量，并比较两个震级。', 'chart', '震级 地震 能量 tnt 当量', 'js/tools/pack-life5.js'),

    /* 生活实用 · 命理文化 */
    tool('zhouyi-naming', '周易起名', '生活实用', '排八字取用神，按五格剖象打分推荐名字。', 'taiji', '起名 取名 周易 八字 五行 五格 姓名 宝宝 易经', 'js/tools/pack-fortune.js'),

  ];

  /**
   * 新增工具的简写构造器
   * @param {string} id 唯一 id，同时作为 URL 片段与 ToolModules 的键
   * @param {string} name 卡片标题
   * @param {string} category 分类（需存在于 CATEGORY_ORDER）
   * @param {string} desc 一句话描述
   * @param {string} icon ICONS 中的图标名
   * @param {string} keywords 搜索关键词
   * @param {string} script 模块脚本路径（首次进入时按需加载）
   */
  function tool(id, name, category, desc, icon, keywords, script) {
    return {
      id: id,
      script: script,
      deps: ['js/tools/_kit.js'], // 所有批量工具共用同一套 UI 工装
      name: name,
      category: category,
      desc: desc,
      icon: icon,
      keywords: keywords,
      render: function (root) { window.ToolModules[id](root); }
    };
  }

  /* 分类展示顺序（"全部"固定在最前） */
  var CATEGORY_ORDER = ['全部', '文本处理', '编码解码', '时间日期', '计算换算', '图片处理', '随机生成', '开发辅助', '网络工具', '生活实用'];
  var CATEGORIES = CATEGORY_ORDER.filter(function (cat) {
    return cat === '全部' || TOOLS.some(function (t) { return t.category === cat; });
  });

  /* 图标库：统一 24x24 线性图标，stroke 由 CSS 控制 */
  var ICONS = {
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v4.5a2 2 0 0 1-2 2 2 2 0 0 1 2 2V18a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4.5a2 2 0 0 0 2 2 2 2 0 0 0-2 2V18a2 2 0 0 1-2 2h-1"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    type: '<polyline points="4 7 4 5 20 5 20 7"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="9" y1="19" x2="15" y2="19"/>',
    regex: '<path d="M12 3v18"/><path d="M4.5 7.5l15 9"/><path d="M19.5 7.5l-15 9"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3.5v3.5H14z"/><path d="M20.5 14v.01M14 20.5v.01M20.5 20.5v.01"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8.8" cy="9.2" r="1.1"/><circle cx="15.2" cy="9.2" r="1.1"/><circle cx="9.2" cy="15" r="1.1"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3.5"/><circle cx="8.6" cy="8.6" r="1.1"/><circle cx="15.4" cy="15.4" r="1.1"/><circle cx="12" cy="12" r="1.1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.6" cy="8.6" r="1.6"/><path d="M21 15.5l-4.5-4.5L5.5 21"/>',
    hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="16.2" y1="16.2" x2="21" y2="21"/>',
    arrow: '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>',
    back: '<line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.1"/><circle cx="4" cy="12" r="1.1"/><circle cx="4" cy="18" r="1.1"/>',
    diff: '<rect x="3" y="4" width="7" height="16" rx="1.6"/><rect x="14" y="4" width="7" height="16" rx="1.6"/><line x1="5.5" y1="9" x2="7.5" y2="9"/><line x1="5.5" y1="13" x2="7.5" y2="13"/>',
    scissors: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><line x1="20" y1="4" x2="8.2" y2="15.8"/><line x1="14.6" y1="14.6" x2="20" y2="20"/><line x1="8.2" y1="8.2" x2="12" y2="12"/>',
    globe: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.6 2.6 4 5.7 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.7-4-9s1.4-6.4 4-9z"/>',
    network: '<rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="15" y="15" width="6" height="6" rx="1.2"/><rect x="3" y="15" width="6" height="6" rx="1.2"/><path d="M9 6h5a4 4 0 0 1 4 4v5"/>',
    ruler: '<path d="M3.5 15.5L15.5 3.5l5 5L8.5 20.5z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.4"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8.2-8 9-4.5-.8-8-4-8-9V6z"/><polyline points="9 12 11.5 14.5 15.5 10"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2.4"/><polyline points="7 9 10 12 7 15"/><line x1="12" y1="15" x2="16" y2="15"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="8.5" y1="13" x2="15.5" y2="13"/><line x1="8.5" y1="17" x2="13" y2="17"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
    eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
    layers: '<polygon points="12 3 21 8 12 13 3 8"/><polyline points="3 13 12 18 21 13"/>',
    brush: '<path d="M4 20c3 0 4.2-2 4.2-4L14 10.2l3.8 3.8L12 19.8C10 22 7 20 4 20z"/><path d="M14.2 9.8l4-4a2.6 2.6 0 0 0-3.7-3.7l-4 4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M16.5 3.5l3.5 3.5"/><path d="M14 6l3 3"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><line x1="7" y1="7.5" x2="7.2" y2="7.5"/><line x1="7" y1="16.5" x2="7.2" y2="16.5"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    chart: '<line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="8" rx="0.8"/><rect x="11" y="8" width="3" height="12" rx="0.8"/><rect x="16" y="4" width="3" height="16" rx="0.8"/>',
    taiji: '<circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="12" cy="16.5" r="1.1"/>'
  };

  /* =========================================================================
   * 二、通用工具函数
   * ====================================================================== */
  var THEME_KEY = 'toolbox.theme';

  var state = {
    query: '',
    category: '全部'
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function iconSvg(name) {
    var path = ICONS[name] || ICONS.code;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  /** 创建 DOM 节点的轻量辅助函数 */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
        else if (key.charAt(0) === 'o' && key.charAt(1) === 'n' && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else node.setAttribute(key, value);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (child) {
        if (child === null || child === undefined) return;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return node;
  }

  /** 防抖：用于输入框实时计算，避免长文本频繁触发导致卡顿 */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, wait == null ? 200 : wait);
    };
  }

  /** 节流：用于滚动、尺寸变化等高频事件 */
  function throttle(fn, wait) {
    var last = 0;
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      var now = Date.now();
      var remain = wait - (now - last);
      if (remain <= 0) {
        last = now;
        fn.apply(context, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(context, args);
        }, remain);
      }
    };
  }

  /** 字节数格式化 */
  function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var index = 0;
    var value = bytes;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    var digits = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
    return value.toFixed(digits) + ' ' + units[index];
  }

  /* ------------------------------ Toast 轻提示 ------------------------------ */
  function toast(message, type) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    // 最多同时展示 3 条，避免堆叠遮挡
    while (root.children.length >= 3) root.removeChild(root.firstElementChild);

    var node = document.createElement('div');
    node.className = 'toast toast-' + (type || 'info');
    node.setAttribute('role', 'alert');
    node.innerHTML = '<span class="toast-dot"></span><span>' + escapeHtml(message) + '</span>';
    root.appendChild(node);

    requestAnimationFrame(function () { node.classList.add('show'); });
    setTimeout(function () {
      node.classList.remove('show');
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 240);
    }, type === 'error' ? 3200 : 2200);
  }

  /* ------------------------------ 剪贴板 ------------------------------ */
  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    if (!ok) throw new Error('execCommand copy failed');
  }

  function copyText(text, successMessage) {
    text = text == null ? '' : String(text);
    if (!text.length) {
      toast('没有可复制的内容', 'warn');
      return Promise.resolve(false);
    }
    var finish = function (ok) {
      if (ok) toast(successMessage || '已复制到剪贴板', 'success');
      else toast('复制失败，请手动选择后复制', 'error');
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () {
        return finish(true);
      }).catch(function () {
        try { legacyCopy(text); return finish(true); } catch (e) { return finish(false); }
      });
    }
    try { legacyCopy(text); return Promise.resolve(finish(true)); }
    catch (e) { return Promise.resolve(finish(false)); }
  }

  /* ------------------------------ 文件下载 ------------------------------ */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1200);
  }

  function downloadText(text, filename, mime) {
    downloadBlob(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }), filename);
  }

  /* ------------------------------ 文件读取 ------------------------------ */
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsDataURL(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /* ------------------------------ Tab 切换 ------------------------------ */
  function initTabs(scope) {
    var tabs = $$('.tab', scope);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.dataset.tab;
        tabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        $$('[data-panel]', scope).forEach(function (panel) {
          panel.hidden = panel.dataset.panel !== name;
        });
      });
    });
  }

  /* =========================================================================
   * 三、主题切换
   * ====================================================================== */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 隐私模式下忽略 */ }
    }
    var button = document.getElementById('themeToggle');
    if (button) {
      button.setAttribute('aria-label', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
      button.setAttribute('title', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d0f14' : '#f4f5fa');
  }

  function bindThemeToggle() {
    var button = document.getElementById('themeToggle');
    if (!button) return;
    applyTheme(currentTheme(), false);
    button.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
      toast(next === 'dark' ? '已切换到深色模式' : '已切换到浅色模式', 'success');
    });

    // 用户未手动选择时，跟随系统主题变化
    if (window.matchMedia) {
      var media = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (event) {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (e) { saved = null; }
        if (!saved) applyTheme(event.matches ? 'dark' : 'light', false);
      };
      if (media.addEventListener) media.addEventListener('change', onChange);
      else if (media.addListener) media.addListener(onChange);
    }
  }

  /* 页脚版权年份：始终显示当前年份，避免每年手动改 HTML */
  function bindFooterYear() {
    var el = document.getElementById('footerYear');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* 回到顶部：滚动超过一屏后淡入，点击平滑回顶（遵循「减少动效」偏好） */
  function bindBackToTop() {
    var button = document.getElementById('backToTop');
    if (!button) return;

    var ticking = false;

    function sync() {
      ticking = false;
      var threshold = Math.max(320, window.innerHeight * 0.6);
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      button.classList.toggle('is-visible', y > threshold);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    }

    button.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    sync();
  }

  /* =========================================================================
   * 四、首页渲染（搜索 + 分类筛选 + 卡片网格）
   * ====================================================================== */
  function filterTools() {
    var query = state.query.trim().toLowerCase();
    return TOOLS.filter(function (tool) {
      if (state.category !== '全部' && tool.category !== state.category) return false;
      if (!query) return true;
      var haystack = [tool.name, tool.desc, tool.category, tool.keywords || ''].join(' ').toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
  }

  function cardHtml(tool) {
    return '' +
      '<a class="tool-card" href="#/tool/' + tool.id + '" data-id="' + tool.id + '">' +
        '<span class="tool-card-top">' +
          '<span class="tool-icon">' + iconSvg(tool.icon) + '</span>' +
          '<span class="tool-cat">' + escapeHtml(tool.category) + '</span>' +
        '</span>' +
        '<span class="tool-name">' + escapeHtml(tool.name) + '</span>' +
        '<span class="tool-desc">' + escapeHtml(tool.desc) + '</span>' +
        '<span class="tool-arrow" aria-hidden="true">' + iconSvg('arrow') + '</span>' +
      '</a>';
  }

  function renderHome() {
    document.title = '集成工具大全 · 纯本地运行的在线工具箱';
    var app = document.getElementById('app');

    app.innerHTML = '' +
      '<section class="hero">' +
        '<p class="hero-eyebrow">纯前端 · 免登录 · 数据不出本机</p>' +
        '<h1 class="hero-title">集成工具大全</h1>' +
        '<p class="hero-desc">' + TOOLS.length + ' 款高频小工具，覆盖' + CATEGORIES.filter(function (cat) { return cat !== '全部'; }).join('、') + '。所有计算都在你的浏览器里完成，输入内容不会被发送到任何服务器。</p>' +
        '<div class="hero-badges">' +
          '<span class="badge">本地运算</span>' +
          '<span class="badge">零上传</span>' +
          '<span class="badge">支持深色模式</span>' +
          '<span class="badge">单页静态部署</span>' +
        '</div>' +
      '</section>' +

      '<section class="toolbar" aria-label="工具筛选">' +
        '<div class="search-box">' +
          iconSvg('search') +
          '<input id="searchInput" class="search-input" type="search" placeholder="搜索工具，例如 JSON、时间戳" autocomplete="off" aria-label="搜索工具">' +
          '<kbd class="search-kbd">/</kbd>' +
        '</div>' +
        '<div class="chips" id="categoryChips" role="group" aria-label="按分类筛选"></div>' +
      '</section>' +

      '<section class="results-head">' +
        '<h2 class="results-title" id="resultsTitle"></h2>' +
        '<p class="results-hint">点击卡片进入工具</p>' +
      '</section>' +

      '<div class="grid" id="toolGrid"></div>' +
      '<p class="empty" id="emptyState" hidden>没有找到匹配的工具，换个关键词或切换分类试试。</p>' +

      '<section class="privacy-card">' +
        '<span class="tool-icon">' + iconSvg('lock') + '</span>' +
        '<div>' +
          '<h2>隐私说明：数据不离开浏览器</h2>' +
          '<p>本站没有后端服务，不上报日志、不接入统计分析。JSON、文本、图片、文件等内容只存在于当前页面的内存中，关闭标签页即清除；主题偏好保存在浏览器 <code>localStorage</code> 中，可随时清除。</p>' +
        '</div>' +
      '</section>';

    // 分类筛选按钮
    var chips = document.getElementById('categoryChips');
    chips.innerHTML = CATEGORIES.map(function (cat) {
      return '<button type="button" class="chip" data-category="' + escapeHtml(cat) + '" aria-pressed="' +
        (state.category === cat ? 'true' : 'false') + '">' + escapeHtml(cat) + '</button>';
    }).join('');

    chips.addEventListener('click', function (event) {
      var button = event.target.closest('.chip');
      if (!button) return;
      state.category = button.dataset.category;
      $$('.chip', chips).forEach(function (item) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      updateList();
    });

    // 搜索框
    var input = document.getElementById('searchInput');
    input.value = state.query;
    input.addEventListener('input', debounce(function () {
      state.query = input.value;
      updateList();
    }, 120));

    updateList();
  }

  function updateList() {
    var grid = document.getElementById('toolGrid');
    if (!grid) return;
    var list = filterTools();
    grid.innerHTML = list.map(cardHtml).join('');

    var title = document.getElementById('resultsTitle');
    if (title) {
      if (state.query.trim()) title.textContent = '找到 ' + list.length + ' 个工具';
      else if (state.category !== '全部') title.textContent = state.category + ' · ' + list.length + ' 个工具';
      else title.textContent = '全部 ' + list.length + ' 个工具';
    }

    var empty = document.getElementById('emptyState');
    if (empty) empty.hidden = list.length !== 0;
  }

  /* =========================================================================
   * 五、工具页渲染
   * ====================================================================== */
  var routeToken = 0;
  var scriptPromises = Object.create(null);

  /** 加载单个脚本，同一地址只请求一次（失败可重试） */
  function loadScript(src) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () {
        delete scriptPromises[src];
        reject(new Error('脚本加载失败：' + src));
      };
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  /** 按需加载工具模块脚本（含依赖），首次进入该工具时才请求，之后复用缓存 */
  function loadToolModule(tool) {
    if (window.ToolModules && typeof window.ToolModules[tool.id] === 'function') {
      return Promise.resolve();
    }
    if (!tool.script) {
      return Promise.reject(new Error('该工具未配置脚本路径'));
    }

    var chain = Promise.resolve();
    (tool.deps || []).forEach(function (src) {
      chain = chain.then(function () { return loadScript(src); });
    });
    chain = chain.then(function () { return loadScript(tool.script); });

    return chain.then(function () {
      if (!window.ToolModules || typeof window.ToolModules[tool.id] !== 'function') {
        throw new Error('模块未正确注册：' + tool.id);
      }
    });
  }

  function renderToolPage(tool, token) {
    document.title = tool.name + ' · 集成工具大全';
    var app = document.getElementById('app');

    var siblings = TOOLS.filter(function (item) {
      return item.category === tool.category && item.id !== tool.id;
    }).slice(0, 6);

    app.innerHTML = '' +
      '<div class="tool-page">' +
        '<a class="back-link" href="#/">' + iconSvg('back') + '<span>全部工具</span></a>' +
        '<header class="tool-head">' +
          '<span class="tool-icon lg">' + iconSvg(tool.icon) + '</span>' +
          '<div class="tool-head-text">' +
            '<h1 class="tool-title">' + escapeHtml(tool.name) + '</h1>' +
            '<p class="tool-sub">' + escapeHtml(tool.desc) + '</p>' +
          '</div>' +
        '</header>' +
        '<section class="panel" id="toolPanel"></section>' +
        '<p class="local-note">' + iconSvg('lock') + '<span>本工具的所有计算都在你的浏览器内完成，不会上传任何数据。</span></p>' +
        (siblings.length ? (
          '<nav class="related" aria-label="同类工具">' +
            '<span class="related-title">同类工具</span>' +
            '<div class="related-list">' +
              siblings.map(function (item) {
                return '<a class="related-link" href="#/tool/' + item.id + '">' + escapeHtml(item.name) + '</a>';
              }).join('') +
            '</div>' +
          '</nav>'
        ) : '') +
      '</div>';

    var panel = document.getElementById('toolPanel');
    panel.innerHTML = '<p class="status info">正在加载工具模块…</p>';

    loadToolModule(tool).then(function () {
      if (token !== routeToken) return; // 期间已切换到其他页面
      panel.innerHTML = '';
      try {
        tool.render(panel);
      } catch (error) {
        console.error('[工具加载失败]', tool.id, error);
        panel.innerHTML = '<p class="status err">工具初始化失败：' + escapeHtml(error.message || '未知错误') + '</p>';
      }
    }).catch(function (error) {
      if (token !== routeToken) return;
      console.error('[工具模块加载失败]', tool.id, error);
      panel.innerHTML = '<p class="status err">工具模块加载失败：' + escapeHtml(error.message) +
        '。请检查网络，或确认 <code>js/tools/' + escapeHtml(tool.id) + '.js</code> 是否存在。</p>';
    });
  }

  /* =========================================================================
   * 六、hash 路由
   * ====================================================================== */
  function route() {
    // 切换页面时清掉上一页残留的轻提示
    var toastRoot = document.getElementById('toastRoot');
    if (toastRoot) toastRoot.innerHTML = '';

    var token = ++routeToken;
    var hash = location.hash || '#/';
    var matched = /^#\/tool\/([A-Za-z0-9_-]+)\/?$/.exec(hash);
    var app = document.getElementById('app');

    if (matched) {
      var tool = TOOLS.filter(function (item) { return item.id === matched[1]; })[0];
      if (tool) {
        renderToolPage(tool, token);
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }
      toast('未找到该工具，已返回首页', 'warn');
      location.replace('#/');
      return;
    }

    if (hash !== '#/' && hash !== '#' && hash !== '') {
      // 未知路由统一回到首页，保证静态部署下不会出现 404
      location.replace('#/');
      return;
    }

    renderHome();
    if (app) app.focus({ preventScroll: true });
  }

  /* =========================================================================
   * 七、公共能力导出（供 js/tools/*.js 使用）
   * ====================================================================== */
  window.UI = {
    $: $,
    $$: $$,
    el: el,
    icon: iconSvg,
    escapeHtml: escapeHtml,
    toast: toast,
    copyText: copyText,
    downloadBlob: downloadBlob,
    downloadText: downloadText,
    debounce: debounce,
    throttle: throttle,
    formatBytes: formatBytes,
    readFileAsText: readFileAsText,
    readFileAsDataURL: readFileAsDataURL,
    readFileAsArrayBuffer: readFileAsArrayBuffer,
    initTabs: initTabs
  };

  /* =========================================================================
   * 八、启动
   * ====================================================================== */
  function start() {
    bindThemeToggle();
    bindFooterYear();
    bindBackToTop();
    window.addEventListener('hashchange', route);

    /* 全局快捷键："/" 聚焦搜索框，Esc 清空（仅在首页存在搜索框时生效） */
    document.addEventListener('keydown', function (event) {
      var input = document.getElementById('searchInput');
      if (!input) return;
      var tag = document.activeElement ? document.activeElement.tagName : '';
      if (event.key === '/' && document.activeElement !== input && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) {
        event.preventDefault();
        input.focus();
      }
      if (event.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        state.query = '';
        updateList();
        input.blur();
      }
    });

    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

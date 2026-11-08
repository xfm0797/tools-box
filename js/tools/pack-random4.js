/* =============================================================================
 * 随机生成工具包 · 第四批（10 个）
 * -----------------------------------------------------------------------------
 * random-hex       随机十六进制串
 * random-date      随机日期时间
 * random-name-cn   中文姓名生成
 * random-company   公司名生成
 * random-address   地址生成
 * random-template  随机模板填充
 * random-gaussian  正态分布随机数
 * random-serial    序列号 / 券码生成
 * random-gradient  随机渐变 CSS
 * random-sentence  随机短句
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function linesResult(lines, note) {
    var text = lines.join('\n');
    return {
      html: '<pre class="code-block">' + K.esc(text) + '</pre>' +
        '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(text) + '">复制全部</button></div>',
      note: note
    };
  }

  function intIn(min, max) {
    return min + K.randomInt(max - min + 1);
  }

  /* ------------------------------ 1. 随机十六进制 ------------------------------ */
  function renderRandomHex(root) {
    K.form(root, {
      uid: 'randhex',
      actionLabel: '生成',
      fields: [
        { id: 'bytes', label: '每串字节数', type: 'number', value: 16, min: 1, max: 256, step: 1 },
        { id: 'count', label: '生成数量', type: 'number', value: 5, min: 1, max: 200, step: 1 },
        { id: 'upper', label: '大写', type: 'checkbox', value: false },
        { id: 'prefix', label: '添加 0x 前缀', type: 'checkbox', value: false }
      ],
      run: function (v) {
        var bytes = Math.max(1, Math.min(256, Math.round(Number(v.bytes))));
        var count = Math.max(1, Math.min(200, Math.round(Number(v.count))));
        var lines = [];
        for (var i = 0; i < count; i += 1) {
          var buffer = new Uint8Array(bytes);
          (window.crypto || window.msCrypto).getRandomValues(buffer);
          var hex = Array.prototype.map.call(buffer, function (byte) {
            return ('0' + byte.toString(16)).slice(-2);
          }).join('');
          if (v.upper) hex = hex.toUpperCase();
          lines.push((v.prefix ? '0x' : '') + hex);
        }
        return linesResult(lines, '使用 crypto.getRandomValues 生成，共 ' + count + ' 串 × ' + bytes + ' 字节');
      }
    });
  }

  /* ------------------------------ 2. 随机日期 ------------------------------ */
  function renderRandomDate(root) {
    K.form(root, {
      uid: 'randdate',
      actionLabel: '生成',
      fields: [
        { id: 'from', label: '起始日期', type: 'date', value: '2024-01-01' },
        { id: 'to', label: '结束日期', type: 'date', value: '2026-12-31' },
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 200, step: 1 },
        { id: 'withTime', label: '包含时间', type: 'checkbox', value: false },
        { id: 'sorted', label: '按时间排序', type: 'checkbox', value: true }
      ],
      run: function (v) {
        var from = new Date(v.from + 'T00:00:00');
        var to = new Date(v.to + 'T23:59:59');
        if (isNaN(from.getTime()) || isNaN(to.getTime())) return { error: '请选择起止日期' };
        if (to <= from) return { error: '结束日期必须晚于起始日期' };
        var count = Math.max(1, Math.min(200, Math.round(Number(v.count))));
        var stamps = [];
        for (var i = 0; i < count; i += 1) {
          stamps.push(from.getTime() + K.randomInt(to.getTime() - from.getTime()));
        }
        if (v.sorted) stamps.sort(function (a, b) { return a - b; });
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        var lines = stamps.map(function (stamp) {
          var d = new Date(stamp);
          var date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
          if (!v.withTime) return date;
          return date + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        });
        return linesResult(lines, '区间内随机分布 ' + count + ' 个时间点');
      }
    });
  }

  /* ------------------------------ 3. 中文姓名 ------------------------------ */
  var SURNAMES = ('王李张刘陈杨黄赵吴周徐孙马朱胡林郭何高罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任' +
    '沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤').split('');
  var GIVEN_A = '伟刚勇毅俊峰强军平保东文辉力明永健世广志义兴良海山仁波宁贵福生龙元全国胜学祥才发武新利清飞彬富顺信子杰楠榕风航弘秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊兰凤洁梅琳素云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳嘉琼勤珍贞莉桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希宁欣飘育滢馥筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔枝思丽'.split('');
  var GIVEN_B = '子小大天心文方明光华春云海山水雨雪风林森泽宇轩晨曦涵浩宇博文楠琪瑞睿轩然浩宁远航志强建国晓明春燕秀英桂芳玉兰凤霞'.split('');

  function randomName() {
    var surname = K.pick(SURNAMES);
    var style = K.randomInt(3);
    if (style === 0) return surname + K.pick(GIVEN_A);
    if (style === 1) return surname + K.pick(GIVEN_B) + K.pick(GIVEN_A);
    return surname + K.pick(GIVEN_A) + K.pick(GIVEN_A);
  }

  function renderRandomName(root) {
    K.form(root, {
      uid: 'randname',
      actionLabel: '生成姓名',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 200, step: 1 },
        { id: 'unique', label: '去重', type: 'checkbox', value: true },
        { id: 'json', label: '输出 JSON 数组', type: 'checkbox', value: false }
      ],
      hint: '姓氏取自常见百家姓，名字由常用字组合，仅用于测试数据，不指向真实个人。',
      run: function (v) {
        var count = Math.max(1, Math.min(200, Math.round(Number(v.count))));
        var names = [];
        var guard = 0;
        while (names.length < count && guard < count * 30) {
          var name = randomName();
          if (!v.unique || names.indexOf(name) < 0) names.push(name);
          guard += 1;
        }
        if (v.json) {
          var json = JSON.stringify(names, null, 2);
          return {
            html: '<pre class="code-block">' + K.esc(json) + '</pre>' +
              '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(json) + '">复制 JSON</button></div>',
            note: '已生成 ' + names.length + ' 个姓名'
          };
        }
        return linesResult(names, '已生成 ' + names.length + ' 个姓名');
      }
    });
  }

  /* ------------------------------ 4. 公司名 ------------------------------ */
  var CITY_PREFIX = ['华夏', '东方', '中科', '盛达', '恒信', '鼎泰', '远景', '天成', '金诚', '博远', '同心', '海纳', '九州', '星辰', '启明', '云图', '合力', '智远', '安泰', '新程'];
  var BIZ = ['科技', '网络', '信息', '智能', '数据', '文化', '传媒', '商贸', '实业', '电子', '软件', '新能源', '生物', '物流', '咨询'];
  var SUFFIX = ['有限公司', '股份有限公司', '有限责任公司', '集团有限公司'];

  function renderRandomCompany(root) {
    K.form(root, {
      uid: 'randcompany',
      actionLabel: '生成公司名',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 100, step: 1 },
        { id: 'suffix', label: '后缀', type: 'select', value: 'any', options: [
          { value: 'any', label: '随机' },
          { value: '有限公司', label: '有限公司' },
          { value: '股份有限公司', label: '股份有限公司' }
        ] }
      ],
      hint: '用于演示与占位，随机组合可能与他人商标重合，正式使用前请做名称核准。',
      run: function (v) {
        var count = Math.max(1, Math.min(100, Math.round(Number(v.count))));
        var names = [];
        for (var i = 0; i < count; i += 1) {
          var suffix = v.suffix === 'any' ? K.pick(SUFFIX) : v.suffix;
          names.push(K.pick(CITY_PREFIX) + K.pick(BIZ) + suffix);
        }
        return linesResult(names, '共 ' + count + ' 个公司名');
      }
    });
  }

  /* ------------------------------ 5. 地址 ------------------------------ */
  var PROVINCES = [
    { name: '北京市', cities: ['朝阳区', '海淀区', '西城区', '东城区', '丰台区'] },
    { name: '上海市', cities: ['浦东新区', '徐汇区', '静安区', '黄浦区', '长宁区'] },
    { name: '广东省', cities: ['广州市天河区', '深圳市南山区', '深圳市福田区', '东莞市', '佛山市'] },
    { name: '浙江省', cities: ['杭州市西湖区', '杭州市滨江区', '宁波市鄞州区', '温州市'] },
    { name: '江苏省', cities: ['南京市鼓楼区', '苏州市工业园区', '无锡市梁溪区'] },
    { name: '四川省', cities: ['成都市武侯区', '成都市高新区', '绵阳市'] },
    { name: '湖北省', cities: ['武汉市洪山区', '武汉市江汉区', '宜昌市'] },
    { name: '陕西省', cities: ['西安市雁塔区', '西安市未央区'] }
  ];
  var ROADS = ['中山路', '人民大道', '建设路', '解放路', '长江路', '文化街', '科技园路', '滨江大道', '迎宾路', '和平街'];
  var COMM = ['阳光花园', '翡翠湾', '金地广场', '锦绣华庭', '云栖小区', '星河湾', '时代广场'];

  function renderRandomAddress(root) {
    K.form(root, {
      uid: 'randaddr',
      actionLabel: '生成地址',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100, step: 1 },
        { id: 'detail', label: '包含门牌与小区', type: 'checkbox', value: true }
      ],
      run: function (v) {
        var count = Math.max(1, Math.min(100, Math.round(Number(v.count))));
        var lines = [];
        for (var i = 0; i < count; i += 1) {
          var province = K.pick(PROVINCES);
          var base = province.name + K.pick(province.cities) + K.pick(ROADS) + intIn(1, 999) + ' 号';
          if (v.detail) {
            base += K.pick(COMM) + intIn(1, 26) + ' 栋 ' + intIn(1, 30) + '0' + intIn(1, 4) + ' 室';
          }
          lines.push(base);
        }
        return linesResult(lines, '共 ' + count + ' 条虚构地址');
      }
    });
  }

  /* ------------------------------ 6. 随机模板填充 ------------------------------ */
  function renderRandomTemplate(root) {
    K.form(root, {
      uid: 'randtemplate',
      actionLabel: '生成文本',
      fields: [
        { id: 'template', label: '模板（支持占位符）', type: 'textarea', rows: 3, wide: true, mono: true,
          value: '{姓名} 来自 {城市}，就职于 {公司}，{日期} 完成注册，编号 {编号}。' },
        { id: 'count', label: '生成条数', type: 'number', value: 5, min: 1, max: 100, step: 1 }
      ],
      hint: '可用占位符：{姓名} {城市} {公司} {日期} {编号} {数字} {邮箱} {手机} {单词}',
      run: function (v) {
        var count = Math.max(1, Math.min(100, Math.round(Number(v.count))));
        var template = String(v.template || '');
        if (!template.trim()) return { error: '请填写模板内容' };

        var cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '苏州', '厦门', '长沙'];
        function digits(n) {
          var out = '';
          for (var i = 0; i < n; i += 1) out += String(K.randomInt(10));
          return out;
        }
        function dateText() {
          var start = Date.UTC(2023, 0, 1);
          var end = Date.UTC(2026, 11, 31);
          var stamp = start + K.randomInt(Math.floor((end - start) / 86400000)) * 86400000;
          var d = new Date(stamp);
          return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        }
        var lines = [];
        for (var k = 0; k < count; k += 1) {
          lines.push(template
            .replace(/\{姓名\}/g, randomName())
            .replace(/\{城市\}/g, K.pick(cities))
            .replace(/\{公司\}/g, K.pick(CITY_PREFIX) + K.pick(BIZ) + K.pick(SUFFIX))
            .replace(/\{日期\}/g, dateText())
            .replace(/\{编号\}/g, 'NO' + digits(8))
            .replace(/\{数字\}/g, String(K.randomInt(10000)))
            .replace(/\{邮箱\}/g, 'user' + digits(4) + '@example.com')
            .replace(/\{手机\}/g, '1' + (3 + K.randomInt(7)) + digits(9))
            .replace(/\{单词\}/g, K.pick(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'])));
        }
        var text = lines.join('\n');
        return {
          html: '<pre class="code-block">' + K.esc(text) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(text) + '">复制全部</button></div>',
          note: '共生成 ' + count + ' 条，未识别的占位符会原样保留'
        };
      }
    });
  }

  /* ------------------------------ 7. 正态分布随机数 ------------------------------ */
  function renderRandomGaussian(root) {
    K.form(root, {
      uid: 'randgauss',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 20, min: 1, max: 500, step: 1 },
        { id: 'mean', label: '均值 μ', type: 'number', value: 100, step: 1 },
        { id: 'sd', label: '标准差 σ', type: 'number', value: 15, min: 0.01, step: 0.1 },
        { id: 'digits', label: '小数位', type: 'number', value: 2, min: 0, max: 6, step: 1 },
        { id: 'clamp', label: '限制为 μ ± 3σ 以内', type: 'checkbox', value: true }
      ],
      hint: 'Box-Muller 变换生成标准正态分布，再线性变换到指定均值与标准差，适合模拟成绩、身高、测量误差。',
      run: function (v) {
        var count = Math.max(1, Math.min(500, Math.round(Number(v.count))));
        var mean = Number(v.mean);
        var sd = Number(v.sd);
        if (!(sd > 0)) return { error: '标准差必须大于 0' };
        var digits = Math.max(0, Math.min(6, Math.round(Number(v.digits))));
        function normal() {
          var u1 = (K.randomInt(1e9) + 1) / 1e9;
          var u2 = (K.randomInt(1e9) + 1) / 1e9;
          return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
        var values = [];
        for (var i = 0; i < count; i += 1) {
          var z = normal();
          if (v.clamp) z = Math.max(-3, Math.min(3, z));
          values.push(mean + z * sd);
        }
        var sum = values.reduce(function (acc, n) { return acc + n; }, 0);
        var sampleMean = sum / count;
        var variance = values.reduce(function (acc, n) { return acc + Math.pow(n - sampleMean, 2); }, 0) / count;
        var sorted = values.slice().sort(function (a, b) { return a - b; });
        function quantile(p) {
          var pos = (sorted.length - 1) * p;
          var lo = Math.floor(pos);
          var hi = Math.ceil(pos);
          return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
        }
        return {
          html: K.stats([
            { label: '样本均值', value: K.num(sampleMean, digits) },
            { label: '样本标准差', value: K.num(Math.sqrt(variance), digits) },
            { label: '最小值', value: K.num(sorted[0], digits) },
            { label: '中位数', value: K.num(quantile(0.5), digits) },
            { label: '最大值', value: K.num(sorted[sorted.length - 1], digits) },
            { label: 'P95', value: K.num(quantile(0.95), digits) }
          ]) + '<pre class="code-block">' + K.esc(values.map(function (n) { return n.toFixed(digits); }).join('\n')) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(values.map(function (n) { return n.toFixed(digits); }).join('\n')) + '">复制全部</button></div>',
          note: '共生成 ' + count + ' 个服从 N(' + mean + ', ' + sd + '²) 的随机数'
        };
      }
    });
  }

  /* ------------------------------ 8. 序列号 ------------------------------ */
  function renderRandomSerial(root) {
    K.form(root, {
      uid: 'randserial',
      actionLabel: '生成序列号',
      fields: [
        { id: 'length', label: '随机部分长度', type: 'number', value: 12, min: 4, max: 64, step: 1 },
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 500, step: 1 },
        { id: 'charset', label: '字符集', type: 'select', value: 'upper', options: [
          { value: 'upper', label: '大写字母 + 数字（去易混字符）' },
          { value: 'lower', label: '小写字母 + 数字' },
          { value: 'digit', label: '纯数字' },
          { value: 'hex', label: '十六进制' }
        ] },
        { id: 'prefix', label: '前缀', type: 'text', value: '' },
        { id: 'group', label: '每几位分隔（0 = 不分隔）', type: 'number', value: 4, min: 0, max: 16, step: 1 }
      ],
      run: function (v) {
        var sets = {
          upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
          lower: 'abcdefghijkmnpqrstuvwxyz23456789',
          digit: '0123456789',
          hex: '0123456789ABCDEF'
        };
        var pool = sets[v.charset] || sets.upper;
        var length = Math.max(4, Math.min(64, Math.round(Number(v.length))));
        var count = Math.max(1, Math.min(500, Math.round(Number(v.count))));
        var group = Math.max(0, Math.round(Number(v.group)));
        var lines = [];
        for (var i = 0; i < count; i += 1) {
          var chars = [];
          for (var j = 0; j < length; j += 1) chars.push(pool.charAt(K.randomInt(pool.length)));
          var body = chars.join('');
          if (group > 0) body = body.match(new RegExp('.{1,' + group + '}', 'g')).join('-');
          lines.push((v.prefix || '') + body);
        }
        return linesResult(lines, '共 ' + count + ' 个，随机部分 ' + length + ' 位');
      }
    });
  }

  /* ------------------------------ 9. 随机渐变 ------------------------------ */
  function renderRandomGradient(root) {
    K.form(root, {
      uid: 'randgradient',
      actionLabel: '生成渐变',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 4, min: 1, max: 20, step: 1 },
        { id: 'style', label: '风格', type: 'select', value: 'hue', options: [
          { value: 'hue', label: '同色系（相近色相）' },
          { value: 'random', label: '完全随机' },
          { value: 'analog', label: '互补色（撞色）' }
        ] },
        { id: 'angle', label: '角度（deg）', type: 'number', value: 135, min: 0, max: 360, step: 15 }
      ],
      run: function (v) {
        var count = Math.max(1, Math.min(20, Math.round(Number(v.count))));
        function hsl(h, s, l) {
          s /= 100;
          l /= 100;
          var k = function (n) { return (n + h / 30) % 12; };
          var a = s * Math.min(l, 1 - l);
          var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
          return '#' + [f(0), f(8), f(4)].map(function (value) {
            return ('0' + Math.round(value * 255).toString(16)).slice(-2);
          }).join('').toUpperCase();
        }
        var lines = [];
        var previews = [];
        for (var i = 0; i < count; i += 1) {
          var base = K.randomInt(360);
          var from;
          var to;
          if (v.style === 'hue') {
            from = hsl(base, 60 + K.randomInt(25), 35 + K.randomInt(15));
            to = hsl((base + 20 + K.randomInt(30)) % 360, 55 + K.randomInt(25), 60 + K.randomInt(15));
          } else if (v.style === 'analog') {
            from = hsl(base, 65 + K.randomInt(25), 45 + K.randomInt(10));
            to = hsl((base + 180) % 360, 65 + K.randomInt(25), 45 + K.randomInt(10));
          } else {
            from = hsl(base, 45 + K.randomInt(45), 35 + K.randomInt(30));
            to = hsl(K.randomInt(360), 45 + K.randomInt(45), 45 + K.randomInt(25));
          }
          var css = 'linear-gradient(' + v.angle + 'deg, ' + from + ', ' + to + ')';
          lines.push(css);
          previews.push('<div style="height:56px;border-radius:10px;border:1px solid rgba(0,0,0,.08);background:' + css + '"></div>');
        }
        return {
          html: '<div style="display:grid;gap:10px;margin-bottom:14px">' + previews.join('') + '</div>' +
            '<pre class="code-block">' + K.esc(lines.join('\n')) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(lines.join('\n')) + '">复制全部 CSS</button></div>',
          note: '共 ' + count + ' 条 gradient，可直接粘贴到 background 属性'
        };
      }
    });
  }

  /* ------------------------------ 10. 随机短句 ------------------------------ */
  function renderRandomSentence(root) {
    var openers = ['清晨的风', '夜深人静时', '雨后的街道', '旧书店的角落', '远方的车站', '午后的咖啡馆', '海边的栈道', '城市的天台'];
    var subjects = ['有人', '我', '他', '她', '一只猫', '一整片云'];
    var verbs = ['想起', '遇见', '悄悄收好', '反复读着', '轻轻推开', '慢慢走过'];
    var objects = ['一封没寄出的信', '很久以前的约定', '半杯凉掉的茶', '一段模糊的旋律', '窗外的灯火', '口袋里的小票'];
    var endings = ['像什么都没发生过。', '然后笑了。', '天色渐渐暗下来。', '风把话吹散了。', '这就是全部了。'];

    K.form(root, {
      uid: 'randsentence',
      actionLabel: '生成短句',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 50, step: 1 },
        { id: 'style', label: '风格', type: 'select', value: 'literary', options: [
          { value: 'literary', label: '文艺叙事' },
          { value: 'plain', label: '简洁陈述' }
        ] }
      ],
      run: function (v) {
        var count = Math.max(1, Math.min(50, Math.round(Number(v.count))));
        var lines = [];
        for (var i = 0; i < count; i += 1) {
          if (v.style === 'plain') {
            lines.push(K.pick(subjects) + K.pick(verbs) + K.pick(objects) + '。');
          } else {
            lines.push(K.pick(openers) + '里，' + K.pick(subjects) + K.pick(verbs) + K.pick(objects) + '，' + K.pick(endings));
          }
        }
        return linesResult(lines, '随机词库组合，仅供文案占位');
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['random-hex'] = renderRandomHex;
  window.ToolModules['random-date'] = renderRandomDate;
  window.ToolModules['random-name-cn'] = renderRandomName;
  window.ToolModules['random-company'] = renderRandomCompany;
  window.ToolModules['random-address'] = renderRandomAddress;
  window.ToolModules['random-template'] = renderRandomTemplate;
  window.ToolModules['random-gaussian'] = renderRandomGaussian;
  window.ToolModules['random-serial'] = renderRandomSerial;
  window.ToolModules['random-gradient'] = renderRandomGradient;
  window.ToolModules['random-sentence'] = renderRandomSentence;
})();

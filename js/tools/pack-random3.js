/* =============================================================================
 * 随机生成工具包 · 第三批（9 个）
 * -----------------------------------------------------------------------------
 * random-color   随机颜色
 * weighted-pick  加权抽取
 * mock-data      假数据生成
 * tournament     对阵表生成
 * secret-santa   圣诞抽签
 * bingo-card     宾果卡片
 * random-username 用户名生成
 * passphrase     口令短语
 * random-sudoku  数独生成
 *
 * 全部使用 crypto.getRandomValues（经 Kit 封装的拒绝采样）。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. 随机颜色 ------------------------------ */
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) {
      var c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  function renderRandomColor(root) {
    K.form(root, {
      uid: 'randomcolor',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 12, min: 1, max: 60 },
        { id: 'format', label: '格式', type: 'select', value: 'hex',
          options: [{ value: 'hex', label: 'HEX #aabbcc' }, { value: 'rgb', label: 'RGB' }, { value: 'hsl', label: 'HSL' }] },
        { id: 'lightness', label: '亮度范围（%）', type: 'text', value: '35-75', placeholder: '如 35-75，避免过暗过亮' }
      ],
      hint: '按随机色相 + 限定亮度生成「能看」的颜色，比纯随机更适合做 UI 备选色。',
      run: function (v) {
        var count = Math.max(1, Math.min(60, Number(v.count) || 1));
        var range = (v.lightness || '').match(/^(\d{1,3})\s*[-~]\s*(\d{1,3})$/);
        var lMin = range ? Math.max(0, Number(range[1])) : 35;
        var lMax = range ? Math.min(100, Number(range[2])) : 75;
        if (lMin >= lMax) return { error: '亮度范围起点需小于终点，如 35-75' };
        var colors = [];
        var list = [];
        for (var i = 0; i < count; i += 1) {
          var h = K.randomInt(360);
          var s = 55 + K.randomInt(35);
          var l = lMin + K.randomInt(Math.max(1, lMax - lMin));
          var hex = hslToHex(h, s, l);
          list.push(hex);
          var r = parseInt(hex.slice(1, 3), 16);
          var g = parseInt(hex.slice(3, 5), 16);
          var b = parseInt(hex.slice(5, 7), 16);
          var display = v.format === 'rgb' ? 'rgb(' + r + ', ' + g + ', ' + b + ')'
            : v.format === 'hsl' ? 'hsl(' + h + ', ' + s + '%, ' + l + '%)' : hex;
          colors.push({ hex: hex, display: display });
        }
        var swatches = colors.map(function (c) {
          return '<button type="button" class="shade-item" data-copy="' + c.display + '">' +
            '<span class="shade-swatch" style="background:' + c.hex + '"></span>' +
            '<span class="shade-hex">' + K.esc(c.display) + '</span></button>';
        }).join('');
        return {
          output: list.join('\n'),
          html: '<div class="shade-grid">' + swatches + '</div>',
          note: '点击色块即可复制' + (v.format === 'hex' ? '' : '对应 ' + v.format.toUpperCase() + ' 值')
        };
      }
    });
  }

  /* ------------------------------ 2. 加权抽取 ------------------------------ */
  function renderWeightedPick(root) {
    K.form(root, {
      uid: 'weightedpick',
      actionLabel: '抽取',
      fields: [
        { id: 'pool', label: '名单（每行「名称 权重」）', type: 'textarea', rows: 6, wide: true,
          value: '一等奖 1\n二等奖 3\n三等奖 6\n谢谢参与 20' },
        { id: 'times', label: '抽取次数', type: 'number', value: 10, min: 1, max: 1000 },
        { id: 'without', label: '不放回（抽中后移除）', type: 'checkbox' }
      ],
      hint: '权重是相对比例：权重 3 被抽中概率是权重 1 的 3 倍。不放回时抽完即止。',
      run: function (v) {
        var entries = [];
        v.pool.split('\n').forEach(function (line) {
          var m = line.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
          if (m && Number(m[2]) > 0) entries.push({ name: m[1], weight: Number(m[2]) });
        });
        if (entries.length < 2) return { error: '至少需要 2 条「名称 权重」记录' };
        var times = Math.max(1, Math.min(1000, Number(v.times) || 1));
        var pool = entries.slice();
        var results = [];
        var stats = {};
        for (var t = 0; t < times; t += 1) {
          if (v.without && !pool.length) break;
          var total = pool.reduce(function (s, e) { return s + e.weight; }, 0);
          var roll = K.randomInt(Math.max(1, Math.round(total * 100)));
          var acc = 0;
          var picked = pool[0];
          for (var i = 0; i < pool.length; i += 1) {
            acc += pool[i].weight * 100;
            if (roll < acc) { picked = pool[i]; break; }
          }
          results.push(picked.name);
          stats[picked.name] = (stats[picked.name] || 0) + 1;
          if (v.without) pool = pool.filter(function (e) { return e !== picked; });
        }
        var rows = Object.keys(stats).map(function (name) {
          var entry = entries.find(function (e) { return e.name === name; });
          var expect = entry.weight / entries.reduce(function (s, e) { return s + e.weight; }, 0) * times;
          return [name, String(stats[name]) + ' 次', '理论 ' + K.num(expect, 1) + ' 次'];
        }).sort(function (a, b) { return parseInt(b[1]) - parseInt(a[1]); });
        return {
          output: results.join('\n'),
          html: K.table(['名称', '抽中', '对比理论值'], rows),
          note: '共抽 ' + results.length + ' 次' + (v.without && !pool.length ? '（名额已抽完）' : '')
        };
      }
    });
  }

  /* ------------------------------ 3. 假数据生成 ------------------------------ */
  var SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林高罗郑梁谢宋唐许韩冯邓曹彭曾肖田董潘袁蔡蒋余于杜叶程魏苏吕丁任卢姚沈钟姜崔谭陆范汪廖石金韦贾夏付方邹熊白孟秦邱侯江尹薛闫段雷龙黎史陶贺毛郝顾龚邵万钱严覃武戴莫孔向汤'.split('');
  var GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超霞平刚桂英晨宇浩然子轩雨桐思远梦琪嘉懿天佑博文'.split('');
  var PHONE_PREFIX = ['130', '131', '132', '135', '136', '137', '138', '139', '150', '151', '152', '155', '158', '159', '176', '177', '178', '182', '183', '186', '187', '188', '189', '199'];
  var EMAIL_DOMAINS = ['example.com', 'test.cn', 'mail.example.org', 'demo.net'];
  var CITIES = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '成都市锦江区', '武汉市洪山区', '南京市鼓楼区'];
  var COMPANIES = ['云图科技', '星河网络', '晨光信息', '启点软件', '蓝海数据', '风行传媒', '禾木文化', '海纳集团'];

  function renderMockData(root) {
    K.form(root, {
      uid: 'mockdata',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '条数', type: 'number', value: 10, min: 1, max: 500 },
        { id: 'fields', label: '包含字段', type: 'select', value: 'all',
          options: [{ value: 'all', label: '姓名+手机+邮箱+地区+公司' }, { value: 'basic', label: '姓名+手机' }, { value: 'email', label: '姓名+邮箱' }] },
        { id: 'format', label: '输出格式', type: 'select', value: 'tsv',
          options: [{ value: 'tsv', label: '制表符分隔（可粘贴表格）' }, { value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }] }
      ],
      hint: '纯随机拼装的测试数据，仅用于开发调试；手机号符合号段规则但并非真实号码。',
      run: function (v) {
        var count = Math.max(1, Math.min(500, Number(v.count) || 1));
        var rows = [];
        for (var i = 0; i < count; i += 1) {
          var name = K.pick(SURNAMES) + (K.randomInt(10) < 6 ? K.pick(GIVEN) + K.pick(GIVEN) : K.pick(GIVEN));
          var phone = K.pick(PHONE_PREFIX) + String(K.randomInt(100000000)).padStart(8, '0');
          var email = 'user' + K.randomInt(10000) + '@' + K.pick(EMAIL_DOMAINS);
          var city = K.pick(CITIES);
          var company = K.pick(COMPANIES);
          if (v.fields === 'basic') rows.push({ name: name, phone: phone });
          else if (v.fields === 'email') rows.push({ name: name, email: email });
          else rows.push({ name: name, phone: phone, email: email, city: city, company: company });
        }
        var keys = Object.keys(rows[0]);
        if (v.format === 'json') {
          var out = JSON.stringify(rows, null, 2);
          return { output: out, html: '<pre class="code-block">' + K.esc(out) + '</pre>', note: '已生成 ' + count + ' 条 JSON 测试数据' };
        }
        var sep = v.format === 'csv' ? ',' : '\t';
        var lines = [keys.join(sep)].concat(rows.map(function (r) {
          return keys.map(function (k) { return r[k]; }).join(sep);
        }));
        var out = lines.join('\n');
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '已生成 ' + count + ' 条，可直接粘贴到表格'
        };
      }
    });
  }

  /* ------------------------------ 4. 对阵表生成 ------------------------------ */
  function renderTournament(root) {
    K.form(root, {
      uid: 'tournament',
      actionLabel: '生成对阵',
      fields: [
        { id: 'names', label: '参赛名单（每行一个）', type: 'textarea', rows: 7, wide: true,
          value: 'A 队\nB 队\nC 队\nD 队\nE 队\nF 队\nG 队\nH 队' },
        { id: 'shuffle', label: '随机抽签', type: 'checkbox', value: true }
      ],
      hint: '单败淘汰制：不足 2 的幂次时自动安排轮空（BYE），轮次不足的席位显示 TBD。',
      run: function (v) {
        var names = v.names.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (names.length < 2) return { error: '至少需要 2 个参赛者' };
        if (names.length > 64) return { error: '最多支持 64 个参赛者' };
        if (v.shuffle) K.shuffle(names);
        var size = 1;
        while (size < names.length) size *= 2;
        var slots = [];
        for (var i = 0; i < size; i += 1) slots.push(names[i] || '轮空');
        var rounds = [];
        var current = slots;
        var roundNo = 1;
        while (current.length > 1) {
          var matches = [];
          var next = [];
          for (var m = 0; m < current.length; m += 2) {
            var a = current[m];
            var b = current[m + 1];
            var winner = b === '轮空' ? a : a === '轮空' ? b : '待定';
            matches.push([a, b, winner]);
            next.push(winner === '待定' ? '待定' : winner);
          }
          rounds.push({ no: roundNo, matches: matches, count: current.length });
          current = next.map(function (n) { return n === '待定' ? '待定' : n; });
          roundNo += 1;
        }
        var html = rounds.map(function (r) {
          return '<div class="bracket-round"><h4>第 ' + r.no + ' 轮（' + r.count + ' 席）</h4>' +
            K.table(['位置 1', '位置 2', '晋级'], r.matches.map(function (m2) {
              return [m2[0] === '轮空' ? '<span class="hint">轮空</span>' : K.esc(m2[0]), m2[1] === '轮空' ? '<span class="hint">轮空</span>' : K.esc(m2[1]), m2[2]];
            })) + '</div>';
        }).join('');
        return {
          output: '轮次：' + rounds.length + '；总席位：' + size + '；轮空：' + (size - names.length),
          html: html,
          note: names.length + ' 支队伍，共 ' + rounds.length + ' 轮，轮空 ' + (size - names.length) + ' 席'
        };
      }
    });
  }

  /* ------------------------------ 5. 圣诞抽签 ------------------------------ */
  function renderSecretSanta(root) {
    K.form(root, {
      uid: 'santa',
      actionLabel: '抽签',
      fields: [
        { id: 'names', label: '参与名单（每行一个）', type: 'textarea', rows: 7, wide: true,
          value: '小王\n小李\n小张\n小赵\n小陈' },
        { id: 'format', label: '结果格式', type: 'select', value: 'line',
          options: [{ value: 'line', label: '「谁 → 给谁」清单' }, { value: 'circle', label: '循环链展示' }] }
      ],
      hint: '随机互送礼物配对：保证每人送出一次、收到一次，且不抽到自己；复制结果后私发给每个人。',
      run: function (v) {
        var names = v.names.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (names.length < 2) return { error: '至少需要 2 人' };
        var givers;
        var tries = 0;
        do {
          givers = names.slice();
          K.shuffle(givers);
          tries += 1;
        } while (tries < 500 && givers.some(function (g, i) { return g === names[i]; }));
        if (givers.some(function (g, i) { return g === names[i]; })) {
          // 交换第一个自抽项修复
          for (var i = 0; i < names.length; i += 1) {
            if (givers[i] === names[i]) {
              var j = (i + 1) % names.length;
              var tmp = givers[i]; givers[i] = givers[j]; givers[j] = tmp;
            }
          }
        }
        if (v.format === 'circle') {
          var circle = names.map(function (n, i) { return n + ' → ' + givers[i]; }).join(' → ') + ' → ' + names[0];
          return {
            output: circle,
            html: '<pre class="code-block">' + K.esc(circle) + '</pre>',
            note: '礼物流转成一条环，每人送出一次、收到一次'
          };
        }
        var list = names.map(function (n, i) { return n + ' 准备礼物送给：' + givers[i]; }).join('\n');
        return {
          output: list,
          html: '<pre class="code-block">' + K.esc(list) + '</pre>',
          note: '共 ' + names.length + ' 人参与，已排除抽到自己（重洗 ' + tries + ' 次）'
        };
      }
    });
  }

  /* ------------------------------ 6. 宾果卡片 ------------------------------ */
  function renderBingoCard(root) {
    K.form(root, {
      uid: 'bingo',
      actionLabel: '生成卡片',
      fields: [
        { id: 'count', label: '卡片数量', type: 'number', value: 3, min: 1, max: 12 },
        { id: 'free', label: '中心格FREE', type: 'checkbox', value: true },
        { id: 'range', label: '数字范围', type: 'select', value: '75',
          options: [{ value: '75', label: '1–75（美式 BINGO）' }, { value: '90', label: '1–90（英式宾果）' }] }
      ],
      hint: '美式规则每列限定区间：B=1-15、I=16-30、N=31-45、G=46-60、O=61-75；连线即 BINGO。',
      run: function (v) {
        var count = Math.max(1, Math.min(12, Number(v.count) || 1));
        var max = v.range === '90' ? 90 : 75;
        var ranges = v.range === '90'
          ? [1, 16, 31, 46, 61].map(function (s) { return [s, s + 17]; })
          : [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
        var cards = [];
        for (var c = 0; c < count; c += 1) {
          var grid = ranges.map(function (rg) {
            var pool = [];
            for (var n = rg[0]; n <= Math.min(rg[1], max); n += 1) pool.push(n);
            K.shuffle(pool);
            return pool.slice(0, 5);
          });
          cards.push(grid);
        }
        var html = cards.map(function (grid, idx) {
          var headers = v.range === '90' ? ['1-18', '19-36', '37-54', '55-72', '73-90'] : ['B', 'I', 'N', 'G', 'O'];
          var rowsHtml = '';
          for (var r = 0; r < 5; r += 1) {
            rowsHtml += '<tr>' + grid.map(function (col, ci) {
              if (r === 2 && ci === 2 && v.free) return '<td class="bingo-free">FREE</td>';
              return '<td>' + col[r] + '</td>';
            }).join('') + '</tr>';
          }
          return '<div class="bingo-card"><h4>卡片 ' + (idx + 1) + '</h4><table class="data-table bingo-table"><thead><tr>' +
            headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
        }).join('');
        return {
          html: '<div class="bingo-grid">' + html + '</div>',
          note: '已生成 ' + count + ' 张' + (v.free ? '（中心格 FREE）' : '')
        };
      }
    });
  }

  /* ------------------------------ 7. 用户名生成 ------------------------------ */
  var ADJ = ['swift', 'brave', 'calm', 'lucky', 'silent', 'wild', 'clever', 'cosmic', 'golden', 'hidden', 'electric', 'gentle', 'proud', 'quirky', 'rapid', 'sunny', 'tidy', 'vivid', 'zesty', 'mellow'];
  var NOUN = ['otter', 'falcon', 'tiger', 'panda', 'raven', 'wolf', 'lynx', 'koala', 'heron', 'otter', 'badger', 'comet', 'pixel', 'ember', 'summit', 'harbor', 'meadow', 'quartz', 'zephyr', 'willow'];
  var CN_ADJ = ['飞快', '淡定', '神秘', '闪光', '温柔', '勇敢', '机智', '悠闲', '蹦跳', '贪睡'];
  var CN_NOUN = ['橘猫', '柴犬', '企鹅', '海豚', '松鼠', '刺猬', '考拉', '水獭', '熊猫', '狐獴'];

  function renderRandomUsername(root) {
    K.form(root, {
      uid: 'username',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 60 },
        { id: 'lang', label: '风格', type: 'select', value: 'en',
          options: [{ value: 'en', label: '英文 swift-otter42' }, { value: 'cn', label: '中文 飞快的橘猫' }, { value: 'pinyin', label: '拼音 feikuai-jumao' }] },
        { id: 'number', label: '尾部数字位数', type: 'number', value: 2, min: 0, max: 6 }
      ],
      hint: '形容词 + 名词 + 数字的三段式用户名，好读好记，适合注册占位或演示账号。',
      run: function (v) {
        var count = Math.max(1, Math.min(60, Number(v.count) || 1));
        var digits = Math.max(0, Math.min(6, Number(v.number) || 0));
        var names = [];
        for (var i = 0; i < count; i += 1) {
          var num = '';
          for (var d = 0; d < digits; d += 1) num += K.randomInt(10);
          if (v.lang === 'cn') names.push(K.pick(CN_ADJ) + '的' + K.pick(CN_NOUN) + num);
          else {
            var a = v.lang === 'pinyin' ? 'kuai' : K.pick(ADJ);
            var n2 = v.lang === 'pinyin' ? 'mao' : K.pick(NOUN);
            names.push(a + '-' + n2 + num);
          }
        }
        var out = names.join('\n');
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '已生成 ' + count + ' 个用户名'
        };
      }
    });
  }

  /* ------------------------------ 8. 口令短语 ------------------------------ */
  var WORDS = ('able acid age apple arrow baby bag ball band base bath bean bear bell belt bird bit blade blue boat body bone book boot born bottle box brain bran bread brick bright brush build bulb burn bush cake camp can cap card care car case cash cat cave cell cent chair chalk charm chat chef chew chin chip city claw clay clear clip club coal coast coat code cold cone cook cool cop corn cost cow crack craft cream crew crop crown cube cup cut cycle dad daily dam dark data dawn day deal deer demo den desk dew dice diet dig dim dirt dish dock dog doll door dose dot dove drag dream drift drop drum dry duck dust duty each ear earth easy eat egg eight elbow elder elk elm end energy engine enter envelope era error even event exit eye face fact fade fair fall family fan farm fat fate feed feel fern field fig file fill film find fine fire fish fit five flag flat floor flower fly foam fog foil fold food foot fork form fort found four fox frame free fresh frog front fruit fuel fun fund fuse gain game gap gas gate gear gem gene get gift give glass globe glow goal goat gold golf good grab grace grade grain grand grass gray green grid grill grip grove grow guard guide gum gun gym habit hair half hall hand hang happy hard hat hate have hay head heal health heap heart heat hedge help hen herb here hero hidden high hill hint hire hive hold hole home honey hood hook hope horn horse host hot house huge human hunt hurry hut ice idea image impact inch index inner input insect iron item ivory jacket jade jar jazz jeep job join joke journey joy judge juice jump jungle just kangaroo keep key kick kid kind king kiss kit kite knee knife knot know lab lace lake lamp land lane large laser last late laugh launch lava lawn layer lazy lead leaf leap learn left leg lemon lend lens level lever life lift light like lime line link lion lip liquid list little live load loaf local lock log long look loop lose lot loud love low lucky lump lunch lung mad mail main make male mall map marble march market mask mass master match math mayor meal mean meat meet melt memo memory mend menu mercy merge mesh metal meter method middle milk mind mine mint minute mirror mission mix mobile model modern mold money monitor month moon moral more morning mortar move much mule music must myth nail name narrow nation nature near neck need needle neon nerve nest net never new news next nice night nine noble node noise normal north nose note now number nurse nut oak oasis object ocean odd offer office oil old olive onion open orange order organ other ounce outer oval oven owl own pace pack page paint pair palm pan panel paper park part pass past patch path patrol pattern pause paw pay peace peak pear pearl pebble pen pencil people pepper perfect permit pet phone photo piano pick pie piece pier pig pile pilot pin pine pink pipe pitch pity plain plan plant plate play plaza pledge plot plow plug plum plus pocket poem point polar pole pond pool port position post pot pouch pound pour powder power practice price print prize probe profit prompt proud prove pull pulse pump punch pupil pure purple push put puzzle pyramid rabbit race radio rain rake ranch range rank rapid rare rate ratio raven reach read ready real reason rebel recipe record red reed reel region relay relief remain remedy remind remote remove rent repair reply report rescue reset resin rest result retail return reveal rhythm rice rich ride ridge rifle right ring rinse ripple rise risk river road roast robot rock rocket rod role roll roof room root rope rose rough round route row royal rubber rug rule run rush rust sack sad safe sail salad sale salon salt same sand sap save scale scan scar school score scout scrap screen scroll sea seal search season seat second secret seed seek sell send sense serve session set seven shade shadow shake shallow shape share shark sharp sheep sheet shelf shell shift shine ship shirt shock shoot shop short shot show shrub side sight sign silk silver simple since sing sink site six size skate skill skin skirt sky slate sleep slice slide slope slot slow small smart smile smoke smooth snake snow soap soccer social sock soda soft soil solar sold solid solve son song soon sort sound soup source south space spare spark speak speed spell spend sphere spice spider spike spin spirit split spoke spoon sport spot spray spread spring spray square squad stable stack staff stage stairs stamp stand star start state stay steak steal steam steel step stick still stitch stock stone stop store storm story stove straight strange street stretch strict strike string strong studio study stuff style sugar suggest suit summer sun supply support sure surf surprise swamp sweet swim swing switch sword system table tackle tail talk tall tank tape target task taste taxi tea teach team tear tech teeth temple ten tend tent term test text thank theme thick thin thing think third thorn thought thousand thread three thrive throat throne thumb thunder ticket tide tidy tiger tight tile time tiny tip title toast today toe tomato tomorrow tone tongue tonight tool tooth top torch total touch tour tower town toy trace track trade trail train tram trap travel tray treat tree trend trial tribe trick trip troop trophy tropical trout truck true trumpet trunk trust truth tube tulip tuna tune tunnel turn turtle twelve twenty twin twist two type typewriter ugly umbrella uncle under union unit until up upper urban usage user valid valley value valve van vapor variety vast vault vegetable vehicle velvet vendor verify version vessel veteran veto viable video view village vine violin virtue vision visit vital vivid vocal voice volcano volume vote voyage wage wagon wait wake walk wall walnut wand want war warm warn wash waste watch water wave wax way weak wealth weapon wear weather web wedding week weight welcome welfare well west wet wheat wheel where which while white whole wide wild will win wind window wing winter wire wisdom wise wish wit wolf woman wonder wood wool word work world worth wrap wrist write yard yarn year yellow yield young zebra zone'.split(' ')).filter(function (w, i, arr) { return arr.indexOf(w) === i; });

  function renderPassphrase(root) {
    K.form(root, {
      uid: 'passphrase',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '生成条数', type: 'number', value: 5, min: 1, max: 50 },
        { id: 'words', label: '单词数', type: 'number', value: 4, min: 3, max: 8 },
        { id: 'sep', label: '分隔符', type: 'select', value: '-',
          options: [{ value: '-', label: '短横线' }, { value: '.', label: '点号' }, { value: ' ', label: '空格' }] },
        { id: 'cap', label: '首字母大写', type: 'checkbox' },
        { id: 'num', label: '附加数字', type: 'checkbox', value: true }
      ],
      hint: 'XKCD 风格口令短语：单词组合比随机乱码更长更好记。词库约 ' + WORDS.length + ' 词，4 词组合熵约 45 bit。',
      run: function (v) {
        var count = Math.max(1, Math.min(50, Number(v.count) || 1));
        var wordCount = Math.max(3, Math.min(8, Number(v.words) || 4));
        var sep = v.sep === '.' ? '.' : v.sep === ' ' ? ' ' : '-';
        var list = [];
        for (var i = 0; i < count; i += 1) {
          var parts = [];
          for (var w = 0; w < wordCount; w += 1) {
            var word = K.pick(WORDS);
            if (v.cap) word = word.charAt(0).toUpperCase() + word.slice(1);
            parts.push(word);
          }
          if (v.num) parts.push(String(K.randomInt(100)).padStart(2, '0'));
          list.push(parts.join(sep));
        }
        var entropy = Math.round(wordCount * Math.log2(WORDS.length) + (v.num ? 6.6 : 0));
        return {
          html: '<pre class="code-block">' + K.esc(list.join('\n')) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(list.join('\n')) + '">复制全部</button></div>',
          rows: [
            { key: '词库大小', value: WORDS.length + ' 词' },
            { key: '单条熵值', value: '约 ' + entropy + ' bit（' + (entropy >= 60 ? '强' : entropy >= 45 ? '中等偏强' : '够用但偏弱') + '）' }
          ],
          note: '点击代码块下方复制按钮逐条使用；建议配合密码管理器'
        };
      }
    });
  }

  /* ------------------------------ 9. 数独生成 ------------------------------ */
  function solveSudoku(grid, rng) {
    function candidates(r, c) {
      var used = new Array(10).fill(false);
      for (var i = 0; i < 9; i += 1) {
        used[grid[r][i]] = true;
        used[grid[i][c]] = true;
      }
      var br = Math.floor(r / 3) * 3;
      var bc = Math.floor(c / 3) * 3;
      for (var rr = br; rr < br + 3; rr += 1) {
        for (var cc = bc; cc < bc + 3; cc += 1) used[grid[rr][cc]] = true;
      }
      var list = [];
      for (var n = 1; n <= 9; n += 1) if (!used[n]) list.push(n);
      return list;
    }
    function findEmpty() {
      for (var r = 0; r < 9; r += 1) for (var c = 0; c < 9; c += 1) if (!grid[r][c]) return [r, c];
      return null;
    }
    var steps = 0;
    function solve() {
      var empty = findEmpty();
      if (!empty) return true;
      if (++steps > 100000) return false;
      var r = empty[0];
      var c = empty[1];
      var opts = candidates(r, c);
      if (rng) K.shuffle(opts);
      for (var i = 0; i < opts.length; i += 1) {
        grid[r][c] = opts[i];
        if (solve()) return true;
        grid[r][c] = 0;
      }
      return false;
    }
    return solve();
  }

  function renderRandomSudoku(root) {
    K.form(root, {
      uid: 'sudoku',
      actionLabel: '生成数独',
      fields: [
        { id: 'difficulty', label: '难度（挖空格数）', type: 'select', value: '40',
          options: [{ value: '30', label: '简单（挖 30 格）' }, { value: '40', label: '中等（挖 40 格）' }, { value: '50', label: '困难（挖 50 格）' }] },
        { id: 'count', label: '生成几盘', type: 'number', value: 2, min: 1, max: 6 }
      ],
      hint: '生成完整解后随机挖空；不保证唯一解，仅供娱乐与打印。',
      run: function (v) {
        var holes = Math.max(20, Math.min(60, Number(v.difficulty) || 40));
        var count = Math.max(1, Math.min(6, Number(v.count) || 1));
        var boards = [];
        for (var n = 0; n < count; n += 1) {
          var grid = [];
          for (var r = 0; r < 9; r += 1) grid.push(new Array(9).fill(0));
          if (!solveSudoku(grid, true)) return { error: '生成失败，请重试' };
          var solution = grid.map(function (row) { return row.slice(); });
          var cells = [];
          for (var i = 0; i < 81; i += 1) cells.push(i);
          K.shuffle(cells);
          var removed = 0;
          for (var k = 0; k < cells.length && removed < holes; k += 1) {
            grid[Math.floor(cells[k] / 9)][cells[k] % 9] = 0;
            removed += 1;
          }
          boards.push({ puzzle: grid, solution: solution });
        }
        var html = boards.map(function (b, idx) {
          var rowsHtml = b.puzzle.map(function (row, r) {
            return '<tr>' + row.map(function (num) {
              return '<td class="' + (num ? 'sudoku-given' : 'sudoku-empty') + '">' + (num || '·') + '</td>';
            }).join('') + '</tr>';
          }).join('');
          var solRows = b.solution.map(function (row) {
            return '<tr>' + row.map(function (num) { return '<td>' + num + '</td>'; }).join('') + '</tr>';
          }).join('');
          return '<div class="bingo-card"><h4>第 ' + (idx + 1) + ' 盘</h4>' +
            '<table class="data-table sudoku-table"><tbody>' + rowsHtml + '</tbody></table>' +
            '<details><summary class="link-btn" style="cursor:pointer">查看答案</summary>' +
            '<table class="data-table sudoku-table"><tbody>' + solRows + '</tbody></table></details></div>';
        }).join('');
        return {
          html: '<div class="bingo-grid">' + html + '</div>',
          note: '已生成 ' + count + ' 盘，每盘挖空 ' + holes + ' 格'
        };
      }
    });
  }

  window.ToolModules['random-color'] = renderRandomColor;
  window.ToolModules['weighted-pick'] = renderWeightedPick;
  window.ToolModules['mock-data'] = renderMockData;
  window.ToolModules['tournament'] = renderTournament;
  window.ToolModules['secret-santa'] = renderSecretSanta;
  window.ToolModules['bingo-card'] = renderBingoCard;
  window.ToolModules['random-username'] = renderRandomUsername;
  window.ToolModules['passphrase'] = renderPassphrase;
  window.ToolModules['random-sudoku'] = renderRandomSudoku;
})();

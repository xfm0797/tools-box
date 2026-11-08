/* =============================================================================
 * 随机生成工具包 · 第五批（10 个）
 * -----------------------------------------------------------------------------
 * random-number-list 随机整数列表
 * random-ipv6       随机 IPv6 地址
 * random-word       随机英文单词
 * random-codename   项目代号
 * random-coords     随机经纬度
 * random-imei       IMEI 生成
 * random-plate      车牌号生成
 * random-cron       随机 Cron 表达式
 * random-ua         随机 User-Agent
 * random-api-key    随机 API Key
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function lines(list) {
    return list.join('\n');
  }

  function randomIntBetween(min, max) {
    if (max <= min) return min;
    return min + K.randomInt(max - min + 1);
  }

  /* ------------------------------ 1. 随机整数列表 ------------------------------ */
  function renderNumberList(root) {
    K.form(root, {
      uid: 'numlist',
      fields: [
        { id: 'min', label: '最小值', type: 'number', value: 1 },
        { id: 'max', label: '最大值', type: 'number', value: 100 },
        { id: 'count', label: '个数', type: 'number', value: 10, min: 1, max: 5000 },
        { id: 'unique', label: '不重复', type: 'checkbox', value: true },
        { id: 'sort', label: '排序', type: 'select', value: 'none', options: [
          { value: 'none', label: '不排序' },
          { value: 'asc', label: '升序' },
          { value: 'desc', label: '降序' }
        ] },
        { id: 'separator', label: '分隔符', type: 'select', value: 'comma', options: [
          { value: 'comma', label: '逗号 ,' },
          { value: 'space', label: '空格' },
          { value: 'newline', label: '换行' }
        ] }
      ],
      actionLabel: '生成',
      hint: '用系统安全随机源（crypto.getRandomValues）取值，不会出现 Math.random 在大范围内分布不均的问题。抽奖、分组、抽签都可直接用。',
      sample: { min: 1, max: 100, count: 10, unique: true, sort: 'none', separator: 'comma' },
      run: function (values) {
        var min = Math.ceil(parseFloat(values.min));
        var max = Math.floor(parseFloat(values.max));
        var count = Math.max(1, Math.min(5000, parseInt(values.count, 10) || 1));
        if (!isFinite(min) || !isFinite(max)) return { error: '请输入有效的最小值与最大值' };
        if (max < min) return { error: '最大值不能小于最小值' };
        var range = max - min + 1;
        if (values.unique && count > range) {
          return { error: '区间只有 ' + range + ' 个整数，无法取 ' + count + ' 个不重复的值' };
        }
        var picked = [];
        if (values.unique) {
          var pool = {};
          while (picked.length < count) {
            var value = randomIntBetween(min, max);
            if (pool[value]) continue;
            pool[value] = true;
            picked.push(value);
          }
        } else {
          for (var i = 0; i < count; i += 1) picked.push(randomIntBetween(min, max));
        }
        if (values.sort === 'asc') picked.sort(function (a, b) { return a - b; });
        if (values.sort === 'desc') picked.sort(function (a, b) { return b - a; });
        var sep = values.separator === 'space' ? ' ' : values.separator === 'newline' ? '\n' : ', ';
        var sum = picked.reduce(function (a, b) { return a + b; }, 0);
        return {
          output: picked.join(sep),
          note: count + ' 个数，区间 ' + min + '–' + max + '，合计 ' + sum + '，均值 ' + K.num(sum / count, 2)
        };
      }
    });
  }

  /* ------------------------------ 2. 随机 IPv6 ------------------------------ */
  function renderRandomIpv6(root) {
    K.form(root, {
      uid: 'ripv6',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'prefix', label: '固定前缀（可空）', type: 'text', placeholder: '如 2001:db8' },
        { id: 'compress', label: '使用 :: 压缩写法', type: 'checkbox', value: false }
      ],
      actionLabel: '生成',
      hint: '文档与示例推荐使用 2001:db8::/32 这个保留段，真实分配请向运营商申请。生成的地址只用于测试与占位。',
      sample: { count: 5, prefix: '2001:db8', compress: false },
      run: function (values) {
        var count = Math.max(1, Math.min(100, parseInt(values.count, 10) || 1));
        var prefix = String(values.prefix || '').trim().replace(/:+$/, '');
        if (prefix && !/^[0-9a-fA-F:]+$/.test(prefix)) return { error: '前缀只能是十六进制与冒号' };
        var prefixGroups = prefix ? prefix.split(':') : [];
        if (prefixGroups.length > 7) return { error: '前缀最多 7 组' };
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var groups = prefixGroups.slice();
          while (groups.length < 8) {
            groups.push(('000' + K.randomInt(65536).toString(16)).slice(-4));
          }
          var full = groups.join(':');
          if (values.compress) {
            full = full.replace(/\b0{1,4}\b/g, '0').replace(/(^|:)0(:0)+(:|$)/, '::').replace(/:::/g, '::');
          }
          out.push(full);
        }
        return { output: lines(out), note: '已生成 ' + count + ' 个地址' };
      }
    });
  }

  /* ------------------------------ 3. 随机英文单词 ------------------------------ */
  var WORDS = ('able about above accept account across action active actual adapt admit adult after again against age agent agree ahead alarm album alert ' +
    'alive allow almost alone along already also alter always amount ancient anger angle animal answer anyone appear apple apply area argue arise arm ' +
    'around arrive art article artist ask attack author autumn avoid awake award aware away baby back bad bag balance ball band bank base basic basket ' +
    'battle beach bear beat beauty become bed before begin behind believe below benefit best better between beyond bicycle big bill bird birth bit ' +
    'black blank blind block blood blue board boat body bone book boost border born both bottle bottom brain branch brave bread break breath brick ' +
    'bridge brief bright bring broad brown brush build bullet bunch burst bus bush business busy butter button buy cabin cable cake call calm camera ' +
    'camp canal candy canvas cap capital car card care carry case cash castle catch cause cave cell center chain chair chance change channel chapter ' +
    'charge chart chase cheap check cheese chest chief child choice choose church circle city claim class clean clear clever climb clock close cloth ' +
    'cloud club coach coast coat code coffee cold collect color column combine come comfort common company compare complete computer concept concert ' +
    'condition confirm connect consider contact contain content contest control convert cook cool copper copy corner correct cost cotton count country ' +
    'course cover craft crash create credit crew cross crowd crown culture cup current custom cycle daily damage dance danger dark data deal debate ' +
    'decade decide deep default degree deliver demand density depend describe desert design desk detail develop device diagram diary differ dinner ' +
    'direct dirt discuss dish display distance divide doctor document dog dollar domain double doubt down draft drag drama draw dream dress drill ' +
    'drink drive drop drum dry duck dust duty eager eagle early earn earth ease east easy edge edit effect effort eight either elect element else ' +
    'email empty enable end energy engine enjoy enough enter entire entry equal error escape even evening event every exact example exist exit ' +
    'expand expect expert explain express extra eye face fact factor fail fair faith fall family famous fan farm fast father fault fear feature feed ' +
    'feel fence few field fight figure file fill film final find fine finger finish fire firm first fish fit five fix flag flame flat flight floor ' +
    'flow flower fly focus fold follow food foot force forest forget form forward frame free fresh friend front fruit fuel full fun function fund ' +
    'future gain game garden gas gate gather general gentle gift girl give glass globe goal gold good govern grade grain grand grant grass great ' +
    'green grid ground group grow guard guess guest guide habit hair half hall hand hang happen happy hard harm hat head health hear heart heat heavy ' +
    'height hello help here hero high hill hint history hold hole home honest hope horse host hot hotel hour house human humor hunt hurry ice idea ' +
    'image impact imply import improve inch include increase indeed index indoor inform initial input inside insist install instant instead interest ' +
    'into invite iron island issue item jacket join joke journey judge juice jump just keep key kick kind king kitchen knee knock know label labor ' +
    'lack lady lake land language large last late laugh launch layer lazy lead leaf learn least leather leave left legal lemon length less letter ' +
    'level library light like limit line link lion list listen little live load local lock logic long look lose loss loud love low luck lunch ' +
    'machine magic mail main major make manage manner many map march mark market marry master match matter maybe meal mean measure meat media meet ' +
    'member memory mention menu message metal method middle might mile milk mind mine minute mirror miss mix mobile model modern moment money month ' +
    'moon more morning most mother motion mount mouse mouth move movie much music must name narrow nation nature near neck need negative neighbor ' +
    'nervous nest net network never news next nice night nine noble noise none noon north nose note notice number nurse object obtain occur ocean ' +
    'offer office often oil old once online only open opinion option orange order organ other outdoor over own owner pace pack page pain paint pair ' +
    'paper parent park part party pass past path patient pattern pause peace pen people pepper perfect period person phone photo phrase pick picture ' +
    'piece pilot pink pipe place plain plan plant plate play please plenty pocket poem point police policy pool poor popular port position possible ' +
    'post potato pound power practice praise predict prefer prepare present press pretty prevent price pride print prison private prize problem ' +
    'process produce profit program project promise proof proper protect proud prove public pull pulse pump punch pupil purple purpose push put ' +
    'quality quarter queen question quick quiet quit quote race radio rain raise range rank rapid rate rather reach read ready real reason receive ' +
    'record recover red reduce refer reflect refuse region regret regular reject relate relax release remain remember remind remove rent repair ' +
    'repeat replace reply report request require rescue research reserve resist resource respect rest result return reveal review reward rice rich ' +
    'ride right ring rise risk river road robot rock role roll roof room root rope rough round route row royal rubber rule run rush safe sail salt ' +
    'same sample sand save scale scan scene school science score screen sea search season seat second secret section secure see seed seek seem ' +
    'select sell send sense sentence separate series serve service session set settle seven shade shake shall shape share sharp shelf shell shift ' +
    'shine ship shirt shock shoe shop short should shoulder shout show side sign silent silver similar simple since sing single sink site six size ' +
    'skill skin sky sleep slide slight slip slow small smart smile smoke snow social soft soil solar sold solid solve some song soon sorry sort ' +
    'sound source south space speak special speed spell spend spirit split sport spot spread spring square stage stair stamp stand star start ' +
    'state stay steady steam steel step stick still stock stone stop store storm story straight strange stream street stress stretch strike ' +
    'strong study stuff style subject succeed such sudden sugar suggest suit summer sun supply support sure surface surprise survey survive swim ' +
    'switch symbol system table take talk tall target task taste teach team teeth tell temple ten test text thank that theme then theory there ' +
    'thick thin thing think third though thought three throw ticket tidy tie tight time tiny tired title today together tomato tone tool total ' +
    'touch tough tour toward tower town track trade traffic train travel treat tree trend trial trip trouble truck true trust truth try tube turn ' +
    'twice type under unit until upper urban usage useful usual valley value vary vast vehicle venture version very video view village vinyl ' +
    'visit voice volume vote wait walk wall want warm warn wash waste watch water wave way weak wealth wear weather week weight welcome well west ' +
    'wet wheel while white whole wide wild will win wind window wine winter wire wise wish woman wonder wood word work world worry worth wrap ' +
    'write wrong yard year yellow yes yesterday young zero zone').split(' ');

  function renderRandomWord(root) {
    K.form(root, {
      uid: 'rword',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 8, min: 1, max: 100 },
        { id: 'unique', label: '不重复', type: 'checkbox', value: true },
        { id: 'separator', label: '分隔符', type: 'select', value: 'space', options: [
          { value: 'space', label: '空格' },
          { value: 'comma', label: '逗号' },
          { value: 'newline', label: '换行' }
        ] },
        { id: 'capital', label: '首字母大写', type: 'checkbox', value: false }
      ],
      actionLabel: '生成',
      hint: '内置约 1200 个常用英文单词，可用于命名词库、验证码口令、假文填充与英语练习出题。',
      sample: { count: 8, unique: true, separator: 'space', capital: false },
      run: function (values) {
        var count = Math.max(1, Math.min(100, parseInt(values.count, 10) || 1));
        var picked = [];
        if (values.unique) {
          var seen = {};
          var guard = 0;
          while (picked.length < count && guard < count * 200) {
            var word = K.pick(WORDS);
            guard += 1;
            if (seen[word]) continue;
            seen[word] = true;
            picked.push(word);
          }
        } else {
          for (var i = 0; i < count; i += 1) picked.push(K.pick(WORDS));
        }
        if (values.capital) {
          picked = picked.map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1); });
        }
        var sep = values.separator === 'comma' ? ', ' : values.separator === 'newline' ? '\n' : ' ';
        return { output: picked.join(sep), note: '词库共 ' + WORDS.length + ' 个单词，本次取 ' + picked.length + ' 个' };
      }
    });
  }

  /* ------------------------------ 4. 项目代号 ------------------------------ */
  var ADJ = ['静默', '漂移', '晨光', '深蓝', '疾风', '暗涌', '跃迁', '零度', '铁幕', '流光', '赤道', '琥珀',
    '极地', '回声', '荒原', '北极星', '白露', '雷鸣', '沙丘', '银河', '轻舟', '拂晓', '长夜', '微光'];
  var NOUN = ['信标', '矩阵', '棱镜', '港湾', '星轨', '方舟', '藤蔓', '蜂巢', '磐石', '棱堡', '灯塔', '渡口',
    '引擎', '脉络', '罗盘', '风帆', '织网', '沙盘', '轨道', '阀门', '穹顶', '锚点', '瞬态', '织机'];

  function renderCodename(root) {
    K.form(root, {
      uid: 'codename',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 6, min: 1, max: 50 },
        { id: 'style', label: '风格', type: 'select', value: 'cn', options: [
          { value: 'cn', label: '中文：形容词 + 名词' },
          { value: 'cnnum', label: '中文 + 编号（如 信标-07）' },
          { value: 'en', label: '英文代号（如 NEBULA-7）' }
        ] }
      ],
      actionLabel: '生成',
      hint: '版本、分支、测试环境、内部项目都需要不重名的代号。两段式组合词记忆成本低，也方便口头沟通。',
      sample: { count: 6, style: 'cnnum' },
      run: function (values) {
        var count = Math.max(1, Math.min(50, parseInt(values.count, 10) || 1));
        var en = ['NEBULA', 'ATLAS', 'ORBIT', 'VECTOR', 'PRISM', 'HARBOR', 'ECHO', 'QUARTZ', 'LUMEN', 'CIPHER',
          'PULSAR', 'TUNDRA', 'ZENITH', 'KESTREL', 'MAGNET', 'ONYX', 'SABLE', 'VORTEX', 'HELIOS', 'NIMBUS'];
        var out = [];
        var used = {};
        for (var i = 0; i < count; i += 1) {
          var name = '';
          var guard = 0;
          do {
            if (values.style === 'en') {
              name = K.pick(en) + '-' + randomIntBetween(1, 99);
            } else if (values.style === 'cnnum') {
              name = K.pick(NOUN) + '-' + ('0' + randomIntBetween(1, 99)).slice(-2);
            } else {
              name = K.pick(ADJ) + K.pick(NOUN);
            }
            guard += 1;
          } while (used[name] && guard < 60);
          used[name] = true;
          out.push(name);
        }
        return { output: lines(out), note: '已生成 ' + out.length + ' 个代号' };
      }
    });
  }

  /* ------------------------------ 5. 随机经纬度 ------------------------------ */
  function renderCoords(root) {
    K.form(root, {
      uid: 'rcoords',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'area', label: '范围', type: 'select', value: 'cn', options: [
          { value: 'world', label: '全球' },
          { value: 'cn', label: '中国陆地大致范围' },
          { value: 'custom', label: '自定义范围（下方填写）' }
        ] },
        { id: 'box', label: '自定义范围 南,西,北,东', type: 'text', value: '18,73,54,135' },
        { id: 'digits', label: '小数位', type: 'number', value: 6, min: 2, max: 6 }
      ],
      actionLabel: '生成',
      hint: '仅生成坐标文本，不涉及地图渲染。用于测试地图组件、坐标解析与距离计算；中国范围内的随机点可能落在海上或无人区。',
      sample: { count: 5, area: 'cn', box: '18,73,54,135', digits: 6 },
      run: function (values) {
        var count = Math.max(1, Math.min(100, parseInt(values.count, 10) || 1));
        var digits = Math.max(2, Math.min(6, parseInt(values.digits, 10) || 6));
        var south = -85;
        var west = -180;
        var north = 85;
        var east = 180;
        if (values.area === 'cn') {
          south = 18; west = 73; north = 54; east = 135;
        } else if (values.area === 'custom') {
          var parts = String(values.box || '').split(/[,，\s]+/).map(parseFloat);
          if (parts.length !== 4 || parts.some(function (num) { return !isFinite(num); })) {
            return { error: '自定义范围需填 4 个数字：南, 西, 北, 东' };
          }
          south = Math.max(-90, parts[0]);
          west = Math.max(-180, parts[1]);
          north = Math.min(90, parts[2]);
          east = Math.min(180, parts[3]);
          if (north <= south || east <= west) return { error: '北应大于南，东应大于西' };
        }
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var lat = south + Math.random() * (north - south);
          var lng = west + Math.random() * (east - west);
          out.push(lat.toFixed(digits) + ', ' + lng.toFixed(digits));
        }
        return { output: lines(out), note: '纬度范围 ' + south + '–' + north + '，经度范围 ' + west + '–' + east };
      }
    });
  }

  /* ------------------------------ 6. IMEI ------------------------------ */
  function luhnCheckDigit(digits) {
    var sum = 0;
    var double = true;
    for (var i = digits.length - 1; i >= 0; i -= 1) {
      var num = digits.charCodeAt(i) - 48;
      if (double) {
        num *= 2;
        if (num > 9) num -= 9;
      }
      sum += num;
      double = !double;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function renderImei(root) {
    K.form(root, {
      uid: 'rimei',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'tac', label: 'TAC 前 8 位（可空）', type: 'text', placeholder: '如 35391807' }
      ],
      actionLabel: '生成',
      hint: 'IMEI 共 15 位：8 位 TAC + 6 位序列号 + 1 位 Luhn 校验位。这里的号码仅供测试系统校验逻辑，不对应真实设备。',
      sample: { count: 5, tac: '' },
      run: function (values) {
        var count = Math.max(1, Math.min(100, parseInt(values.count, 10) || 1));
        var tac = String(values.tac || '').replace(/\D/g, '');
        if (tac && tac.length !== 8) return { error: 'TAC 必须是 8 位数字' };
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var prefix = tac;
          while (prefix.length < 8) prefix += String(K.randomInt(10));
          var serial = '';
          for (var j = 0; j < 6; j += 1) serial += String(K.randomInt(10));
          var body = prefix + serial;
          out.push(body + luhnCheckDigit(body));
        }
        return { output: lines(out), note: '已生成 ' + count + ' 个通过 Luhn 校验的 IMEI' };
      }
    });
  }

  /* ------------------------------ 7. 车牌号 ------------------------------ */
  var PROVINCE = ['京', '津', '沪', '渝', '冀', '豫', '云', '辽', '黑', '湘', '皖', '鲁', '新', '苏', '浙',
    '赣', '鄂', '桂', '甘', '晋', '蒙', '陕', '吉', '闽', '贵', '粤', '青', '藏', '川', '宁', '琼'];
  var PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  function renderPlate(root) {
    K.form(root, {
      uid: 'plate',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 50 },
        { id: 'type', label: '类型', type: 'select', value: 'normal', options: [
          { value: 'normal', label: '普通燃油车（5 位）' },
          { value: 'new', label: '新能源车（6 位）' }
        ] },
        { id: 'province', label: '指定省份（可空）', type: 'text', placeholder: '如 粤' }
      ],
      actionLabel: '生成',
      hint: '中国车牌不含字母 I 和 O，避免与 1、0 混淆。新能源车牌为 6 位，小型车第三位是 D/F。仅供测试与占位，不能上路。',
      sample: { count: 5, type: 'normal', province: '' },
      run: function (values) {
        var count = Math.max(1, Math.min(50, parseInt(values.count, 10) || 1));
        var fixedProvince = String(values.province || '').trim();
        if (fixedProvince && PROVINCE.indexOf(fixedProvince) < 0) return { error: '省份简称不合法，如 京、粤、川' };
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var province = fixedProvince || K.pick(PROVINCE);
          var city = PLATE_LETTERS.charAt(K.randomInt(PLATE_LETTERS.length));
          var body = '';
          if (values.type === 'new') {
            body += K.pick(['D', 'F']);
            for (var j = 0; j < 5; j += 1) {
              body += K.randomInt(2) ? String(K.randomInt(10)) : PLATE_LETTERS.charAt(K.randomInt(PLATE_LETTERS.length));
            }
          } else {
            for (var k = 0; k < 5; k += 1) {
              body += K.randomInt(2) ? String(K.randomInt(10)) : PLATE_LETTERS.charAt(K.randomInt(PLATE_LETTERS.length));
            }
          }
          out.push(province + ' ' + city + '·' + body);
        }
        return { output: lines(out), note: '已生成 ' + count + ' 个测试车牌' };
      }
    });
  }

  /* ------------------------------ 8. 随机 Cron ------------------------------ */
  var CRON_TEMPLATES = [
    { make: function () { return K.randomInt(60) + ' ' + K.randomInt(24) + ' * * *'; }, desc: '每天固定时刻执行一次' },
    { make: function () { return '*/' + K.pick([5, 10, 15, 20, 30]) + ' * * * *'; }, desc: '每隔若干分钟执行' },
    { make: function () { return K.randomInt(60) + ' */' + K.pick([2, 3, 4, 6, 8, 12]) + ' * * *'; }, desc: '每隔若干小时执行' },
    { make: function () { return K.randomInt(60) + ' ' + K.randomInt(24) + ' * * ' + K.randomInt(7); }, desc: '每周固定一天执行' },
    { make: function () { return K.randomInt(60) + ' ' + K.randomInt(24) + ' ' + (1 + K.randomInt(28)) + ' * *'; }, desc: '每月固定一天执行' },
    { make: function () { return K.randomInt(60) + ' ' + K.randomInt(24) + ' 1 ' + K.pick([1, 3, 6, 9]) + ' *'; }, desc: '每季度首日执行' },
    { make: function () { return K.randomInt(60) + ' ' + K.pick([9, 12, 18]) + ' * * 1-' + K.pick([5, 6]); }, desc: '工作日固定时刻执行' }
  ];

  function renderCronRandom(root) {
    K.form(root, {
      uid: 'rcron',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 20 },
        { id: 'withSecond', label: '输出 6 段（含秒）', type: 'checkbox', value: false }
      ],
      actionLabel: '生成',
      hint: '生成的是「能跑」的常用表达式，覆盖分钟级、小时级、每周、每月与季度四类调度，可直接粘进 crontab 或 CI 配置。',
      sample: { count: 5, withSecond: false },
      run: function (values) {
        var count = Math.max(1, Math.min(20, parseInt(values.count, 10) || 1));
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var tpl = K.pick(CRON_TEMPLATES);
          var expr = tpl.make();
          if (values.withSecond) expr = K.pick([0, 0, 0, 15, 30]) + ' ' + expr;
          out.push(expr + '    # ' + tpl.desc);
        }
        return { output: lines(out), note: values.withSecond ? '6 段格式（秒 分 时 日 月 周）' : '5 段格式（分 时 日 月 周）' };
      }
    });
  }

  /* ------------------------------ 9. 随机 UA ------------------------------ */
  function chromeUa() {
    var major = 120 + K.randomInt(8);
    return 'Mozilla/5.0 (' + K.pick([
      'Windows NT 10.0; Win64; x64',
      'Macintosh; Intel Mac OS X 10_15_7',
      'X11; Linux x86_64'
    ]) + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + major + '.0.' + (4000 + K.randomInt(1000)) + '.' +
      (100 + K.randomInt(120)) + ' Safari/537.36';
  }

  function safariUa() {
    return 'Mozilla/5.0 (' + K.pick([
      'Macintosh; Intel Mac OS X 10_15_7',
      'iPhone; CPU iPhone OS 17_' + K.randomInt(6) + ' like Mac OS X',
      'iPad; CPU OS 17_' + K.randomInt(6) + ' like Mac OS X'
    ]) + ') AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.' + K.randomInt(6) +
      (K.randomInt(2) ? ' Mobile/15E148' : '') + ' Safari/605.1.15';
  }

  function firefoxUa() {
    return 'Mozilla/5.0 (' + K.pick([
      'Windows NT 10.0; Win64; x64; rv:124.0',
      'Macintosh; Intel Mac OS X 14.' + K.randomInt(5) + '; rv:124.0',
      'X11; Ubuntu; Linux x86_64; rv:124.0'
    ]) + ') Gecko/20100101 Firefox/' + (120 + K.randomInt(8)) + '.0';
  }

  function androidUa() {
    return 'Mozilla/5.0 (Linux; Android ' + (12 + K.randomInt(3)) + '; ' + K.pick(['Pixel 7', 'SM-S918B', 'MI 13', 'OnePlus 11']) +
      ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + (120 + K.randomInt(8)) + '.0.0.0 Mobile Safari/537.36';
  }

  function renderRandomUa(root) {
    K.form(root, {
      uid: 'rua',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 50 },
        { id: 'browser', label: '浏览器', type: 'select', value: 'all', options: [
          { value: 'all', label: '混合' },
          { value: 'chrome', label: 'Chrome 桌面' },
          { value: 'safari', label: 'Safari' },
          { value: 'firefox', label: 'Firefox' },
          { value: 'android', label: 'Android Chrome' }
        ] }
      ],
      actionLabel: '生成',
      hint: '爬虫、埋点、兼容性测试常用随机 UA 造样本。版本号是随机拼的，只保证结构真实，不保证对应真实发布版本。',
      sample: { count: 5, browser: 'all' },
      run: function (values) {
        var count = Math.max(1, Math.min(50, parseInt(values.count, 10) || 1));
        var makers = values.browser === 'chrome' ? [chromeUa]
          : values.browser === 'safari' ? [safariUa]
            : values.browser === 'firefox' ? [firefoxUa]
              : values.browser === 'android' ? [androidUa]
                : [chromeUa, safariUa, firefoxUa, androidUa];
        var out = [];
        for (var i = 0; i < count; i += 1) out.push(K.pick(makers)());
        return { output: lines(out), note: '已生成 ' + count + ' 条 UA' };
      }
    });
  }

  /* ------------------------------ 10. 随机 API Key ------------------------------ */
  var KEY_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function renderApiKey(root) {
    K.form(root, {
      uid: 'rapikey',
      fields: [
        { id: 'prefix', label: '前缀', type: 'select', value: 'sk_live_', options: [
          { value: 'sk_live_', label: 'sk_live_（Stripe 风格）' },
          { value: 'sk_test_', label: 'sk_test_' },
          { value: 'ghp_', label: 'ghp_（GitHub 风格）' },
          { value: 'xoxb-', label: 'xoxb-（Slack 风格）' },
          { value: '', label: '无前缀' }
        ] },
        { id: 'length', label: '随机部分长度', type: 'number', value: 32, min: 8, max: 96 },
        { id: 'count', label: '数量', type: 'number', value: 3, min: 1, max: 50 },
        { id: 'group', label: '每 4 位加短横线', type: 'checkbox', value: false }
      ],
      actionLabel: '生成',
      hint: '只用于本地测试的占位密钥。真实密钥请用 openssl rand -base64 32 生成并放进密钥管理服务，绝不要提交到仓库。',
      sample: { prefix: 'sk_live_', length: 32, count: 3, group: false },
      run: function (values) {
        var length = Math.max(8, Math.min(96, parseInt(values.length, 10) || 32));
        var count = Math.max(1, Math.min(50, parseInt(values.count, 10) || 1));
        var prefix = values.prefix || '';
        var out = [];
        for (var i = 0; i < count; i += 1) {
          var body = '';
          for (var j = 0; j < length; j += 1) {
            body += KEY_CHARS.charAt(K.randomInt(KEY_CHARS.length));
          }
          if (values.group) body = body.replace(/(.{4})/g, '$1-').replace(/-$/, '');
          out.push(prefix + body);
        }
        var entropy = Math.round(length * Math.log2(KEY_CHARS.length));
        return { output: lines(out), note: '每个密钥约 ' + entropy + ' bit 熵（' + length + ' 位 62 进制）' };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['random-number-list'] = renderNumberList;
  window.ToolModules['random-ipv6'] = renderRandomIpv6;
  window.ToolModules['random-word'] = renderRandomWord;
  window.ToolModules['random-codename'] = renderCodename;
  window.ToolModules['random-coords'] = renderCoords;
  window.ToolModules['random-imei'] = renderImei;
  window.ToolModules['random-plate'] = renderPlate;
  window.ToolModules['random-cron'] = renderCronRandom;
  window.ToolModules['random-ua'] = renderRandomUa;
  window.ToolModules['random-api-key'] = renderApiKey;
})();

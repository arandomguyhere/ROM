(function () {
  'use strict';

  // =========================================================================
  // SHADOWRUN GENESIS ROM EDITOR
  // All addresses verified against Technical Reference v2
  // =========================================================================

  // --- ROM Validation Constants ---
  var SEGA_HEADER_OFFSET = 0x100;
  var SEGA_HEADER_TEXT = 'SEGA';
  var TITLE_MAGIC_OFFSET = 0x124;
  var TITLE_MAGIC_VALUE = 0x4F585348;
  var EXPECTED_ROM_SIZE = 2097152;
  var CHECKSUM_OFFSET = 0x18E;
  var CHECKSUM_DATA_START = 0x200;

  // --- Starting Resources ---
  var NUYEN_ADDR = 0x0007FE;

  // --- Character Class Templates (256 bytes each) ---
  var CLASSES = [
    { name: 'Samurai', base: 0x07291A },
    { name: 'Decker',  base: 0x072A1A },
    { name: 'Shaman',  base: 0x072B1A }
  ];

  var TEMPLATE = {
    clips: 0x4F,
    nameStart: 0x59,
    nameEnd: 0x64,
    nameTerminator: 0x65,
    karma: 0x8D
  };

  var ATTRIBUTES = [
    { name: 'Body',         offset: 0x77 },
    { name: 'Quickness',    offset: 0x78 },
    { name: 'Strength',     offset: 0x79 },
    { name: 'Charisma',     offset: 0x7A },
    { name: 'Intelligence', offset: 0x7B },
    { name: 'Willpower',    offset: 0x7C }
  ];

  var SKILLS = [
    { name: 'Firearms',      offset: 0x81 },
    { name: 'Armed Combat',  offset: 0x85, note: 'Medium confidence' },
    { name: 'Computer',      offset: 0x88 },
    { name: 'Leadership',    offset: 0x8B },
    { name: 'Negotiation',   offset: 0x8C },
    { name: 'Sorcery',       offset: 0x7F, note: 'Medium confidence' }
  ];

  // --- Shadowrunners (256 bytes each, same template format) ---
  var RUNNERS = [
    { name: 'Ricky',           base: 0x072C1A },
    { name: 'Winston Marrs',   base: 0x072D1A },
    { name: 'Trent',           base: 0x072E1A },
    { name: 'Petr Uvehr',      base: 0x072F1A },
    { name: 'Walking Bear',    base: 0x07301A },
    { name: 'Phantom',         base: 0x07311A },
    { name: 'Ilene Two Fists', base: 0x07321A },
    { name: 'Freya',           base: 0x07331A },
    { name: 'Rianna',          base: 0x07341A },
    { name: 'Stark',           base: 0x07351A }
  ];

  // --- Weapons ---
  var WEAPONS = [
    { name: 'Streetline Special',   clipAddr: 0x0D4564, dmgAddr: 0x0D4566, price: 100 },
    { name: 'Model 101T',           clipAddr: 0x0D4594, dmgAddr: 0x0D4596, price: 350 },
    { name: 'American L36',         clipAddr: 0x0D45C4, dmgAddr: 0x0D45C6, price: 300 },
    { name: 'Security 500',         clipAddr: 0x0D45F4, dmgAddr: 0x0D45F6, price: 450 },
    { name: 'Warhawk',              clipAddr: 0x0D4624, dmgAddr: 0x0D4626, price: 500 },
    { name: 'Max-Power',            clipAddr: 0x0D4654, dmgAddr: 0x0D4656, price: 450 },
    { name: 'Predator',             clipAddr: 0x0D4684, dmgAddr: 0x0D4686, price: 450 },
    { name: 'AK-97 SMG',            clipAddr: 0x0D46B4, dmgAddr: 0x0D46B6, price: 1000 },
    { name: 'HK227-S SMG',          clipAddr: 0x0D46E4, dmgAddr: 0x0D46E6, price: 1500 },
    { name: 'Mach 22 SMG',          clipAddr: 0x0D4714, dmgAddr: 0x0D4716, price: 800 },
    { name: 'Allegiance Shotgun',   clipAddr: 0x0D4744, dmgAddr: 0x0D4746, price: 1400 },
    { name: 'Roomsweeper Shotgun',  clipAddr: 0x0D4774, dmgAddr: 0x0D4776, price: 1000 }
  ];

  // --- Spells ---
  var SPELL_DAMAGE = [
    { name: 'Flame Dart',  addr: 0x0D4EC5, dflt: 1 },
    { name: 'Flame Bolt',  addr: 0x0D4EF5, dflt: 2 },
    { name: 'Hellblast',   addr: 0x0D4F25, dflt: 3 },
    { name: 'Mana Zap',    addr: 0x0D5015, dflt: 0 },
    { name: 'Mana Blast',  addr: 0x0D5045, dflt: 1 },
    { name: 'Mana Storm',  addr: 0x0D5075, dflt: 2 }
  ];

  var SPELL_DRAIN = [
    { name: 'Flame Dart',    addr: 0x0D4EC4, dflt: 2 },
    { name: 'Flame Bolt',    addr: 0x0D4EF4, dflt: 3 },
    { name: 'Hellblast',     addr: 0x0D4F24, dflt: 3 },
    { name: 'Sleep',         addr: 0x0D4F84, dflt: 2 },
    { name: 'Super Barrier', addr: 0x0D4FE4, dflt: 2 },
    { name: 'Mana Zap',      addr: 0x0D5014, dflt: 1 },
    { name: 'Mana Blast',    addr: 0x0D5044, dflt: 2 },
    { name: 'Mana Storm',    addr: 0x0D5074, dflt: 2 },
    { name: 'Barrier',       addr: 0x0D5134, dflt: 1 }
  ];

  // --- Consumables ---
  var CONSUMABLES = [
    { name: 'Medkit Uses',      addr: 0x1AAD93, dflt: 6 },
    { name: 'Stim Patch Uses',  addr: 0x1AAD96, dflt: 4 }
  ];

  // --- Cyberdeck ---
  var CYBERDECK = [
    { name: 'Memory',   addr: 0x14C1F6, size: 2, dflt: 30,  max: 65535 },
    { name: 'Storage',  addr: 0x14C1F8, size: 2, dflt: 100, max: 65535 },
    { name: 'Speed',    addr: 0x14C1FA, size: 1, dflt: 10,  max: 255 },
    { name: 'Response', addr: 0x14C1FB, size: 1, dflt: 0,   max: 255 }
  ];

  // --- Enemy Table (33 entries, stride 0x4A) ---
  var ENEMY_TABLE_START = 0x1D63CA;
  var ENEMY_STRIDE = 0x4A;
  var ENEMY_STAT_FIELDS = [
    { name: 'Equip Tier',   offset: 0x1E },
    { name: 'Body',         offset: 0x1F },
    { name: 'Quickness',    offset: 0x20 },
    { name: 'Strength',     offset: 0x21 },
    { name: 'Charisma',     offset: 0x22 },
    { name: 'Intelligence', offset: 0x23 },
    { name: 'Willpower',    offset: 0x24 },
    { name: 'Karma Reward', offset: 0x2D }
  ];

  var ENEMIES = [
    'lone11', 'lone12', 'lone13', 'lone detectiv', 'lonemage',
    'bodyguard', 'eye5r 1', 'eye5r 2', 'mafia eye5r',
    'weenr1', 'weenr2', 'yakuza weenr', 'ork ganger',
    'Bandersnatch', 'Wendigo', 'Hell Hound', 'Gargoyle', 'ghoul1',
    'guard1', 'pedestrian (1)', 'pedestrian (2)', 'prison guard',
    'corp guard', 'corp mage', 'Strike Team (1)', 'Strike Team (2)',
    'vampire', 'gator shaman', 'rat shaman', 'indian warior',
    'elven warrior', 'elven guard', 'elven mage'
  ];

  // --- Thon (Final Boss) ---
  var THON_NAME_ADDR = 0x1EDB0A;
  var THON_FIELDS = [
    { name: 'Equip Tier',   addr: 0x1EDB28 },
    { name: 'Body',         addr: 0x1EDB29 },
    { name: 'Quickness',    addr: 0x1EDB2A },
    { name: 'Strength',     addr: 0x1EDB2B },
    { name: 'Charisma',     addr: 0x1EDB2C },
    { name: 'Intelligence', addr: 0x1EDB2D },
    { name: 'Willpower',    addr: 0x1EDB2E },
    { name: 'Karma Reward', addr: 0x1EDB37 }
  ];

  // --- Game Mechanic Hacks ---
  var HACKS = [
    { name: 'Debug Menu (Permanent)',  addr: 0x00C310, original: 0x6600, patched: 0x6000 },
    { name: 'Infinite HP (Physical)',  addr: 0x0036AE, original: 0xD328, patched: 0x4E71 },
    { name: 'Infinite HP (Mental)',    addr: 0x003826, original: 0xD328, patched: 0x4E71 },
    { name: 'One-Hit Kill',            addr: 0x055A94, original: 0x6E00, patched: 0x6000 },
    { name: 'No Encounters',           addr: 0x01E1CA, original: 0x6500, patched: 0x6002 },
    { name: 'Walk Through Walls',      addr: 0x00BB5E, original: 0x6100, patched: 0x6002 },
    { name: 'Walk Faster',             addr: 0x00B5D2, original: 0x6700, patched: 0x6002 },
    { name: 'Infinite Karma Upgrades', addr: 0x00D3FC, original: 0x1239, patched: 0x6004 },
    { name: 'Free Shop Items',         addr: 0x057AEC, original: 0x9283, patched: 0x4281 },
    { name: 'No Essence Loss',         addr: 0x057366, original: 0x9034, patched: 0x6002 },
    { name: 'Infinite Grenades',       addr: 0x003764, original: 0xD330, patched: 0x6002 },
    { name: 'Infinite Ammo',           addr: 0x00378E, original: 0xD328, patched: 0x5228 }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  var isShadowrunRom = false;
  var panelVisible = false;
  var sectionRefreshers = [];

  // =========================================================================
  // ROM DETECTION
  // =========================================================================
  function detectShadowrunRom(data) {
    if (!data || data.length !== EXPECTED_ROM_SIZE) return false;
    // Check SEGA header at 0x100
    var header = '';
    for (var i = 0; i < 4; i++) {
      header += String.fromCharCode(data[SEGA_HEADER_OFFSET + i]);
    }
    if (header !== SEGA_HEADER_TEXT) return false;
    // Check title magic at 0x124
    var magic = ((data[TITLE_MAGIC_OFFSET] << 24) |
                 (data[TITLE_MAGIC_OFFSET + 1] << 16) |
                 (data[TITLE_MAGIC_OFFSET + 2] << 8) |
                 data[TITLE_MAGIC_OFFSET + 3]) >>> 0;
    return magic === TITLE_MAGIC_VALUE;
  }

  // =========================================================================
  // CHECKSUM
  // =========================================================================
  function calculateChecksum(data) {
    var sum = 0;
    for (var i = CHECKSUM_DATA_START; i < data.length; i += 2) {
      sum += (data[i] << 8) | (i + 1 < data.length ? data[i + 1] : 0);
    }
    return sum & 0xFFFF;
  }

  // =========================================================================
  // HELPER: Format address string
  // =========================================================================
  function fmtAddr(addr) {
    return '0x' + addr.toString(16).toUpperCase().padStart(6, '0');
  }

  // =========================================================================
  // HELPER: Read ASCII from ROM
  // =========================================================================
  function readAscii(data, start, end) {
    var str = '';
    for (var i = start; i <= end; i++) {
      var b = data[i];
      if (b === 0xFF || b === 0x00) break;
      if (b >= 32 && b <= 126) str += String.fromCharCode(b);
    }
    return str.trim();
  }

  // =========================================================================
  // DOM HELPERS
  // =========================================================================
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function addrLink(addr) {
    var span = el('span', 'sr-addr', fmtAddr(addr));
    span.title = 'Go to offset ' + fmtAddr(addr);
    span.addEventListener('click', function () {
      RomEditor.goToOffset(addr);
    });
    return span;
  }

  // =========================================================================
  // FIELD CREATION HELPERS
  // =========================================================================

  // Creates a uint8 field row and returns { row, input, refresh }
  function createUint8Field(container, label, addr, note) {
    var row = el('div', 'sr-field');
    var lbl = el('label', null, label);
    if (note) lbl.title = note;

    var input = el('input', 'sr-input');
    input.type = 'number';
    input.min = 0;
    input.max = 255;
    input.value = RomEditor.readUint8(addr);

    input.addEventListener('change', function () {
      var val = parseInt(input.value) || 0;
      val = Math.max(0, Math.min(255, val));
      input.value = val;
      RomEditor.writeByte(addr, val);
      RomEditor.refresh();
    });

    row.appendChild(lbl);
    row.appendChild(input);
    row.appendChild(addrLink(addr));
    container.appendChild(row);

    return {
      row: row,
      input: input,
      refresh: function (newAddr) {
        if (newAddr !== undefined) addr = newAddr;
        input.value = RomEditor.readUint8(addr);
      },
      setAddr: function (a) { addr = a; }
    };
  }

  function createUint16Field(container, label, addr, maxVal) {
    var row = el('div', 'sr-field');
    var lbl = el('label', null, label);
    var max = maxVal || 65535;

    var input = el('input', 'sr-input');
    input.type = 'number';
    input.min = 0;
    input.max = max;
    input.value = RomEditor.readUint16(addr);

    input.addEventListener('change', function () {
      var val = parseInt(input.value) || 0;
      val = Math.max(0, Math.min(max, val));
      input.value = val;
      RomEditor.writeUint16(addr, val);
      RomEditor.refresh();
    });

    row.appendChild(lbl);
    row.appendChild(input);
    row.appendChild(addrLink(addr));
    container.appendChild(row);

    return {
      row: row,
      input: input,
      refresh: function (newAddr) {
        if (newAddr !== undefined) addr = newAddr;
        input.value = RomEditor.readUint16(addr);
      },
      setAddr: function (a) { addr = a; }
    };
  }

  function createUint32Field(container, label, addr) {
    var row = el('div', 'sr-field');
    var lbl = el('label', null, label);

    var input = el('input', 'sr-input sr-input-wide');
    input.type = 'number';
    input.min = 0;
    input.max = 4294967295;
    input.value = RomEditor.readUint32(addr);

    input.addEventListener('change', function () {
      var val = parseInt(input.value) || 0;
      val = Math.max(0, Math.min(4294967295, val));
      input.value = val;
      RomEditor.writeUint32(addr, val);
      RomEditor.refresh();
    });

    row.appendChild(lbl);
    row.appendChild(input);
    row.appendChild(addrLink(addr));
    container.appendChild(row);

    return {
      row: row,
      input: input,
      refresh: function () {
        input.value = RomEditor.readUint32(addr);
      }
    };
  }

  function createHackToggle(container, hack) {
    var row = el('div', 'sr-hack-row');
    var label = el('label', 'sr-hack-label');

    var toggle = el('div', 'sr-toggle');
    var checkbox = el('input');
    checkbox.type = 'checkbox';
    var slider = el('span', 'sr-toggle-slider');

    // Read current state
    var current = RomEditor.readUint16(hack.addr);
    checkbox.checked = (current === hack.patched);

    checkbox.addEventListener('change', function () {
      var val = checkbox.checked ? hack.patched : hack.original;
      RomEditor.writeUint16(hack.addr, val);
      RomEditor.refresh();
    });

    toggle.appendChild(checkbox);
    toggle.appendChild(slider);

    var nameSpan = el('span', 'sr-hack-name', hack.name);

    label.appendChild(toggle);
    label.appendChild(nameSpan);
    row.appendChild(label);
    row.appendChild(addrLink(hack.addr));
    container.appendChild(row);

    return {
      row: row,
      refresh: function () {
        var cur = RomEditor.readUint16(hack.addr);
        checkbox.checked = (cur === hack.patched);
      }
    };
  }

  // =========================================================================
  // SECTION: Collapsible accordion section
  // =========================================================================
  function createSection(title, contentBuilder) {
    var section = el('div', 'sr-section');
    var header = el('div', 'sr-section-header');
    var arrow = el('span', 'sr-arrow', '\u25B6');
    var titleSpan = el('span', null, title);
    header.appendChild(arrow);
    header.appendChild(titleSpan);
    section.appendChild(header);

    var body = el('div', 'sr-section-body');
    body.style.display = 'none';
    section.appendChild(body);

    var refreshFn = contentBuilder(body);

    header.addEventListener('click', function () {
      var open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '\u25B6' : '\u25BC';
      if (!open && refreshFn) refreshFn();
    });

    return { element: section, refresh: refreshFn };
  }

  // =========================================================================
  // SECTION BUILDERS
  // =========================================================================

  function buildStartingResources(body) {
    var heading = el('div', 'sr-section-desc', 'Global starting values');
    body.appendChild(heading);

    var nuyenField = createUint32Field(body, 'Nuyen', NUYEN_ADDR);

    return function () {
      nuyenField.refresh();
    };
  }

  function buildCharacterTemplates(body) {
    var select = el('select', 'sr-select');
    CLASSES.forEach(function (cls, i) {
      var opt = el('option', null, cls.name);
      opt.value = i;
      select.appendChild(opt);
    });
    body.appendChild(select);

    var fields = el('div', 'sr-fields');
    body.appendChild(fields);

    var fieldRefs = [];

    // Build fields for template
    var subhead1 = el('div', 'sr-subhead', 'Resources');
    fields.appendChild(subhead1);
    fieldRefs.push({ field: createUint8Field(fields, 'Clips', 0), offsetVal: TEMPLATE.clips });
    fieldRefs.push({ field: createUint8Field(fields, 'Karma', 0), offsetVal: TEMPLATE.karma });

    var subhead2 = el('div', 'sr-subhead', 'Attributes');
    fields.appendChild(subhead2);
    ATTRIBUTES.forEach(function (attr) {
      fieldRefs.push({ field: createUint8Field(fields, attr.name, 0), offsetVal: attr.offset });
    });

    var subhead3 = el('div', 'sr-subhead', 'Skills');
    fields.appendChild(subhead3);
    SKILLS.forEach(function (skill) {
      fieldRefs.push({ field: createUint8Field(fields, skill.name, 0, skill.note), offsetVal: skill.offset });
    });

    function refresh() {
      var idx = parseInt(select.value);
      var base = CLASSES[idx].base;
      fieldRefs.forEach(function (ref) {
        var addr = base + ref.offsetVal;
        ref.field.setAddr(addr);
        ref.field.refresh(addr);
        // Update address link
        var addrEl = ref.field.row.querySelector('.sr-addr');
        if (addrEl) {
          addrEl.textContent = fmtAddr(addr);
          addrEl.title = 'Go to offset ' + fmtAddr(addr);
          addrEl.onclick = function () { RomEditor.goToOffset(addr); };
        }
      });
    }

    select.addEventListener('change', refresh);
    refresh();

    return refresh;
  }

  function buildShadowrunners(body) {
    var select = el('select', 'sr-select');
    RUNNERS.forEach(function (runner, i) {
      var opt = el('option', null, runner.name);
      opt.value = i;
      select.appendChild(opt);
    });
    body.appendChild(select);

    var fields = el('div', 'sr-fields');
    body.appendChild(fields);

    var fieldRefs = [];

    var subhead1 = el('div', 'sr-subhead', 'Attributes');
    fields.appendChild(subhead1);
    ATTRIBUTES.forEach(function (attr) {
      fieldRefs.push({ field: createUint8Field(fields, attr.name, 0), offsetVal: attr.offset });
    });

    var subhead2 = el('div', 'sr-subhead', 'Skills');
    fields.appendChild(subhead2);
    SKILLS.forEach(function (skill) {
      fieldRefs.push({ field: createUint8Field(fields, skill.name, 0, skill.note), offsetVal: skill.offset });
    });

    function refresh() {
      var idx = parseInt(select.value);
      var base = RUNNERS[idx].base;
      fieldRefs.forEach(function (ref) {
        var addr = base + ref.offsetVal;
        ref.field.setAddr(addr);
        ref.field.refresh(addr);
        var addrEl = ref.field.row.querySelector('.sr-addr');
        if (addrEl) {
          addrEl.textContent = fmtAddr(addr);
          addrEl.title = 'Go to offset ' + fmtAddr(addr);
          addrEl.onclick = function () { RomEditor.goToOffset(addr); };
        }
      });
    }

    select.addEventListener('change', refresh);
    refresh();

    return refresh;
  }

  function buildWeapons(body) {
    var select = el('select', 'sr-select');
    WEAPONS.forEach(function (wpn, i) {
      var opt = el('option', null, wpn.name + ' (' + wpn.price + '\u00A5)');
      opt.value = i;
      select.appendChild(opt);
    });
    body.appendChild(select);

    var fields = el('div', 'sr-fields');
    body.appendChild(fields);

    var clipField = createUint8Field(fields, 'Clip Size', 0);
    var dmgField = createUint8Field(fields, 'Damage', 0);

    function refresh() {
      var idx = parseInt(select.value);
      var wpn = WEAPONS[idx];
      clipField.setAddr(wpn.clipAddr);
      clipField.refresh(wpn.clipAddr);
      dmgField.setAddr(wpn.dmgAddr);
      dmgField.refresh(wpn.dmgAddr);
      // Update addr links
      var addrs = fields.querySelectorAll('.sr-addr');
      if (addrs[0]) {
        addrs[0].textContent = fmtAddr(wpn.clipAddr);
        addrs[0].title = 'Go to offset ' + fmtAddr(wpn.clipAddr);
        addrs[0].onclick = function () { RomEditor.goToOffset(wpn.clipAddr); };
      }
      if (addrs[1]) {
        addrs[1].textContent = fmtAddr(wpn.dmgAddr);
        addrs[1].title = 'Go to offset ' + fmtAddr(wpn.dmgAddr);
        addrs[1].onclick = function () { RomEditor.goToOffset(wpn.dmgAddr); };
      }
    }

    select.addEventListener('change', refresh);
    refresh();

    return refresh;
  }

  function buildSpells(body) {
    var subhead1 = el('div', 'sr-subhead', 'Damage');
    body.appendChild(subhead1);

    var damageFields = [];
    SPELL_DAMAGE.forEach(function (spell) {
      damageFields.push(createUint8Field(body, spell.name, spell.addr));
    });

    var subhead2 = el('div', 'sr-subhead', 'Drain');
    body.appendChild(subhead2);

    var drainFields = [];
    SPELL_DRAIN.forEach(function (spell) {
      drainFields.push(createUint8Field(body, spell.name, spell.addr));
    });

    return function () {
      damageFields.forEach(function (f, i) { f.refresh(SPELL_DAMAGE[i].addr); });
      drainFields.forEach(function (f, i) { f.refresh(SPELL_DRAIN[i].addr); });
    };
  }

  function buildConsumables(body) {
    var fields = [];
    CONSUMABLES.forEach(function (item) {
      fields.push(createUint8Field(body, item.name, item.addr));
    });

    return function () {
      fields.forEach(function (f, i) { f.refresh(CONSUMABLES[i].addr); });
    };
  }

  function buildCyberdeck(body) {
    var desc = el('div', 'sr-section-desc', 'Starting cyberdeck stats');
    body.appendChild(desc);

    var fields = [];
    CYBERDECK.forEach(function (stat) {
      if (stat.size === 2) {
        fields.push({ ref: createUint16Field(body, stat.name, stat.addr, stat.max), stat: stat });
      } else {
        fields.push({ ref: createUint8Field(body, stat.name, stat.addr), stat: stat });
      }
    });

    return function () {
      fields.forEach(function (f) { f.ref.refresh(f.stat.addr); });
    };
  }

  function buildEnemies(body) {
    var select = el('select', 'sr-select');
    ENEMIES.forEach(function (name, i) {
      var opt = el('option', null, '#' + i + ' ' + name);
      opt.value = i;
      select.appendChild(opt);
    });
    body.appendChild(select);

    var fields = el('div', 'sr-fields');
    body.appendChild(fields);

    var fieldRefs = [];
    ENEMY_STAT_FIELDS.forEach(function (stat) {
      fieldRefs.push({ field: createUint8Field(fields, stat.name, 0), offsetVal: stat.offset });
    });

    function refresh() {
      var idx = parseInt(select.value);
      var base = ENEMY_TABLE_START + (idx * ENEMY_STRIDE);
      fieldRefs.forEach(function (ref) {
        var addr = base + ref.offsetVal;
        ref.field.setAddr(addr);
        ref.field.refresh(addr);
        var addrEl = ref.field.row.querySelector('.sr-addr');
        if (addrEl) {
          addrEl.textContent = fmtAddr(addr);
          addrEl.title = 'Go to offset ' + fmtAddr(addr);
          addrEl.onclick = function () { RomEditor.goToOffset(addr); };
        }
      });
    }

    select.addEventListener('change', refresh);
    refresh();

    return refresh;
  }

  function buildThon(body) {
    var desc = el('div', 'sr-section-desc', 'Final boss — separate from enemy table');
    body.appendChild(desc);

    var fields = [];
    THON_FIELDS.forEach(function (stat) {
      fields.push(createUint8Field(body, stat.name, stat.addr));
    });

    return function () {
      fields.forEach(function (f, i) { f.refresh(THON_FIELDS[i].addr); });
    };
  }

  function buildHacks(body) {
    var desc = el('div', 'sr-section-desc', 'Toggle verified 68000 patches');
    body.appendChild(desc);

    var hackRefs = [];
    HACKS.forEach(function (hack) {
      hackRefs.push(createHackToggle(body, hack));
    });

    return function () {
      hackRefs.forEach(function (h) { h.refresh(); });
    };
  }

  function buildChecksum(body) {
    var desc = el('div', 'sr-section-desc',
      'ROM checksum at 0x18E. Sum of uint16 values from 0x200 to end.');
    body.appendChild(desc);

    var row = el('div', 'sr-field');
    var lbl = el('label', null, 'Current');
    var valSpan = el('span', 'sr-checksum-val', '----');
    row.appendChild(lbl);
    row.appendChild(valSpan);
    row.appendChild(addrLink(CHECKSUM_OFFSET));
    body.appendChild(row);

    var row2 = el('div', 'sr-field');
    var lbl2 = el('label', null, 'Computed');
    var computedSpan = el('span', 'sr-checksum-val', '----');
    row2.appendChild(lbl2);
    row2.appendChild(computedSpan);
    body.appendChild(row2);

    var statusRow = el('div', 'sr-checksum-status');
    body.appendChild(statusRow);

    var btnRow = el('div', 'sr-btn-row');
    var recalcBtn = el('button', 'sr-btn', 'Recalculate Checksum');
    recalcBtn.addEventListener('click', function () {
      var data = RomEditor.getData();
      if (!data) return;
      var checksum = calculateChecksum(data);
      RomEditor.writeUint16(CHECKSUM_OFFSET, checksum);
      RomEditor.refresh();
      refresh();
    });
    btnRow.appendChild(recalcBtn);
    body.appendChild(btnRow);

    function refresh() {
      var data = RomEditor.getData();
      if (!data) return;
      var stored = RomEditor.readUint16(CHECKSUM_OFFSET);
      var computed = calculateChecksum(data);
      valSpan.textContent = '0x' + stored.toString(16).toUpperCase().padStart(4, '0');
      computedSpan.textContent = '0x' + computed.toString(16).toUpperCase().padStart(4, '0');
      if (stored === computed) {
        statusRow.textContent = 'Checksum valid';
        statusRow.className = 'sr-checksum-status sr-valid';
      } else {
        statusRow.textContent = 'Checksum mismatch — click Recalculate to fix';
        statusRow.className = 'sr-checksum-status sr-invalid';
      }
    }

    return refresh;
  }

  // =========================================================================
  // PANEL CONSTRUCTION
  // =========================================================================
  function buildPanel() {
    var panel = document.getElementById('shadowrunPanel');
    if (!panel) return;
    panel.innerHTML = '';
    sectionRefreshers = [];

    // Header
    var header = el('div', 'sr-panel-header');
    var title = el('div', 'sr-panel-title', 'Shadowrun Genesis');
    var closeBtn = el('button', 'sr-close-btn', '\u00D7');
    closeBtn.title = 'Close panel';
    closeBtn.addEventListener('click', function () { togglePanel(false); });
    var refreshBtn = el('button', 'sr-refresh-btn', '\u21BB');
    refreshBtn.title = 'Refresh all values from ROM';
    refreshBtn.addEventListener('click', refreshAll);
    header.appendChild(title);
    header.appendChild(refreshBtn);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Content
    var content = el('div', 'sr-panel-content');

    var sections = [
      createSection('Starting Resources', buildStartingResources),
      createSection('Character Templates', buildCharacterTemplates),
      createSection('Shadowrunners', buildShadowrunners),
      createSection('Weapons', buildWeapons),
      createSection('Spells', buildSpells),
      createSection('Consumables', buildConsumables),
      createSection('Cyberdeck', buildCyberdeck),
      createSection('Enemies', buildEnemies),
      createSection('Thon (Final Boss)', buildThon),
      createSection('Game Hacks', buildHacks),
      createSection('Checksum', buildChecksum)
    ];

    sections.forEach(function (s) {
      content.appendChild(s.element);
      sectionRefreshers.push(s.refresh);
    });

    panel.appendChild(content);
  }

  function refreshAll() {
    sectionRefreshers.forEach(function (fn) {
      if (fn) fn();
    });
  }

  // =========================================================================
  // PANEL TOGGLE
  // =========================================================================
  function togglePanel(show) {
    var panel = document.getElementById('shadowrunPanel');
    var btn = document.getElementById('srToggleBtn');
    if (!panel) return;

    if (show === undefined) show = !panelVisible;
    panelVisible = show;

    if (show) {
      panel.classList.remove('hidden');
      if (btn) btn.classList.add('sr-btn-active');
      refreshAll();
    } else {
      panel.classList.add('hidden');
      if (btn) btn.classList.remove('sr-btn-active');
    }

    // Trigger resize so hex editor recalculates visible rows
    window.dispatchEvent(new Event('resize'));
  }

  // =========================================================================
  // FILE LOADED HANDLER
  // =========================================================================
  function onFileLoaded(data) {
    var btn = document.getElementById('srToggleBtn');
    var sep = document.getElementById('srSeparator');

    isShadowrunRom = detectShadowrunRom(data);

    if (isShadowrunRom) {
      if (btn) btn.style.display = '';
      if (sep) sep.style.display = '';
      try {
        buildPanel();
        togglePanel(true);
      } catch (e) {
        console.error('Shadowrun panel error:', e);
        isShadowrunRom = false;
        if (btn) btn.style.display = 'none';
        if (sep) sep.style.display = 'none';
        togglePanel(false);
      }
    } else {
      if (btn) btn.style.display = 'none';
      if (sep) sep.style.display = 'none';
      togglePanel(false);
    }
  }

  // =========================================================================
  // BEFORE SAVE HANDLER — auto-recalculate checksum
  // =========================================================================
  function onBeforeSave(data) {
    if (!isShadowrunRom) return;
    try {
      var checksum = calculateChecksum(data);
      // Write directly to data (not through RomEditor.writeByte to avoid undo entries for auto-fix)
      data[CHECKSUM_OFFSET] = (checksum >> 8) & 0xFF;
      data[CHECKSUM_OFFSET + 1] = checksum & 0xFF;
    } catch (e) {
      console.error('Shadowrun checksum error:', e);
    }
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    // Wire up toggle button
    var btn = document.getElementById('srToggleBtn');
    if (btn) {
      btn.addEventListener('click', function () { togglePanel(); });
    }

    // Register with main editor
    if (window.RomEditor) {
      RomEditor.onFileLoaded(onFileLoaded);
      RomEditor.onBeforeSave(onBeforeSave);
    }
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  'use strict';

  // =========================================================================
  // SHADOWRUN GENESIS ROM EDITOR — Overlay Reference UI
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

  // --- RE Context Descriptions ---
  var RE_CONTEXT = {
    resources: {
      title: 'Starting Resources',
      icon: '\u00A5',
      desc: 'The starting nuyen value is stored as a big-endian uint32 at 0x0007FE. ' +
        'This is loaded into RAM when a new game begins and determines the player\'s initial funds. ' +
        'The Sega Genesis uses 68000 big-endian byte ordering throughout.',
      detail: 'Found by tracing the "new game" initialization routine. The value at this address is ' +
        'copied directly into the player\'s nuyen RAM variable during character creation.'
    },
    characters: {
      title: 'Character Templates',
      icon: '\u2694',
      desc: 'Each of the 3 playable classes (Samurai, Decker, Shaman) has a 256-byte template block ' +
        'starting at 0x07291A with a stride of 0x100. These templates define the initial stats, ' +
        'equipment, and skill levels when starting a new game.',
      detail: 'The template structure was mapped by comparing RAM snapshots at game start with ROM contents. ' +
        'Attributes sit at offsets 0x77\u20130x7C within each block; skills are at varying offsets identified through gameplay testing. ' +
        'Some skill offsets (Armed Combat, Sorcery) have medium confidence \u2014 marked with tooltips.'
    },
    runners: {
      title: 'Shadowrunners',
      icon: '\u263A',
      desc: 'Hireable NPCs share the same 256-byte template format as player classes, starting at ' +
        '0x072C1A. There are 10 runners, each at a 0x100 stride. Their attribute and skill offsets match ' +
        'the player template layout.',
      detail: 'Runner templates were verified by hiring each NPC in-game and comparing their RAM stats to ROM values. ' +
        'The consistent template structure across all 13 character blocks (3 classes + 10 runners) confirms the format.'
    },
    weapons: {
      title: 'Weapons',
      icon: '\u2620',
      desc: 'Weapon data lives in a table starting around 0x0D4564. Each weapon record is spaced at 0x30 (48 bytes). ' +
        'The clip size and damage values are adjacent uint8 fields within each record.',
      detail: 'Located by searching for known clip sizes from the game manual, then confirming damage values ' +
        'through combat testing. The 0x30 stride was determined by comparing field positions across adjacent weapons. ' +
        'Prices are hardcoded elsewhere in shop display routines.'
    },
    spells: {
      title: 'Spells',
      icon: '\u2728',
      desc: 'Spell data is stored in a table near 0x0D4EC4. Each spell record is spaced at 0x30 bytes. ' +
        'Drain cost (byte N) and damage power (byte N+1) are adjacent within each record.',
      detail: 'Identified by tracing the spell casting routine\'s damage calculation. The drain value at ' +
        'offset+0 determines HP cost to the caster, while offset+1 is the base damage dealt. ' +
        'Only combat spells have damage; utility spells (Sleep, Barrier) have drain only.'
    },
    consumables: {
      title: 'Consumables',
      icon: '\u2695',
      desc: 'Consumable use counts are stored deep in ROM at 0x1AAD93 (Medkits) and 0x1AAD96 (Stim Patches). ' +
        'These single-byte values define how many uses each consumable provides when acquired.',
      detail: 'Found by setting a watchpoint on the item use counter decrement in RAM, then tracing back to ' +
        'the initialization that loads the max count from ROM.'
    },
    cyberdeck: {
      title: 'Cyberdeck',
      icon: '\u2318',
      desc: 'The starting cyberdeck stats at 0x14C1F6 define Memory (uint16), Storage (uint16), ' +
        'Speed (uint8), and Response (uint8). These are loaded when the Decker class begins the game.',
      detail: 'Located in the matrix initialization routine. Memory and Storage are 16-bit big-endian ' +
        'values controlling program capacity and data storage. Speed and Response affect matrix combat timing.'
    },
    enemies: {
      title: 'Enemies',
      icon: '\u2622',
      desc: 'The enemy table begins at 0x1D63CA with 33 entries, each 0x4A (74) bytes. ' +
        'Enemy names are stored as null-terminated ASCII at the start of each record, with stat fields at ' +
        'fixed offsets within the record.',
      detail: 'Mapped by finding the first enemy name string ("lone11") in ROM and confirming the table structure ' +
        'by checking adjacent entries match known enemy names. The 0x4A stride was verified across all 33 entries. ' +
        'Stats at offsets 0x1E\u20130x24 mirror the player attribute layout; karma reward is at 0x2D.'
    },
    thon: {
      title: 'Thon (Final Boss)',
      icon: '\u2623',
      desc: 'The final boss "Thon" has a standalone record at 0x1EDB0A, separate from the main enemy table. ' +
        'Its stat layout matches the enemy table format, just stored in a different ROM region.',
      detail: 'Thon\'s data is isolated because the boss fight uses a unique encounter handler. ' +
        'The name string at 0x1EDB0A and stat block at 0x1EDB28 were located by tracing the final boss ' +
        'battle initialization code.'
    },
    hacks: {
      title: 'Game Hacks',
      icon: '\u26A1',
      desc: 'These are 68000 instruction patches that modify game behavior. Each hack replaces a 16-bit ' +
        'instruction word at a specific address. The original and patched values are known, so hacks are fully reversible.',
      detail: 'Patches were developed by disassembling the 68000 code at each location. For example, ' +
        '"Infinite HP" replaces a SUB.B (0xD328) with NOP (0x4E71) in the damage handler; ' +
        '"One-Hit Kill" changes a BGT (0x6E00) to BRA (0x6000) to always branch to the kill path. ' +
        'Each patch is a single instruction replacement \u2014 no multi-byte code caves needed.'
    },
    checksum: {
      title: 'Checksum',
      icon: '\u2714',
      desc: 'The Sega Genesis ROM checksum is a uint16 at 0x18E. It is computed by summing all uint16 ' +
        'big-endian words from 0x200 to end-of-ROM, then masking to 16 bits.',
      detail: 'This is a standard Sega Genesis header checksum. The BIOS optionally verifies it on boot. ' +
        'After any ROM modification, the checksum should be recalculated to avoid boot failures on hardware ' +
        'or strict emulators.'
    }
  };

  // --- Category definitions for navigation ---
  var CATEGORIES = [
    { id: 'resources',  label: 'Resources',  builder: buildStartingResources, ctx: RE_CONTEXT.resources },
    { id: 'characters', label: 'Characters', builder: buildCharacterTemplates, ctx: RE_CONTEXT.characters },
    { id: 'runners',    label: 'Runners',    builder: buildShadowrunners,     ctx: RE_CONTEXT.runners },
    { id: 'weapons',    label: 'Weapons',    builder: buildWeapons,           ctx: RE_CONTEXT.weapons },
    { id: 'spells',     label: 'Spells',     builder: buildSpells,            ctx: RE_CONTEXT.spells },
    { id: 'consumables',label: 'Consumables',builder: buildConsumables,       ctx: RE_CONTEXT.consumables },
    { id: 'cyberdeck',  label: 'Cyberdeck',  builder: buildCyberdeck,         ctx: RE_CONTEXT.cyberdeck },
    { id: 'enemies',    label: 'Enemies',    builder: buildEnemies,           ctx: RE_CONTEXT.enemies },
    { id: 'thon',       label: 'Thon',       builder: buildThon,              ctx: RE_CONTEXT.thon },
    { id: 'hacks',      label: 'Hacks',      builder: buildHacks,             ctx: RE_CONTEXT.hacks },
    { id: 'checksum',   label: 'Checksum',   builder: buildChecksum,          ctx: RE_CONTEXT.checksum }
  ];

  // =========================================================================
  // STATE
  // =========================================================================
  var isShadowrunRom = false;
  var overlayVisible = false;
  var activeCategory = 'resources';
  var categoryRefreshers = {};
  var navButtons = {};

  // =========================================================================
  // ROM DETECTION
  // =========================================================================
  function detectShadowrunRom(data) {
    if (!data || data.length !== EXPECTED_ROM_SIZE) return false;
    var header = '';
    for (var i = 0; i < 4; i++) {
      header += String.fromCharCode(data[SEGA_HEADER_OFFSET + i]);
    }
    if (header !== SEGA_HEADER_TEXT) return false;
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
  // HELPERS
  // =========================================================================
  function fmtAddr(addr) {
    return '0x' + addr.toString(16).toUpperCase().padStart(6, '0');
  }

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
    var detailSpan = el('span', 'sr-hack-detail',
      fmtAddr(hack.addr) + ': ' +
      hack.original.toString(16).toUpperCase().padStart(4, '0') + ' \u2192 ' +
      hack.patched.toString(16).toUpperCase().padStart(4, '0'));

    label.appendChild(toggle);
    label.appendChild(nameSpan);
    row.appendChild(label);
    row.appendChild(detailSpan);
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
  // CATEGORY CONTENT BUILDERS
  // =========================================================================
  function buildStartingResources(body) {
    var nuyenField = createUint32Field(body, 'Nuyen', NUYEN_ADDR);
    return function () { nuyenField.refresh(); };
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
    var fields = [];
    THON_FIELDS.forEach(function (stat) {
      fields.push(createUint8Field(body, stat.name, stat.addr));
    });

    return function () {
      fields.forEach(function (f, i) { f.refresh(THON_FIELDS[i].addr); });
    };
  }

  function buildHacks(body) {
    var hackRefs = [];
    HACKS.forEach(function (hack) {
      hackRefs.push(createHackToggle(body, hack));
    });

    return function () {
      hackRefs.forEach(function (h) { h.refresh(); });
    };
  }

  function buildChecksum(body) {
    var row = el('div', 'sr-field');
    var lbl = el('label', null, 'Stored');
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
        statusRow.textContent = 'Mismatch \u2014 click Recalculate to fix';
        statusRow.className = 'sr-checksum-status sr-invalid';
      }
    }

    return refresh;
  }

  // =========================================================================
  // OVERLAY CONSTRUCTION
  // =========================================================================
  function buildOverlay() {
    var panel = document.getElementById('shadowrunPanel');
    if (!panel) return;
    panel.innerHTML = '';
    categoryRefreshers = {};
    navButtons = {};

    // -- Header bar --
    var header = el('div', 'sr-overlay-header');
    var titleArea = el('div', 'sr-overlay-title-area');
    var title = el('div', 'sr-overlay-title', 'Shadowrun Genesis');
    var subtitle = el('div', 'sr-overlay-subtitle', 'ROM Reference & Editor');
    titleArea.appendChild(title);
    titleArea.appendChild(subtitle);
    header.appendChild(titleArea);

    var headerBtns = el('div', 'sr-overlay-header-btns');
    var refreshBtn = el('button', 'sr-header-btn', '\u21BB');
    refreshBtn.title = 'Refresh all values from ROM';
    refreshBtn.addEventListener('click', refreshActiveCategory);
    var closeBtn = el('button', 'sr-header-btn sr-close-btn', '\u00D7');
    closeBtn.title = 'Close overlay';
    closeBtn.addEventListener('click', function () { toggleOverlay(false); });
    headerBtns.appendChild(refreshBtn);
    headerBtns.appendChild(closeBtn);
    header.appendChild(headerBtns);
    panel.appendChild(header);

    // -- Body: nav + content --
    var body = el('div', 'sr-overlay-body');

    // Nav sidebar
    var nav = el('nav', 'sr-nav');
    CATEGORIES.forEach(function (cat) {
      var btn = el('button', 'sr-nav-btn');
      var icon = el('span', 'sr-nav-icon', cat.ctx.icon);
      var label = el('span', 'sr-nav-label', cat.label);
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.addEventListener('click', function () { switchCategory(cat.id); });
      nav.appendChild(btn);
      navButtons[cat.id] = btn;
    });
    body.appendChild(nav);

    // Content area
    var contentArea = el('div', 'sr-content-area');

    // Build all category panels (hidden by default)
    CATEGORIES.forEach(function (cat) {
      var catPanel = el('div', 'sr-cat-panel');
      catPanel.id = 'sr-cat-' + cat.id;
      catPanel.style.display = 'none';

      // RE context box
      var ctxBox = el('div', 'sr-context-box');
      var ctxHeader = el('div', 'sr-context-header');
      var ctxToggle = el('button', 'sr-context-toggle', 'RE Notes \u25BC');
      ctxHeader.appendChild(el('div', 'sr-context-title', cat.ctx.title));
      ctxHeader.appendChild(ctxToggle);
      ctxBox.appendChild(ctxHeader);

      var ctxDesc = el('div', 'sr-context-desc', cat.ctx.desc);
      ctxBox.appendChild(ctxDesc);

      var ctxDetail = el('div', 'sr-context-detail');
      ctxDetail.style.display = 'none';
      var ctxDetailLabel = el('div', 'sr-context-detail-label', 'How this was found:');
      var ctxDetailText = el('div', 'sr-context-detail-text', cat.ctx.detail);
      ctxDetail.appendChild(ctxDetailLabel);
      ctxDetail.appendChild(ctxDetailText);
      ctxBox.appendChild(ctxDetail);

      ctxToggle.addEventListener('click', function () {
        var showing = ctxDetail.style.display !== 'none';
        ctxDetail.style.display = showing ? 'none' : 'block';
        ctxToggle.textContent = showing ? 'RE Notes \u25BC' : 'RE Notes \u25B2';
      });

      catPanel.appendChild(ctxBox);

      // Editor fields
      var fieldsContainer = el('div', 'sr-cat-fields');
      var refreshFn = cat.builder(fieldsContainer);
      categoryRefreshers[cat.id] = refreshFn;
      catPanel.appendChild(fieldsContainer);

      contentArea.appendChild(catPanel);
    });

    body.appendChild(contentArea);
    panel.appendChild(body);

    // Activate default category
    switchCategory(activeCategory);
  }

  function switchCategory(catId) {
    activeCategory = catId;

    // Update nav buttons
    Object.keys(navButtons).forEach(function (id) {
      if (id === catId) {
        navButtons[id].classList.add('sr-nav-active');
      } else {
        navButtons[id].classList.remove('sr-nav-active');
      }
    });

    // Show/hide panels
    CATEGORIES.forEach(function (cat) {
      var panel = document.getElementById('sr-cat-' + cat.id);
      if (panel) {
        panel.style.display = cat.id === catId ? 'block' : 'none';
      }
    });

    // Refresh active category
    refreshActiveCategory();
  }

  function refreshActiveCategory() {
    var fn = categoryRefreshers[activeCategory];
    if (fn) fn();
  }

  // =========================================================================
  // OVERLAY TOGGLE
  // =========================================================================
  function toggleOverlay(show) {
    var panel = document.getElementById('shadowrunPanel');
    var btn = document.getElementById('srToggleBtn');
    var backdrop = document.getElementById('srBackdrop');
    if (!panel) return;

    if (show === undefined) show = !overlayVisible;
    overlayVisible = show;

    if (show) {
      panel.classList.remove('hidden');
      if (backdrop) backdrop.classList.remove('hidden');
      if (btn) btn.classList.add('sr-btn-active');
      refreshActiveCategory();
    } else {
      panel.classList.add('hidden');
      if (backdrop) backdrop.classList.add('hidden');
      if (btn) btn.classList.remove('sr-btn-active');
    }
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
        buildOverlay();
        toggleOverlay(true);
      } catch (e) {
        console.error('Shadowrun overlay error:', e);
        isShadowrunRom = false;
        if (btn) btn.style.display = 'none';
        if (sep) sep.style.display = 'none';
        toggleOverlay(false);
      }
    } else {
      if (btn) btn.style.display = 'none';
      if (sep) sep.style.display = 'none';
      toggleOverlay(false);
    }
  }

  // =========================================================================
  // BEFORE SAVE — auto-recalculate checksum
  // =========================================================================
  function onBeforeSave(data) {
    if (!isShadowrunRom) return;
    try {
      var checksum = calculateChecksum(data);
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
    var btn = document.getElementById('srToggleBtn');
    if (btn) {
      btn.addEventListener('click', function () { toggleOverlay(); });
    }

    // Click backdrop to close
    var backdrop = document.getElementById('srBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function () { toggleOverlay(false); });
    }

    // Escape key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayVisible) {
        toggleOverlay(false);
      }
    });

    if (window.RomEditor) {
      RomEditor.onFileLoaded(onFileLoaded);
      RomEditor.onBeforeSave(onBeforeSave);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

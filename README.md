# I Spent a Day Reverse Engineering a 1994 Sega Genesis Game with an AI, Uncovering Systems and Cut Content Hidden for 30 Years

**How Claude and I tore apart the Shadowrun ROM at the system and byte-structure level — finding cut content, developer easter eggs, and secrets that were never publicly documented**

**Live ROM Editor:** [https://arandomguyhere.github.io/ROM/](https://arandomguyhere.github.io/ROM/)

---

There's a game I've loved since childhood. *Shadowrun* for the Sega Genesis, released in 1994 by BlueSky Software. It's a cyberpunk RPG based on the tabletop game — you play a shadowrunner named Joshua navigating a neon-drenched Seattle, hacking corporate mainframes, slinging spells, and dodging Lone Star security. It was one of the last great Genesis games, shipped right as the console was dying, and it never got the attention it deserved.

I decided to crack it open.

Not play it — reverse engineer it. Take the raw ROM file, a 2MB binary blob of Motorola 68000 machine code and data tables, and figure out how everything works at the byte level. My partner in this was Claude, Anthropic's AI. What started as "can we give Joshua more starting money" turned into a six-session deep dive that uncovered things about this game that nobody has publicly documented in three decades.

Here's what we found.

## The Starting Point: What Was Already Known

The Shadowrun ROM hacking community is small. Really small. The only substantive public documentation of this ROM's internals comes from essentially two sources: Tony Hedstrom's ROM Editor, a .NET utility that modifies roughly two dozen specific byte addresses (starting money, weapon clip sizes, spell damage), and a save state hacking guide by SG81 that documents RAM addresses for emulator-based editing.

That's it. 23 ROM addresses out of 2,097,152 bytes. The rest of the game's internal structure was a black box.

We decided to map the rest.

## Session 1: Following the Money

The first thing I wanted was simple — give Joshua more starting nuyen (money). Tony's editor could already do this at address `0x072952`, but I wanted to understand *why* that address worked.

So we disassembled the character creation code. At ROM address `0x042B0`, we found the instruction `LEA 0x07291A, A0; MULU #0x100, D0` — a classic 68000 indexed table lookup. The game stores three complete 256-byte character templates, one for each class, and copies the selected one into RAM when you start a new game.

That single discovery unlocked everything. By comparing byte values across all three templates (Samurai, Decker, Shaman), we could identify what each byte meant. If the Samurai template had a 4 at offset `+0x77` and the Decker had a 2, and the manual said Samurai starts with Body 4 and Decker with Body 2 — that's your Body attribute. We mapped all six attributes, multiple skills, equipment slots, and the name field this way.

Tony's editor knew about a handful of addresses scattered across the template region — he found the right bytes without ever understanding the 256-byte structure around them. Our contribution was revealing that structure: not just *what* to change, but *why* it works and what else is there.

## Session 2: The Weapon Table Nobody Knew Existed

Every ROM editor and Game Genie code collection treated weapons as isolated addresses — "change this byte to increase the Predator's clip size." Nobody had documented the actual data structure.

We found it. Every weapon entry in the game follows the same pattern: a variable-length ASCII name terminated by `0xFF`, followed by exactly 16 bytes of stats. The stat block encodes price, clip size, damage, weapon class, and other properties at fixed offsets. Once we had the structure, we could decode every weapon, every piece of armor, every consumable — not just the handful that had published cheat codes.

This is where things got interesting. Item `0x16` in the table is something called the **Enchanted Dagger**. It has a price of 50,000 nuyen, a damage value of zero, and no shop in the game sells it. It appears to be an unfinished magical melee weapon — cut content sitting in the ROM since 1994, invisible to anyone who wasn't reading raw hex.

## Session 3: The Enemy Stat Table and Developer Names

At `0x1D63CA` we found a flat table of 33 enemy types, each exactly 74 bytes, containing every stat the game uses during combat — Body, Quickness, Strength, weapon loadout, AI behavior flags, karma rewards.

But the best part was the names. Not the display names players see — the internal developer names. The entries aren't labeled "Lone Star Officer" or "Corporate Security." They're labeled `lone11`, `lone12`, `lone13`, `lone detecti`, `lonemage`. The gang members are `gang11`, `gang12`, `gangmage`. Corporate enemies are `corp11`, `corp21`, `corp31`.

This is BlueSky Software's internal naming scheme, frozen in the ROM since January 1994. You can see how they organized difficulty tiers — the trailing numbers are power levels. `lone11` has Body 3, `lone13` has Body 5. `corp31` is the hardest corporate security. It's a window into how this small studio structured their game balance.

The final boss, Thon, lives at a completely separate address (`0x1EDB0A`) — pulled out of the standard enemy table and given his own entry with Body 15, Willpower 16. He's the only enemy stored this way.

## Session 4: Cracking the Debug Menu From the Inside

The debug menu cheat code (A, B, B, A, C, A, B at the title screen) has been on cheat sites since the 90s. What nobody documented was *how the game detects it*.

We disassembled the detection routine at `0x00C310`. The game maintains a circular button buffer in RAM at `0xFFCB40`, and on every frame, it compares the last 7 inputs against the expected sequence. If all 7 match, it sets a flag at `0xFFF101`. A `BNE` (Branch if Not Equal) instruction at `0x00C310` checks this flag — if the code was entered, it branches to the debug menu; if not, it branches to normal gameplay.

The entire debug toolkit is still in the shipping ROM: warp to any area, heal all characters, grant karma, give yourself a test cyberdeck, toggle walk speed. BlueSky left their complete testing suite in the final cartridge. In 1994, with cartridge ROM space at a premium, this was likely an oversight — or they simply ran out of time to strip it before the gold master deadline of January 1994.

## Session 5: Game Genie Codes Decoded

This one was pure cryptographic fun. Game Genie codes for Genesis are 8-character strings like `ATBT-AA32` that encode a ROM address and replacement value through a specific scrambling algorithm. Hundreds of these codes have been published online for decades, but nobody (as far as we could find) had ever publicly documented how to decode them back to raw ROM addresses for this game.

We implemented the full decode algorithm: split the code into address and value components, apply bit rotation and XOR operations, and extract the 24-bit ROM address plus 16-bit data value. Every published Game Genie code for Shadowrun decoded to a valid ROM address that we could verify against our own findings. Code `RFZT-A6XY` (infinite health) patches the physical damage subroutine at `0x0036AE`, changing the `SUB` (subtract) instruction to a `NOP` (no operation) — the game still runs the damage calculation but never actually subtracts the result from your HP.

## Session 6: Easter Eggs and Ghosts

With the full ROM mapped, we went hunting for hidden content. Here's what turned up:

**The developers are in the game.** The Mr. Johnson mission system at `0x0F35D4` generates NPC names for contract givers. Cross-referencing these with the credits revealed that several are BlueSky employees: Ellis Goodson (artist), Dok Whitson (artist), and "Jase Weese" (Jason Weesner, programmer) all appear as in-game contacts. "Heinrich Michaels" is likely Heinrich (lead programmer).

**There's a William Gibson tribute.** One generated NPC is named "Billy Gibson" — almost certainly a reference to the *Neuromancer* author whose work inspired the entire cyberpunk genre that Shadowrun inhabits.

**And an Alan Turing tribute.** Another NPC is named "Alan Turing" — the father of computer science, placed in the game by a programming team building a virtual cyberspace. That's not subtle, and it's kind of beautiful.

**The SEGA CTY-360 cyberdeck.** In the cyberdeck name table at `0x1AB148`, sandwiched between the Fuchi Cyber-5 and Cyber-7, there's an entry called "SEGA CTY-360." The publisher's name on in-universe hardware. No shop sells it. No code path loads it. It's a developer joke that got compiled into the final ROM and has been sitting there for 30 years.

**There's only one ending.** We searched the entire ROM for alternate ending text, branching narrative flags, "bad ending" sequences, "game over" story text — nothing. The single ending at `0x05C5B8` (Thon defeated, tomb sealed, Harlequin confirms victory) is the only conclusion. The final line: *"It's over. ...for now!!"* BlueSky was acquired by Westwood Studios in 1995. The sequel never came.

## The Matrix: An Ongoing Investigation

Our latest and most complex investigation involves the Matrix — the game's cyberspace hacking system. We've located the complete node map data for all 25 hackable computer systems at `0x15F000`-`0x15FC00`, identified the node type table (CPU, SPU, IOP, SAN, SM, DS), and confirmed that byte `+7` in each data record encodes the node index (with `0x0A` skipped because it conflicts with the record delimiter byte — a clever engineering constraint).

But the full format isn't cracked yet. Each node record encodes position, security color, security level, ICE type, ICE level, title reference, and connection topology in a variable-length binary format that we're still correlating against the known system maps documented on the Shadowrun Wiki. When that decode is complete, it will theoretically be possible to modify existing Matrix systems — change node layouts, swap ICE types, rearrange connections — effectively creating new hacking missions within the existing game engine.

That's a project for the next session.

## By the Numbers

Over the course of this project, we documented **52+ unique ROM addresses** with zero overlap against Tony Hedstrom's previously published 23. The total catalogue includes:

- 3 character class templates (256 bytes each, full field mapping)
- 10 shadowrunner hire templates (same structure)
- Complete weapon damage table (12 weapons, previously only clip sizes were known)
- 33-entry enemy stat table with developer names and full stat mapping
- Boss stat entry for Thon (separate from main table)
- Cyberdeck initialization values
- Combat system internals (physical damage, mental damage, enemy survival check)
- Debug menu detection system (RAM counter, button buffer, ROM check routine)
- Full Game Genie decode algorithm
- 68000 code injection technique (trampoline at `0x1FFE40`)
- 9 easter eggs and hidden content items
- Matrix node data system (partially decoded)

Everything was done through static binary analysis — reading the raw ROM bytes, disassembling 68000 machine code, and cross-referencing data patterns. No emulator debugging, no source code, no insider knowledge. Just a human, an AI, and two million bytes of someone else's compiled work from 1994.

## What This Means

ROM hacking isn't new. But what struck me about this project is how much was left to find in a game that's been available for three decades. The entire ROM hacking community for this game had collectively documented 23 bytes. We found 52+ in a single day, plus structural information that makes the game's internals comprehensible as a system rather than a collection of isolated magic numbers.

Part of this is the tooling. Having an AI that can write Python analysis scripts, hold context across hundreds of findings, disassemble 68000 opcodes, and maintain a mental model of interconnected data structures — that changes what a single person can accomplish in a weekend. I'm not a professional reverse engineer. I just love this game and wanted to understand how it works.

The BlueSky developers who built this — Heinrich, Jason Weesner, Ellis Goodson, the rest of the team — they put years of their lives into 2MB of Motorola 68000 code. They hid their names in the NPC tables. They left a cyberdeck named after their publisher. They wrote *"It's over. ...for now!!"* and then the studio got acquired and the sequel never happened.

Thirty years later, their work is still giving up secrets.

---

## ROM Editor Features

The live editor at [https://arandomguyhere.github.io/ROM/](https://arandomguyhere.github.io/ROM/) includes:

### General Hex Editor
- Open any binary file via button or drag-and-drop
- Hex view with offset gutter and ASCII sidebar
- Inline hex editing (nibble-by-nibble input)
- Keyboard navigation (arrow keys, Page Up/Down, Home/End)
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Hex and text search with match highlighting
- Go to offset (Ctrl+G)
- Save/download modified files
- Modified byte highlighting

### Shadowrun Genesis Tools (auto-detected)
When a Shadowrun Genesis ROM is loaded (2MB, SEGA header, title magic `0x4F585348`), a dedicated editing panel appears with:

- **Starting Resources** — Nuyen
- **Character Templates** — Samurai/Decker/Shaman attributes (Body, Quickness, Strength, Charisma, Intelligence, Willpower) and skills (Firearms, Computer, Negotiation, etc.)
- **Shadowrunners** — All 10 hireable runners (Ricky, Winston Marrs, Trent, Petr Uvehr, Walking Bear, Phantom, Ilene Two Fists, Freya, Rianna, Stark)
- **Weapons** — Clip size and damage for all 12 weapons
- **Spells** — Damage and drain values for all attack and utility spells
- **Consumables** — Medkit and Stim Patch uses
- **Cyberdeck** — Memory, Storage, Speed, Response
- **Enemies** — All 33 enemy types with full stat editing
- **Thon (Final Boss)** — Separate stat editing
- **Game Hacks** — 12 verified toggle switches (debug menu, infinite HP, one-hit kill, no encounters, walk through walls, infinite ammo, and more)
- **Checksum** — Validation and auto-recalculation on save

Every field shows its ROM address — click to jump to that offset in the hex view. All addresses verified against the Technical Reference v2 document. ROM checksum is automatically recalculated when saving.

*The ROM analysis was performed on the standard USA release (CRC32: FBB92909).*

#!/usr/bin/env python3
"""
Verify Jody/Koerner tier board against the repo golden reference.
If differences exist, outputs an exact breakdown of discrepancies.
"""

import sys
import os
import re

GOLDEN_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'golden_jody_tier_board.yaml')
TARGET_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'jody_koerner_tier_board.yaml')

def parse_yaml_tiers(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Extract vertical_tier_gaps_px
    gaps = {}
    gaps_match = re.search(r'vertical_tier_gaps_px:\s*\n((?:\s{2,}.*\n)+)', text)
    if gaps_match:
        cur_pos = None
        for line in gaps_match.group(1).splitlines():
            line_s = line.strip()
            if not line_s or line_s.startswith('#'):
                continue
            pos_m = re.match(r'^([A-Z]+):', line_s)
            if pos_m:
                cur_pos = pos_m.group(1)
                gaps[cur_pos] = {}
                continue
            tier_m = re.match(r'^tier_(\d+):\s*(\d+)', line_s)
            if tier_m and cur_pos:
                gaps[cur_pos][int(tier_m.group(1))] = int(tier_m.group(2))

    # Extract positions and players
    positions = {}
    pos_blocks = re.split(r'\n  ([A-Z]+):\s*\n', text)
    for i in range(1, len(pos_blocks), 2):
        pos_name = pos_blocks[i]
        content = pos_blocks[i + 1]
        positions[pos_name] = {}

        tier_chunks = re.split(r'\n    tier_(\d+):\s*\n', '\n' + content)
        for j in range(1, len(tier_chunks), 2):
            tier_num = int(tier_chunks[j])
            t_content = tier_chunks[j + 1]

            gap_m = re.search(r'offset_gap_px:\s*(\d+)', t_content)
            gap = int(gap_m.group(1)) if gap_m else 0

            players = []
            for pm in re.finditer(r'-\s+rank_in_tier:\s*(\d+)\s*\n\s+name:\s*"([^"]+)"\s*\n\s+team:\s*"([^"]+)"[\s\S]*?ecr:\s*(\d+)', t_content):
                players.append({
                    'rank': int(pm.group(1)),
                    'name': pm.group(2),
                    'team': pm.group(3),
                    'ecr': int(pm.group(4))
                })

            positions[pos_name][tier_num] = {
                'gap': gap,
                'players': players
            }

    return gaps, positions

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else TARGET_PATH
    golden = sys.argv[2] if len(sys.argv) > 2 else GOLDEN_PATH

    print(f"Target: {target}")
    print(f"Golden: {golden}")

    if not os.path.exists(golden):
        print(f"ERROR: Golden file not found at {golden}")
        sys.exit(1)
    if not os.path.exists(target):
        print(f"ERROR: Target file not found at {target}")
        sys.exit(1)

    with open(golden, 'rb') as f:
        golden_bytes = f.read()
    with open(target, 'rb') as f:
        target_bytes = f.read()

    if golden_bytes == target_bytes:
        print("✅ EXACT MATCH: Target file is byte-for-byte identical to Golden Jody.")
        return 0

    print("⚠️ Target differs from Golden Jody. Inspecting structural differences...\n")

    golden_gaps, golden_pos = parse_yaml_tiers(golden)
    target_gaps, target_pos = parse_yaml_tiers(target)

    diff_count = 0

    # Check gaps
    for pos in sorted(golden_gaps.keys()):
        if pos not in target_gaps:
            print(f"[-] Position missing in target gaps: {pos}")
            diff_count += 1
            continue
        for t in sorted(golden_gaps[pos].keys()):
            g_val = golden_gaps[pos].get(t)
            t_val = target_gaps[pos].get(t)
            if g_val != t_val:
                print(f"[DIFF] {pos} Tier {t} vertical gap: Golden={g_val}px, Target={t_val}px")
                diff_count += 1

    # Check positions and tiers
    for pos in sorted(golden_pos.keys()):
        if pos not in target_pos:
            print(f"[-] Position missing in target positions: {pos}")
            diff_count += 1
            continue
        for t in sorted(golden_pos[pos].keys()):
            if t not in target_pos[pos]:
                print(f"[-] Tier missing in target: {pos} Tier {t}")
                diff_count += 1
                continue

            g_tier = golden_pos[pos][t]
            t_tier = target_pos[pos][t]

            if g_tier['gap'] != t_tier['gap']:
                print(f"[DIFF] {pos} Tier {t} offset_gap_px: Golden={g_tier['gap']}px, Target={t_tier['gap']}px")
                diff_count += 1

            g_pls = [p['name'] for p in g_tier['players']]
            t_pls = [p['name'] for p in t_tier['players']]

            if g_pls != t_pls:
                print(f"[DIFF] {pos} Tier {t} players mismatch:")
                print(f"       Golden ({len(g_pls)} players): {', '.join(g_pls[:5])}{'...' if len(g_pls) > 5 else ''}")
                print(f"       Target ({len(t_pls)} players): {', '.join(t_pls[:5])}{'...' if len(t_pls) > 5 else ''}")
                diff_count += 1

    if diff_count == 0:
        print("✅ Structured comparison passed: all tiers, gaps, and players match Golden Jody.")
        return 0
    else:
        print(f"\n❌ FAILED: {diff_count} discrepancies found against Golden Jody.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

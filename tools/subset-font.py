#!/usr/bin/env python3
"""쓰는 글자만 남긴 Gaegu 글꼴을 만든다.
   python3 tools/subset-font.py <Gaegu-Regular.ttf> <Gaegu-Bold.ttf>
   글을 고친 뒤에는 다시 돌려야 새 글자가 손글씨로 나온다."""
import sys, glob, os
from fontTools import subset
from fontTools.ttLib import TTFont
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chars = set(chr(c) for c in range(0x20, 0x7f))
for f in [os.path.join(root, 'src', n) for n in ('stages.js', 'game.js', 'render.js', 'app.js', 'sketch.js')]:      # 게임 화면에 글자를 쓰는 파일만 (sketch.js에는 종이 색 이름이 있다)
    chars |= set(open(f, encoding='utf-8').read())
chars |= set('0123456789·…↑↓←→×÷−+-—‘’「」')
chars = sorted(c for c in chars if ord(c) >= 0x20)
for src, name in zip(sys.argv[1:3], ['Regular', 'Bold']):
    font = TTFont(src)
    have = set(font.getBestCmap().keys())
    miss = [c for c in chars if ord(c) not in have]
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
    s = subset.Subsetter(opt); s.populate(unicodes=[ord(c) for c in chars]); s.subset(font)
    out = os.path.join(root, 'fonts', 'Gaegu-%s.subset.woff2' % name)
    font.flavor = 'woff2'; font.save(out)
    print(name, len(chars), '자', os.path.getsize(out), 'bytes', '없는 글자:', ''.join(miss))
# 추린 글자와, Gaegu 원본에 처음부터 없는 글자(다른 글꼴로 나온다)를 적어 둔다. qa/glyph.cjs가 게임 화면에 실제로 쓴 글자와 견준다.
with open(os.path.join(root, 'fonts', 'Gaegu.subset.txt'), 'w', encoding='utf-8') as fh:
    fh.write(''.join(c for c in chars if ord(c) in have) + '\n' + ''.join(miss) + '\n')

from PIL import Image, ImageDraw
import os, math

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
os.makedirs('/home/claude/creatorstats/icons', exist_ok=True)

for size in sizes:
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    
    # Rounded rect background
    r = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size, size], radius=r, fill=(26, 14, 46, 255))
    
    # Accent overlay circle
    overlay = Image.new('RGBA', (size, size), (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([int(size*0.05), int(size*0.05), int(size*0.75), int(size*0.75)], fill=(124,92,252,45))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    
    # Chart bars
    p = int(size * 0.18)
    w = size - p * 2
    bars = [0.48, 0.72, 0.38, 0.92, 0.62]
    bar_w = w // len(bars)
    for i, h in enumerate(bars):
        bh = int(w * h)
        bx = p + i * bar_w + int(bar_w * 0.12)
        bw2 = int(bar_w * 0.72)
        by = p + w - bh
        br = max(2, int(bw2 * 0.28))
        # gradient simulation: top lighter, bottom darker purple
        for y in range(bh):
            ratio = y / max(bh, 1)
            rc = int(167 - (167-124)*ratio)
            gc = int(139 - (139-92)*ratio)
            bc = int(250 - (250-252)*ratio)
            draw.rectangle([bx, by+y, bx+bw2, by+y+1], fill=(rc,gc,bc,255))
        # rounded top
        draw.ellipse([bx, by, bx+bw2, by+br*2], fill=(167,139,250,255))
    
    # Green dot accent
    dot_r = max(3, int(size * 0.065))
    dot_x = int(size * 0.76)
    dot_y = int(size * 0.22)
    draw.ellipse([dot_x-dot_r, dot_y-dot_r, dot_x+dot_r, dot_y+dot_r], fill=(34,197,94,255))
    
    # Trend line over bars
    line_pts = []
    for i, h in enumerate(bars):
        lx = p + i * bar_w + bar_w//2
        ly = p + w - int(w * h) - int(size*0.04)
        line_pts.append((lx, ly))
    if len(line_pts) > 1:
        lw = max(1, int(size * 0.025))
        draw.line(line_pts, fill=(255,255,255,120), width=lw)
        for pt in line_pts:
            pr = max(1, lw)
            draw.ellipse([pt[0]-pr, pt[1]-pr, pt[0]+pr, pt[1]+pr], fill=(255,255,255,200))
    
    img.save(f'/home/claude/creatorstats/icons/icon-{size}.png')
    print(f'✓ icon-{size}.png')

print('Done!')

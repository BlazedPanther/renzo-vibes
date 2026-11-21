from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy import ndimage as ndi
import sys
jobs={
 'shirt':('public/media/pow-pow-shirt.webp','public/media/pow-pow-shirt-cutout.webp',30),
 'goat':('public/media/renzo-goat-shirt.png','public/media/renzo-goat-shirt-cutout.webp',30),
 'hoodie':('public/media/pow-pow-hoodie.png','public/media/pow-pow-hoodie-cutout.webp',34),
}
for key,(src,dst,thr) in jobs.items():
    im=Image.open(src).convert('RGB'); w,h=im.size
    marked=im.copy()
    seeds=[(x,0) for x in range(0,w,max(w//12,1))]+[(x,h-1) for x in range(0,w,max(w//12,1))]+[(0,y) for y in range(0,h,max(h//12,1))]+[(w-1,y) for y in range(0,h,max(h//12,1))]
    # Hintergrundfarbe = hellste häufige Randfarbe; nur dort starten (nie auf dem dunklen Produkt)
    border=[im.getpixel(pt) for pt in seeds]
    light=[c for c in border if sum(c)/3>140]
    bgc=tuple(int(np.median([c[i] for c in light])) for i in range(3)) if light else (255,255,255)
    for pt in seeds:
        c=im.getpixel(pt)
        if sum(abs(c[i]-bgc[i]) for i in range(3))<60 and marked.getpixel(pt)!=(255,0,255):
            ImageDraw.floodfill(marked,pt,(255,0,255),thresh=thr)
    a=np.array(marked); bg=(a[:,:,0]==255)&(a[:,:,1]==0)&(a[:,:,2]==255)
    keep=~bg
    # Saum: helle Randpixel nahe am Hintergrund entfernen (Antialiasing-Halo)
    rgb=np.array(im).astype(int); lum=rgb.mean(2)
    band=ndi.binary_dilation(bg,iterations=3)&~bg
    keep&=~(band&(lum>150))
    keep=ndi.binary_opening(keep,iterations=1)
    lbl,n=ndi.label(keep); sizes=ndi.sum(keep,lbl,range(1,n+1))
    big=[i+1 for i,s in enumerate(sizes) if s>0.01*h*w]   # alle grossen Teile (z. B. zwei T-Shirts)
    keep=np.isin(lbl,big)
    keep=ndi.binary_fill_holes(keep)
    mask=Image.fromarray((keep*255).astype('uint8'),'L').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out=im.convert('RGBA'); out.putalpha(mask)
    bb=mask.point(lambda v:255 if v>8 else 0).getbbox()
    out=out.crop((max(bb[0]-4,0),max(bb[1]-4,0),min(bb[2]+4,w),min(bb[3]+4,h)))
    out.save(dst,quality=92,method=6)
    chk=Image.new('RGBA',out.size,(14,14,13,255)); chk.alpha_composite(out); chk.convert('RGB').save(f'/home/user/renzo-vibes/neu-cut-{key}.png')
    print(key,(w,h),'->',out.size,'transparent %.0f%%'%(100*bg.mean()), 'parts',len(big))

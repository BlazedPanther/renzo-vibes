from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage as ndi

CANVAS=900; FILL=0.90   # gleiche Fläche, gleicher Rand für alle Produkte

def load(p): return Image.open(p).convert('RGBA')

def defringe(im, erode=1):
    """Kanten-Dekontamination: Randpixel übernehmen die Farbe des nächsten sicheren Innenpixels (kein heller Saum)."""
    a=np.array(im); alpha=a[:,:,3]
    solid=ndi.binary_erosion(alpha>200,iterations=2)
    idx=ndi.distance_transform_edt(~solid,return_distances=False,return_indices=True)
    rgb=a[:,:,:3][idx[0],idx[1]]
    edge=(alpha>0)&~solid
    a[:,:,:3][edge]=rgb[edge]
    # Maske minimal nach innen ziehen + weich
    hard=ndi.binary_erosion(alpha>128,iterations=erode)
    m=Image.fromarray((hard*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    a[:,:,3]=np.array(m)
    return Image.fromarray(a)

def clear_light_specks(im, protect=None, dist=10):
    """Helle, unfarbige Reste im Randbereich entfernen (ausser geschützter Bereich, z. B. Logo)."""
    a=np.array(im); alpha=a[:,:,3]; rgb=a[:,:,:3].astype(int)
    sat=(rgb.max(2)-rgb.min(2))/np.maximum(rgb.max(2),1); lum=rgb.mean(2)
    outside=alpha<20
    band=ndi.binary_dilation(outside,iterations=dist)&(alpha>=20)
    bad=band&(sat<0.30)&(lum>120)
    if protect is not None: bad&=~protect
    bad=ndi.binary_dilation(bad,iterations=2)&(lum>90)
    if protect is not None: bad&=~protect
    alpha[bad]=0; a[:,:,3]=alpha
    lbl,n=ndi.label(alpha>20); sizes=ndi.sum(alpha>20,lbl,range(1,n+1))
    keep=lbl==(1+int(np.argmax(sizes))); a[:,:,3]=np.where(keep,a[:,:,3],0)
    return Image.fromarray(a)

def trim(im):
    bb=im.getchannel('A').point(lambda v:255 if v>10 else 0).getbbox(); return im.crop(bb)

def place(im, out):
    im=trim(im); w,h=im.size; s=min(CANVAS*FILL/w, CANVAS*FILL/h)
    im=im.resize((max(1,round(w*s)),max(1,round(h*s))),Image.LANCZOS)
    c=Image.new('RGBA',(CANVAS,CANVAS),(0,0,0,0)); c.alpha_composite(im,((CANVAS-im.width)//2,(CANVAS-im.height)//2))
    c.save(out,quality=94,method=6)
    bg=Image.new('RGBA',c.size,(14,14,13,255)); bg.alpha_composite(c); return bg.convert('RGB')

M='public/media/'
items={}
items['tee']=load(M+'pow-pow-shirt-cutout.webp')
items['hoodie']=load(M+'pow-pow-hoodie-cutout.webp')
# Goat-Tee in Vorder-/Rückseite trennen: an der leersten Spalte um die Bildmitte
g=load(M+'renzo-goat-shirt-cutout.webp'); ga=np.array(g)[:,:,3]; H,Wd=ga.shape
col=(ga>20).sum(0); lo,hi=int(Wd*.40),int(Wd*.60); cut=lo+int(np.argmin(col[lo:hi])); print('goat split at',cut,'of',Wd,'occupancy',col[cut])
for key,(x0,x1) in zip(('goat_front','goat_back'),((0,cut),(cut,Wd))):
    arr=np.array(g).copy(); arr[:,:x0,3]=0; arr[:,x1:,3]=0
    if key=='goat_back':   # Ärmelspitze/Naht des Nachbar-Shirts: helle Pixel nahe der Trennlinie entfernen
        lum=arr[:,:,:3].astype(int).mean(2); zone=np.zeros(lum.shape,bool); zone[:,x0:x0+34]=True
        arr[zone&(lum>70),3]=0
    if key=='goat_back':   # linken Ärmel aus dem intakten rechten rekonstruieren (im Original vom Nachbar-Shirt verdeckt)
        al=arr[:,:,3]; ys,xs=np.nonzero(al>128); y0_,y1_=ys.min(),ys.max(); hem=int(y1_-0.06*(y1_-y0_))
        row=np.nonzero(al[hem]>128)[0]; L,R=row.min(),row.max(); cx=(L+R)/2; Wb=R-L
        flipped=np.zeros_like(arr); 
        for x in range(arr.shape[1]):
            xm=int(round(2*cx-x))
            if 0<=xm<arr.shape[1]: flipped[:,x]=arr[:,xm]
        zone=np.arange(arr.shape[1])<=cx-0.43*Wb
        arr[:,zone]=flipped[:,zone]
        print('goat_back sleeve rebuilt, axis',round(cx),'body width',Wb)
    items[key]=Image.fromarray(arr)
items['purple_front']=load(M+'rv-purple-hoodie-front.webp')
items['purple_back']=load(M+'rv-purple-hoodie-back.webp')

sheet=[]
for k,im in items.items():
    if k=='purple_front':
        w,h=im.size; yy,xx=np.mgrid[0:h,0:w]
        # Logo-Kreis schützen (Position relativ im zugeschnittenen Bild)
        a=np.array(im)[:,:,:3].astype(int); dark=(a.sum(2)<120)&(np.array(im)[:,:,3]>200)
        ys,xs=np.nonzero(dark[int(h*.3):int(h*.6),int(w*.45):int(w*.75)]); cy=int(h*.3)+int(np.median(ys)); cx=int(w*.45)+int(np.median(xs))
        im=clear_light_specks(im,protect=((xx-cx)**2+(yy-cy)**2)<70**2,dist=12)
    im=defringe(im)
    name={'tee':'merch-pow-pow-tee','hoodie':'merch-pow-pow-hoodie','goat_front':'merch-goat-tee-front','goat_back':'merch-goat-tee-back','purple_front':'merch-purple-hoodie-front','purple_back':'merch-purple-hoodie-back'}[k]
    sheet.append(place(im,f'public/media/{name}.webp'))
    print(k,im.size,'->',name)
W=CANVAS//3; row=Image.new('RGB',(W*3,W*2))
for i,s in enumerate(sheet): row.paste(s.resize((W,W),Image.LANCZOS),((i%3)*W,(i//3)*W))
row.save('/home/user/renzo-vibes/neu-merch-vorschau.png')

# convert webp/avif/gif to png so they can be read everywhere; shrink very large images (max side 2000 px)
# tall images (height > 2000 and > 2.5 x width, e.g. product detail long images) are cut into 1600 px tiles NN-t01.jpg... instead of shrunk
import sys, os
from PIL import Image
d=sys.argv[1]
for f in sorted(os.listdir(d)):
    p=os.path.join(d,f); ext=f.rsplit('.',1)[-1].lower()
    if ext not in ('jpg','png','webp','gif','avif','bin'): continue
    try:
        im=Image.open(p); im.load()
        w,h=im.size; m=max(w,h)
        if h>2000 and h>2.5*w:
            base=f.rsplit('.',1)[0]; im=im.convert('RGB'); k=0
            for y in range(0,h,1600):
                k+=1; im.crop((0,y,w,min(y+1600,h))).save(os.path.join(d,'%s-t%02d.jpg'%(base,k)),'JPEG',quality=88)
            os.remove(p); print('tiled',f,'->',k,'tiles',(w,h)); continue
        if ext in ('webp','gif','avif','bin') or m>2000:
            if m>2000: im=im.resize((round(w*2000/m),round(h*2000/m)))
            out=os.path.join(d,f.rsplit('.',1)[0]+'.png') if ext!='jpg' else p
            im.convert('RGB').save(out if out.endswith('.png') else p, 'PNG' if out.endswith('.png') else 'JPEG', quality=88)
            if out!=p: os.remove(p)
            print('converted',f,'->',os.path.basename(out),im.size)
    except Exception as e:
        print('skip',f,e)

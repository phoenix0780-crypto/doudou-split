# convert webp/avif/gif to png so they can be read everywhere; shrink very large images (max side 2000 px)
import sys, os
from PIL import Image
d=sys.argv[1]
for f in sorted(os.listdir(d)):
    p=os.path.join(d,f); ext=f.rsplit('.',1)[-1].lower()
    if ext not in ('jpg','png','webp','gif','avif','bin'): continue
    try:
        im=Image.open(p); im.load()
        w,h=im.size; m=max(w,h)
        if ext in ('webp','gif','avif','bin') or m>2000:
            if m>2000: im=im.resize((round(w*2000/m),round(h*2000/m)))
            out=os.path.join(d,f.rsplit('.',1)[0]+'.png') if ext!='jpg' else p
            im.convert('RGB').save(out if out.endswith('.png') else p, 'PNG' if out.endswith('.png') else 'JPEG', quality=88)
            if out!=p: os.remove(p)
            print('converted',f,'->',os.path.basename(out),im.size)
    except Exception as e:
        print('skip',f,e)

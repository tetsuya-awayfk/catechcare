import urllib.request
import re

try:
    html = urllib.request.urlopen('https://catechcare.vercel.app').read().decode('utf-8')
    js_files = re.findall(r'src=\"(/assets/[^\"]+\.js)\"', html)
    print("Found JS files:", js_files)
    for js in js_files:
        js_content = urllib.request.urlopen('https://catechcare.vercel.app' + js).read().decode('utf-8')
        urls = re.findall(r'https://[^\"\']+\.onrender\.com[^\"\']*', js_content)
        if urls:
            print('FOUND RENDER URL:', urls)
except Exception as e:
    print(e)

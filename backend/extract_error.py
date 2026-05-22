import re
html = open('error.html', 'r', encoding='utf-8').read()
m = re.search(r'<pre class="exception_value">(.*?)</pre>', html, re.DOTALL)
print(m.group(1) if m else 'No exception text found')
m2 = re.search(r'Exception Type:</th>\s*<td>(.*?)</td>', html, re.DOTALL)
print(m2.group(1) if m2 else 'No exception type found')

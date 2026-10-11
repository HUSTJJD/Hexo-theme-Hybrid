/* ------------------------------------------------------------
   代码块语言名归一化
   hexo 的 backtick_code_block 过滤器（before_post_render）负责把
   ```lang 交给 prismjs 高亮。prismjs 只认自己的语言 key：
     - ```c++ 不在它的 aliases 里，会被当成不支持的语言直接 escape，
       整块代码一个 token 都没有
     - ```Lua 这类大小写写法同样匹配不上
   这里用更低的优先级（1）抢在 backtick_code_block 之前，
   把围栏语言名换成 prismjs 认识的 key。
   ------------------------------------------------------------ */

const { languages } = require('prismjs/components');

// prismjs 支持的语言 + 别名；大小写不敏感，统一存小写
const supported = new Set(Object.keys(languages));
for (const meta of Object.values(languages)) {
  const alias = meta && meta.alias;
  if (!alias) continue;
  if (Array.isArray(alias)) alias.forEach(a => supported.add(a));
  else supported.add(alias);
}

// prismjs 没有、但站点里会用到的写法
const LANG_ALIAS = {
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  dotnet: 'csharp',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  py: 'python',
  py3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  objc: 'objectivec',
  'objective-c': 'objectivec',
  asm: 'nasm',
  x86: 'nasm',
  yacc: 'bison',
  text: 'plaintext'
};

// 只匹配「开启围栏 + 语言名」，闭合围栏后面没有语言名，不会误伤
const FENCE_OPEN = /^([^\S\r\n]*(?:[-*+][^\S\r\n]*|\d+\.[^\S\r\n]*|>[^\S\r\n]*)*)(`{3,}|~{3,})[^\S\r\n]*([A-Za-z0-9+#._-]+)/gm;

hexo.extend.filter.register('before_post_render', data => {
  if (!data.content) return data;
  if (!data.content.includes('```') && !data.content.includes('~~~')) return data;

  data.content = data.content.replace(FENCE_OPEN, (raw, prefix, fence, lang) => {
    const lower = lang.toLowerCase();
    if (supported.has(lang)) return raw;
    if (LANG_ALIAS[lower]) return prefix + fence + LANG_ALIAS[lower];
    if (supported.has(lower)) return prefix + fence + lower;
    return raw;
  });

  return data;
}, 1);

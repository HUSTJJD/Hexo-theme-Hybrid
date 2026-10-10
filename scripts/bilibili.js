/* global hexo */
'use strict';

/* ============================================================
   Bilibili 视频嵌入
   ------------------------------------------------------------
   用法（正文里直接写，前后留空行）：

     {% bilibili BV1xx411c7mD %}
     {% bilibili BV1xx411c7mD 2 %}                 第 2 分 P
     {% bilibili av170001 %}
     {% bilibili BV1xx411c7mD p:2 danmaku:1 %}
     {% bilibili https://www.bilibili.com/video/BV1xx411c7mD title:标题 %}

   可选参数：
     p / page      分 P，默认 1
     danmaku       1 开弹幕、0 关弹幕，默认取主题配置
     ratio         16/9 或 4/3，默认 16/9
     hd            是否高清，1 / 0
     title         播放器下方显示的文字
   {% bili %} 是同名简写。
   ============================================================ */

const BILI_PLAYER = 'https://player.bilibili.com/player.html';
const BILI_SITE = 'https://www.bilibili.com/video/';

function biliDefaults() {
	const theme = (hexo.theme && hexo.theme.config) || {};
	const cfg = (theme.plugins && theme.plugins.bilibili) || {};
	if (cfg.enable === false) return null;
	return {
		page: parseInt(cfg.page, 10) || 1,
		danmaku: cfg.danmaku === true || cfg.danmaku === 1 ? 1 : 0,
		ratio: String(cfg.ratio || '16/9'),
		high_quality: cfg.high_quality === false ? 0 : 1
	};
}

function biliEsc(str) {
	return String(str == null ? '' : str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// 从各种写法里抠出 BV 号 / av 号：
// BV1xx411c7mD、av170001、完整 bilibili 链接
function biliExtractId(raw) {
	const s = String(raw || '').trim();
	const bv = s.match(/BV[0-9A-Za-z]{8,12}/);
	if (bv) return bv[0];
	const av = s.match(/av\d{1,15}/i);
	if (av) return av[0];
	return null;
}

function biliTruthy(val) {
	return !/^(0|false|no|off)$/i.test(String(val));
}

function biliParse(args, base) {
	const opts = {
		page: base.page,
		danmaku: base.danmaku,
		ratio: base.ratio,
		high_quality: base.high_quality,
		title: ''
	};

	let id = '';

	args.forEach(function (raw) {
		const arg = String(raw == null ? '' : raw).trim();
		if (!arg) return;

		// 整条链接：交给 extractId 处理，不参与 key:value 解析
		if (/^https?:\/\//i.test(arg)) {
			if (!id) id = biliExtractId(arg) || '';
			return;
		}

		const idx = arg.indexOf(':');
		if (idx > 0) {
			const key = arg.slice(0, idx).toLowerCase();
			const val = arg.slice(idx + 1).trim();

			switch (key) {
				case 'p':
				case 'page':
					opts.page = parseInt(val, 10) || opts.page;
					break;
				case 'danmaku':
				case 'dm':
					opts.danmaku = biliTruthy(val) ? 1 : 0;
					break;
				case 'ratio':
					opts.ratio = val.replace(':', '/');
					break;
				case 'hd':
				case 'quality':
					opts.high_quality = biliTruthy(val) ? 1 : 0;
					break;
				case 'title':
					opts.title = val;
					break;
				default:
					break;
			}
			return;
		}

		if (!id) {
			id = biliExtractId(arg) || '';
			return;
		}
		// 位置参数：第二个裸数字当作分 P，其余当标题
		if (/^\d{1,3}$/.test(arg)) {
			opts.page = parseInt(arg, 10);
		} else if (!opts.title) {
			opts.title = arg;
		}
	});

	return { id: id, opts: opts };
}

function biliRender(args) {
	const base = biliDefaults();
	const parsed = biliParse(args || [], base || { page: 1, danmaku: 0, ratio: '16/9', high_quality: 1 });
	const id = parsed.id;
	const opts = parsed.opts;

	if (!id) {
		return '<p class="bili-error">bilibili: 缺少视频 ID，写法如 <code>{% bilibili BV1xx411c7mD %}</code></p>';
	}

	const isBv = /^BV/i.test(id);
	const query = (isBv ? 'bvid=' + id : 'aid=' + id.replace(/^av/i, ''));
	const link = BILI_SITE + id + (opts.page > 1 ? '?p=' + opts.page : '');
	const label = String(opts.title || '').trim();

	// 主题里关掉了就退化成一个普通外链，不至于排版塌掉
	if (!base) {
		return '<p><a class="bili-link" href="' + biliEsc(link) + '" target="_blank" rel="noopener">' +
			biliEsc(label || id) + '</a></p>';
	}

	const src = BILI_PLAYER + '?' + query +
		'&page=' + opts.page +
		'&high_quality=' + opts.high_quality +
		'&danmaku=' + opts.danmaku +
		'&autoplay=0';

	return [
		'<div class="bili-embed">',
		'<div class="bili-player" style="--bili-ratio:' + biliEsc(opts.ratio) + '">',
		'<iframe src="' + biliEsc(src) + '" scrolling="no" frameborder="0" framespacing="0" border="0"',
		' allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer"',
		' title="' + biliEsc(label || id) + '"></iframe>',
		'</div>',
		'<div class="bili-meta">',
		'<a href="' + biliEsc(link) + '" target="_blank" rel="noopener external nofollow">',
		'<i class="fa fa-television" aria-hidden="true"></i> ',
		biliEsc(label || '在 B 站观看'),
		'</a>',
		'</div>',
		'</div>'
	].join('');
}

hexo.extend.tag.register('bilibili', biliRender);
hexo.extend.tag.register('bili', biliRender);

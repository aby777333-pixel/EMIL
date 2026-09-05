// EMIL Embed SDK — drop EMIL widgets into any web page.
//   <script src="https://<your-emil-host>/sdk/emil-embed.js"></script>
//   <div id="emil-chart"></div>
//   <script>EmilEmbed.mount('#emil-chart', { key: 'emil_pk_…', widget: 'chart', symbol: 'XAU/USD', interval: '1day', height: 360 })</script>
// Widgets: chart (symbol, interval, bars), quotes (symbols), news (category, limit), brief, ask.
// The key is a PUBLIC embed key; restrict it to your origins in EMIL → Integrations.
(function (global) {
  function baseUrl() {
    var s = document.currentScript || Array.prototype.slice.call(document.getElementsByTagName('script')).filter(function (x) { return /emil-embed\.js/.test(x.src) })[0]
    try { return new URL(s.src).origin } catch (e) { return '' }
  }
  var ORIGIN = baseUrl()
  function mount(target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target
    if (!el) throw new Error('EmilEmbed.mount: target not found')
    opts = opts || {}
    if (!opts.key) throw new Error('EmilEmbed.mount: key is required')
    var widget = opts.widget || 'chart'
    var params = new URLSearchParams()
    Object.keys(opts).forEach(function (k) { if (['widget', 'height', 'width'].indexOf(k) === -1 && opts[k] != null) params.set(k, String(opts[k])) })
    var iframe = document.createElement('iframe')
    iframe.src = (opts.origin || ORIGIN) + '/embed/' + encodeURIComponent(widget) + '?' + params.toString()
    iframe.style.width = opts.width ? (typeof opts.width === 'number' ? opts.width + 'px' : opts.width) : '100%'
    iframe.style.height = (opts.height || (widget === 'chart' ? 360 : widget === 'ask' ? 320 : 280)) + 'px'
    iframe.style.border = '0'
    iframe.style.borderRadius = '8px'
    iframe.setAttribute('loading', 'lazy')
    iframe.setAttribute('title', 'EMIL ' + widget)
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    el.innerHTML = ''
    el.appendChild(iframe)
    return iframe
  }
  global.EmilEmbed = { mount: mount, version: '1.0' }
})(window)

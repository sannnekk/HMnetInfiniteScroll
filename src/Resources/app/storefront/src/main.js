import HmnetInfiniteScrollPlugin from './plugin/hmnet-infinite-scroll/hmnet-infinite-scroll.plugin'

const PluginManager = window.PluginManager

PluginManager.register(
	'HmnetInfiniteScroll',
	HmnetInfiniteScrollPlugin,
	'[data-hmnet-infinite-scroll]'
)

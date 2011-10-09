var wappalyzer = (function(){
	self = {
		debug:    false,
		tabCache: {},

		log: function(message) {
			if ( self.debug && message ) {
				console.log(message);
			}
		},

		init: function() {
			self.log('init');

			chrome.browserAction.setBadgeBackgroundColor({ color: [255, 102, 0, 255] });

			chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
				if ( typeof(request.msg != 'undefined' ) ) {
					self.log('request: ' + request.msg);

					switch ( request.msg ) {
						case 'analyze':
							wappalyzer.analyze(sender.tab.id, sender.tab.url, request.html);

							break;
						case 'get_apps':
							sendResponse({ tabCache: wappalyzer.tabCache[request.tab.id] });

							break;
					}
				}
			});

			chrome.tabs.getAllInWindow(null, function(tabs) {
				for ( i in tabs ) {
					if ( tabs[i].url.match(/https?:\/\//) ) {
						chrome.tabs.executeScript(tabs[i].id, { file: 'content.js' });
					}
				}
			});

			chrome.tabs.onRemoved.addListener(function(tabId) {
				self.log('remove tab');

				wappalyzer.tabCache[tabId] = null;
			});
		},

		analyze: function(tabId, url, html) {
			chrome.browserAction.setBadgeText({ tabId: tabId, text: '' });

			wappalyzer.tabCache[tabId] = {
				count:        0,
				appsDetected: {}
			};

			if ( html ) {
				if ( html.length > 50000 ) {
					html = html.substring(0, 25000) + html.substring(html.length - 25000, html.length);
				}

				for ( var appName in wappalyzer.apps ) {
					if ( typeof(wappalyzer.tabCache[tabId].appsDetected[appName]) == 'undefined' ) {
						if ( typeof(wappalyzer.apps[appName].html) != 'undefined' ) {
							var regex = wappalyzer.apps[appName].html;

							if ( regex.test(html) ) {
								wappalyzer.register(tabId, appName);
							}
						}

						if ( url && typeof(wappalyzer.apps[appName].url) != 'undefined' ) {
							var regex = wappalyzer.apps[appName].url;

							if ( regex.test(url) ) {
								wappalyzer.register(tabId, appName);
							}
						}
					}
				}

				html = null;
			}
		},

		register: function(tabId, appName) {
			wappalyzer.tabCache[tabId].appsDetected[appName] = {
				cats: {},
				name: appName
				};

			for ( cat in wappalyzer.apps[appName].cats ) {
				wappalyzer.tabCache[tabId].appsDetected[appName].cats[cat] = wappalyzer.cats[wappalyzer.apps[appName].cats[cat]];
			}

			wappalyzer.tabCache[tabId].count = 0;

			for ( i in wappalyzer.tabCache[tabId].appsDetected ) {
				wappalyzer.tabCache[tabId].count ++;
			}

			chrome.browserAction.setBadgeText({ tabId: tabId, text: wappalyzer.tabCache[tabId].count.toString() });
		}
	};

	return self;
})();

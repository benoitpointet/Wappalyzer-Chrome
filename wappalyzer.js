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
							wappalyzer.analyze(sender.tab.id, sender.tab.url, request.html, request.env);

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

		analyze: function(tabId, url, html, environmentVars) {
            var app;
			chrome.browserAction.setBadgeText({ tabId: tabId, text: '' });

			wappalyzer.tabCache[tabId] = {
				count:        0,
				appsDetected: {}
			};

            if ( html && html.length > 50000 ) {
                html = html.substring(0, 25000) + html.substring(html.length - 25000, html.length);
            }

            for ( var appName in wappalyzer.apps ) {
                app = wappalyzer.apps[appName];
                // Scan html
                if ( html ) {

                    if ( typeof(wappalyzer.tabCache[tabId].appsDetected[appName]) == 'undefined' ) {
                        if ( typeof(app.html) != 'undefined' ) {
                            var regex = app.html;

                            if ( regex.test(html) ) {
                                wappalyzer.register(tabId, appName);
                            }
                        }
                    }
                }

                // Scan url
                if ( typeof(wappalyzer.tabCache[tabId].appsDetected[appName]) == 'undefined' ) {
                    if ( url && typeof(app.url) != 'undefined' ) {
                        var regex = app.url;

                        if ( regex.test(url) ) {
                            wappalyzer.register(tabId, appName);
                        }
                    }
                }

                // Scan environment variables
                if ( typeof(wappalyzer.tabCache[tabId].appsDetected[appName]) == 'undefined' ) {
                    if ( environmentVars && typeof app.env != 'undefined' ) {
                        var regex = app.env;

                        for ( var i in environmentVars ) {
                            try {
                                if ( regex.test(environmentVars[i]) ) {
                                    wappalyzer.register(tabId, appName);
                                }
                            }
                            catch(e) { }
                        }
                    }
                }
			}

            html = null;
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

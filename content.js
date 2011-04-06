console.log('content.js');

chrome.extension.sendRequest({ msg: 'analyze', html: document.documentElement.innerHTML });

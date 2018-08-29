/* 

User settings format

dramaUrls: {
    "http://urlOfDrama": {
        airDays: [ integer ],
        lastWatched: integer
    }
}
settings: {
    updateFrequency: integer,
    minSubs: integer
} 

*/ 

// Default user settings
var defaultSettings = {
    dramaUrls: {},
    settings: {
        updateFrequency : 30,
        minSubs : 95
    }
};

// Miscellaneous constants
var SETTINGS_UPDATED_MSG = "Settings updated.";
var REGEX_NUMBERS = /\d+/g;
var SUB = "sub";

// Site constants
var DRAMAFEVER = "dramafever";
var DRAMANICE = "dramanice";
var ONDRAMANICE = "ondramanice";
var MYASIANTV = "myasiantv";
var VIKI = "viki";

var scrapeConstants = {
    "dramafever" : {
        name: '//article[@class="series-header"]//h1/text()',
        image: '//div[@class="series-thumbnail"]/img/attribute::src',
        currentEpNumber: '//table[contains(@class, "episode-list")]//th[@class="table-switch"]/text()',
        currentEpUrl: '//meta[@property="og:url"]/attribute::content',
        currentSubs: null
    },

    "dramanice": {
        name: '//div[@class="info_right"]/h2/text()',
        image: '//div[@class="img_cover"]//img/attribute::src',
        currentEpNumber: '//ul[@class="list_episode"]/li',
        currentEpUrl: '//ul[@class="list_episode"]/li/a/attribute::href',
        currentSubs: '//ul[@class="list_episode"]/li'
    },

    "ondramanice": {
        name: '//div[@class="info_right"]/h2/text()',
        image: '//div[@class="img_cover"]//img/attribute::src',
        currentEpNumber: '//ul[@class="list_episode"]/li',
        currentEpUrl: '//ul[@class="list_episode"]/li/a/attribute::href',
        currentSubs: '//ul[@class="list_episode"]/li'
    },

    "myasiantv" : {
        name: '//div[@class="movie"]//h1/text()',
        image: '//div[@class="movie"]//img[@class="poster"]/attribute::src',
        currentEpNumber: '//ul[@class="list-episode"]/li/h2/a/text()',
        currentEpUrl: '//ul[@class="list-episode"]/li/h2/a/attribute::href',
        currentSubs: '//ul[@class="list-episode"]/li/img/attribute::src'
    },

    "viki" : {
        name: '//div[@class="card billboard"]//h1[@data-block-track="containerLinkFold"]/text()',
        image: '//div[@data-block-track="containerThumbnail"]/img/attribute::src',
        currentEpNumber: '//a[@data-block-track="watchNow"]/span[@class="accent"]/text()',
        currentEpUrl: '//a[@data-block-track="watchNow"]/attribute::href',
        currentSubs: '/following-sibling::div[@class="grey-text thumb-caption"]/span[1]/text()'
    }
}

// Evaluate an XPath string
function xPathEvaluate(path, html) {
    return html.evaluate(path, html, null, XPathResult.STRING_TYPE, null).stringValue;
}

function scrapeDrama(url, callback) {
    // Check website to determine scrape
    let siteComponents = new URL(url).hostname.split('.');
    let domain = siteComponents.length == 2 ? siteComponents[0] : siteComponents[1];
    let siteToScrape = domain in scrapeConstants ? domain : null;

    // If supported, scrape the site and run callback
    if (siteToScrape) {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() { 
            if (xhr.readyState == 4 && xhr.status == 200) {
                let drama = scrapeSite(xhr.responseXML, siteToScrape, url);
                callback(drama);
            }
        }
        xhr.open("GET", url, true);
        xhr.responseType = "document";
        xhr.send();
    }    
}

function scrapeSite(html, website, url) {
    let drama = { site: website };
    let constants = scrapeConstants[website];

    drama.name = xPathEvaluate(constants.name, html).trim();

    drama.image = xPathEvaluate(constants.image, html);
    if (drama.image.indexOf("http:") == -1 && drama.image.indexOf("https:") == -1) {
        drama.image = "http:" + drama.image;
    }

    let currentEp = xPathEvaluate(constants.currentEpNumber, html).trim();
    let numbers = currentEp.match(REGEX_NUMBERS); 
    drama.currentEp = numbers != null ? numbers[numbers.length - 1] : 0;
    
    drama.currentUrl = xPathEvaluate(constants.currentEpUrl, html);
    if (drama.currentUrl.indexOf("http:") == -1 && drama.currentUrl.indexOf("https:") == -1) {
        let urlBase = url.substring(0, url.indexOf('/', 10));
        drama.currentUrl = urlBase + drama.currentUrl;
    }

        //LET didn't like scoping of currentSubs = ... so changed to cs and added scope bracket
        switch (website) {
        case DRAMAFEVER:
            {
                drama.currentSubs = "Check DF";
                break;
            }
        case DRAMANICE:
        case ONDRAMANICE:
            {
                let cs = xPathEvaluate(constants.currentSubs, html).trim();
                drama.currentSubs = cs.substring(cs.indexOf("|") + 2);
                break;
            }
        case MYASIANTV:
            {
                let cs = xPathEvaluate(constants.currentSubs, html);
                drama.currentSubs = cs.substring(cs.lastIndexOf("/") + 1, cs.indexOf(".png"));
                break;
            }
        case VIKI:
            {
                let cs = xPathEvaluate('//a[@href="' + drama.currentUrl + '"]' + constants.currentSubs, html);
                drama.currentSubs = cs.match(REGEX_NUMBERS)[0] + "%";
                break;
            }
    }

    return drama;
}

// Update last watched episode
function setWatchedEp(url, episode, UserService) {
    if (UserService) {
        UserService.user.dramaUrls[url].lastWatched = parseInt(episode);
        UserService.save();
    } else if (userInfo) {
        userInfo.dramaUrls[url].lastWatched = parseInt(episode);
        localStorage.DramaTracker = JSON.stringify(userInfo);
    }
}

// Open a new tab to a URL
function goToUrl(newTabUrl) {
    chrome.tabs.create({ 
        active: true, 
        url: newTabUrl 
    });
}

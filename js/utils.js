/* 

Default user settings

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
var defaultSettings = {
    dramaUrls: {},
    settings: {
        updateFrequency : 30,
        minSubs : 95
    }
};

var SETTINGS_UPDATED_MSG = "Settings updated.";

// Site Constants
var VIKI = "viki";
var MYASIANTV = "myasiantv";
var SUB = "sub";

// Viki Scraping Constants
var vImage = '//div[@data-block-track="containerThumbnail"]/img/attribute::src';
var vName = '//div[@class="card billboard"]//h1[@data-block-track="containerLinkFold"]/text()';
var vCurrentEpNumber = '//a[@data-block-track="watchNow"]/span[@class="accent"]/text()';
var vCurrentEpUrl = '//a[@data-block-track="watchNow"]/attribute::href';
var vEpisodes = '//div[@class="media-body"]/h1[@class="media-heading strong"]/text()';
var vSubs = '/following-sibling::div[@class="grey-text thumb-caption"]/span[1]/text()';

// MAT Scraping Constants
var matImage = '//div[@class="movie"]//img[@class="poster"]/attribute::src';
var matName = '//div[@class="movie"]//h1/text()';
var matCurrentEpNumber = '//ul[@class="list-episode"]/li/h2/a/text()';
var matCurrentEpUrl = '//ul[@class="list-episode"]/li/h2/a/attribute::href';
var matSubs = '//ul[@class="list-episode"]/li/img/attribute::src';

// Evaluate an XPath string
function xPathEvaluate(path, html) {
    return html.evaluate(path, html, null, XPathResult.STRING_TYPE, null).stringValue;
}

function scrapeViki(html) {
    var drama = { site: VIKI };
    drama.image = xPathEvaluate(vImage, html);
    drama.name = xPathEvaluate(vName, html).trim();
    var currentEp = xPathEvaluate(vCurrentEpNumber, html);
    drama.currentEp = currentEp.substring(currentEp.indexOf(".")+1) || 0;
    drama.currentUrl = xPathEvaluate(vCurrentEpUrl, html);
    var currentSubs = xPathEvaluate('//a[@href="' + drama.currentUrl + '"]' + vSubs, html);
    drama.currentSubs = currentSubs.match('[0-9]+')[0] + "%";
    return drama;
}

function scrapeMAT(html) {
    var drama = { site: MYASIANTV };
    drama.image = xPathEvaluate(matImage, html);
    drama.name = xPathEvaluate(matName, html);
    var currentEp = xPathEvaluate(matCurrentEpNumber, html);
    drama.currentEp = currentEp.substring(currentEp.indexOf("Episode")+8);
    var subs = xPathEvaluate(matSubs, html); 
    drama.currentSubs = subs.substring(subs.lastIndexOf("/")+1, subs.indexOf(".png"));
    drama.currentUrl = xPathEvaluate(matCurrentEpUrl, html);
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

// Get user settings
var settings = JSON.parse(localStorage.DramaTracker).settings;
var updateFrequency = settings.updateFrequency;
var minSubs = settings.minSubs;

// Begin tracking dramas airing today on startup
$(function() { 
    var airingToday = getDramasAiringToday();

    for (var i = 0; i < airingToday.length; i++) {
        var url = airingToday[i];
        chrome.alarms.create(url, { 
           periodInMinutes: updateFrequency
        });
    }

    // Set alarm to check for updates periodically
    chrome.alarms.onAlarm.addListener(function(alarm) {
        var url = alarm.name;
        console.log("getting updates for: " + url);
        getDramaUpdates(url);
    });
});

// Determine which dramas are airing today
function getDramasAiringToday() { 
    var today = (new Date()).getDay();
    var dramaUrls = JSON.parse(localStorage.DramaTracker).dramaUrls;

    var airingToday = [];

    for (var url in dramaUrls) {
        var airDays = dramaUrls[url];

        for (var i = 0; i < airDays.length; i++) {
            if (airDays[i] == today) {
                airingToday.push(url);
            }
        }
    }

    return airingToday;
}

// Generate notifications based on selected frequency
function createNotification(drama, messageBody) {
    var id = "dramaNotification" + new Date().getTime();
    var opt = {
        type: "basic",
        title: drama.name,
        message: messageBody,
        iconUrl: drama.image,
        buttons: [{
            title: "Watch Now"
        }]
    };
    
    chrome.notifications.create(id, opt);

    chrome.notifications.onButtonClicked.addListener(function(id, button) {
        chrome.tabs.create({ active: true, url: drama.currentUrl });
        chrome.alarms.clear(drama.url);
    });
}

// Get drama details and check for updates
function getDramaUpdates(url) {
    var callback = null;

    // Check website to determine scrape
    var site = new URL(url).hostname;
    if (site.indexOf(MYASIANTV) != -1) {
        callback = scrapeMAT;
    } else if (site.indexOf(VIKI) != -1) {
        callback = scrapeViki;
    }

    // Scrape the site
    if (callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() { 
            if (xhr.readyState == 4 && xhr.status == 200) {
                var drama = callback(xhr.responseXML);
                drama.url = url;

                switch (drama.site) {
                    case MYASIANTV:
                        if (drama.currentSubs == SUB) {
                            var message = "Episode " + drama.currentEp + "is subbed!";
                            createNotification(drama, message);
                        }
                        break;
                    case VIKI:
                        var subsPercent = parseInt(drama.currentSubs.match('[0-9]+')[0]);
                        if (subsPercent >= minSubs) {
                            var message = "Episode " + drama.currentEp + " is " + drama.currentSubs + " subbed!";
                            createNotification( drama, message);
                        }
                        break;
                }
            }
        }
        xhr.open("GET", url, true);
        xhr.responseType = "document";
        xhr.send();
    }
}
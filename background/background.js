// Get user settings
var settings = null;

// Begin tracking dramas airing today on startup
$(function() { 
    updateDramaTracking();

    // Set alarm to check for updates periodically
    chrome.alarms.onAlarm.addListener(function(alarm) {
        var url = alarm.name;
        getDramaUpdates(url);
    });

    // Set listener for any user settings updates
    chrome.runtime.onMessage.addListener(
      function(request) {
        updateDramaTracking();
      });
});

// Get updated settings and update tracking of dramas
function updateDramaTracking() {
    // Clear all previous alarms
    chrome.alarms.getAll(function(alarms) {
        for (i = 0; i < alarms.length; i++) {
            var alarmName = alarms[i].name;
            chrome.alarms.clear(alarmName);
        }
    });

    // Get updated settings
    settings = localStorage.DramaTracker ? JSON.parse(localStorage.DramaTracker).settings : defaultSettings;
    var airingToday = getDramasAiringToday();

    // Set up periodic polling for drama updates
    for (i = 0; i < airingToday.length; i++) {
        var url = airingToday[i];   
        chrome.alarms.create(url, { 
           periodInMinutes: settings.updateFrequency
        });
    }
}

// Determine which dramas are airing today
function getDramasAiringToday() { 
    var today = (new Date()).getDay();
    var dramaUrls = settings.dramaUrls;

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
    var opt = {
        type: "basic",
        title: drama.name,
        message: messageBody,
        iconUrl: drama.image,
        buttons: [{
            title: "Watch Now"
        }]
    };
    
    chrome.notifications.create(drama.url, opt);

    chrome.notifications.onButtonClicked.addListener(function(id, button) {
        chrome.tabs.create({ active: true, url: drama.currentUrl });
        chrome.notifications.clear(id);
        chrome.alarms.clear(id);
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
                        console.log(drama.name + ": " + drama.currentSubs + " at " + (new Date()).toTimeString());
                        if (drama.currentSubs == SUB) {
                            var message = "Episode " + drama.currentEp + " is subbed!";
                            createNotification(drama, message);
                        }
                        break;
                    case VIKI:
                        var subsPercent = parseInt(drama.currentSubs.match('[0-9]+')[0]);
                        if (subsPercent >= settings.minSubs) {
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
$(function() { 
    var airingToday = getDramasAiringToday();
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
function createNotification() {
    var id = "dramaNotification" + new Date().getTime();
    var opt = {
        type: "basic",
        title: "Remember to drink water",
        message: "Remember to take a sip!",
        iconUrl: "/img/icon48.png",
        buttons: [{
            title: "I took a sip!"
        }]
    };
    chrome.notifications.create(id, opt);
}
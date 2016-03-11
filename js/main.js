var app = angular.module("DramaTracker", ['ngRoute', 'ui.bootstrap']);

// Main page controller
app.controller("HomeController", function($scope, UserService) {
    // Load all dramas
    $scope.today = (new Date()).getDay();
    $scope.dramas = [];
    $scope.airDays = [];
    $scope.daysOfWeek = { 0 : "S", 1 : "M", 2 :"T", 3 :"W", 4 :"T", 5 :"F", 6 :"S" };

    for (var url in UserService.user.dramaUrls) {
        getDramaDetails(url);
    };

    function getDramaDetails(url) {
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
                    drama.airDayFromToday = getNextAirDay(url);

                    $scope.dramas.push(drama);
                    $scope.$apply();
                }
            }
            xhr.open("GET", url, true);
            xhr.responseType = "document";
            xhr.send();
        }
    }

    function getNextAirDay(url) {
        // Set sort order by next air day
        var dramaAirDays = UserService.user.dramaUrls[url];
        var nextAirDay = UNKNOWN_AIR_DAYS;

        if (dramaAirDays.length > 0) {
            var largest = dramaAirDays[dramaAirDays.length-1];

            // Next episode airs this week
            if (largest >= $scope.today) {
                for (var day in dramaAirDays) {
                    if (day >= $scope.today) {
                        largest = day;
                    }
                }
                nextAirDay = largest - $scope.today;
            // Next episode airs next week
            } else {
                nextAirDay = dramaAirDays[0] + UNKNOWN_AIR_DAYS - $scope.today;
            }
        }

        return nextAirDay;
    }

    // Save new dramas
    $scope.newDramaUrl = "";
    $scope.save = function() {
        var newDramaUrl = $scope.newDramaUrl;

        // Show error message if URL is invalid
        if (!newDramaUrl || UserService.user.dramaUrls.hasOwnProperty(newDramaUrl)) {
            $("#error-message").text(!newDramaUrl ? INVALID_URL_ERR : DUPLICATE_ERR);
            $("#error-message").collapse("show");
            $("#url-input").parent().addClass("has-error");
            $("#url-input").focus(function() {
                $("#error-message").collapse("hide");
                $("#url-input").parent().removeClass("has-error");
            });        
        } else {
            // Collapse the form
            $('#track-new').collapse('hide');

            // Save the URL
            UserService.user.dramaUrls[newDramaUrl] = $scope.airDays;
            UserService.save();

            // Reset form and list of air days 
            $scope.airDays = [];
            document.getElementById("track-new").reset();

            // Load the drama details
            getDramaDetails(newDramaUrl);
        }
    };
});

// Settings page controller
app.controller("SettingsController", function($scope, $location, UserService) {
    $scope.settings = UserService.user.settings;

    // Save settings and redirect to home page
    $scope.save = function() {
        UserService.save();
        $location.path("/"); 
    }
});

// Directive for tracking Multiple checkboxes
app.directive("checkboxGroup", function() {
    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            // update array whenever checkbox is clicked
            element.bind("click", function() {
                var index = scope.airDays.indexOf(scope.num);

                // add to list if checked, remove from list if unchecked
                if (element[0].checked) {
                    if (index === -1) scope.airDays.push(parseInt(scope.num));
                    scope.airDays.sort();
                } else {
                    if (index !== -1) scope.airDays.splice(index, 1);
                }
            });
        }
    }
});

// Directive to display each drama in the home page
app.directive("dramaItem", function(UserService) {
    return {
        restrict: "E",
        scope: true,
        templateUrl: "/html/drama.html",
        link: function(scope, element, attrs) {
            // Go to the drama's current episode
            scope.goToUrl = function(location) {
                chrome.tabs.create({ active: true, url: location });
            }

            // Delete a drama
            var deleteButton = $(element).find(".delete-drama");
            deleteButton.on('click', function() {               
                // Delete saved URL
                var url = scope.drama.url;
                delete UserService.user.dramaUrls[url];
                UserService.save();

                // Update scope
                scope.dramas.splice(attrs.index, 1);
                scope.$apply();
            });

            // Only show delete button upon hover
            element.on("mouseover", function() {
                deleteButton.css("opacity", "1");
            })
            .on("mouseout", function() {
                deleteButton.css("opacity", "0");
            });
        }
    }
});

// Service to save user settings
app.factory('UserService', function(){ 
    // Default user settings 
    var defaults = {
        dramaUrls: {},
        settings: {
            updateFrequency : 15,
            minSubs : 95,
        }
    };

    // Save and restore user settings to/from Chrome local storage
    var service = {
        user: {},
        save: function() {
            localStorage.DramaTracker = angular.toJson(service.user);                                 
        },
        restore: function() {
            service.user = angular.fromJson(localStorage.DramaTracker) || defaults;
        },
    }

    service.restore();
    return service;
});

// Routing to multiple screens
app.config(function($routeProvider) {
    $routeProvider
    .when("/", {
        templateUrl: "/html/home.html",
        controller: "HomeController"
    })
    .when("/settings", {
        templateUrl: "/html/settings.html",
        controller: "SettingsController"
    })
    .otherwise({
        redirectTo: "/"
    });
});


// Site Constants
var VIKI = "viki";
var MYASIANTV = "myasiantv";
var UNKNOWN_AIR_DAYS = 7;

// Error Message Consants
var INVALID_URL_ERR = "Please enter a valid URL.";
var DUPLICATE_ERR = "You're already tracking this drama!";

// Evaluate an XPath string
function xPathEvaluate(path, html) {
    return html.evaluate(path, html, null, XPathResult.STRING_TYPE, null).stringValue;
}

// Viki Scraping Constants
var vImage = '//div[@data-block-track="containerThumbnail"]/img/attribute::src';
var vName = '//div[@class="card billboard"]//h1[@data-block-track="containerLinkFold"]/text()';
var vCurrentEpNumber = '//a[@data-block-track="watchNow"]/span[@class="accent"]/text()';
var vCurrentEpUrl = '//a[@data-block-track="watchNow"]/attribute::href';
var vEpisodes = '//div[@class="media-body"]/h1[@class="media-heading strong"]/text()';
var vSubs = '/following-sibling::div[@class="grey-text thumb-caption"]/span[1]/text()';

function scrapeViki(html) {
    var drama = { site: VIKI };
    drama.image = xPathEvaluate(vImage, html);
    drama.name = xPathEvaluate(vName, html).trim();
    var currentEp = xPathEvaluate(vCurrentEpNumber, html);
    drama.currentEp = currentEp.substring(currentEp.indexOf(".")+1) || 0;
    drama.currentUrl = xPathEvaluate(vCurrentEpUrl, html);
    drama.currentSubs = xPathEvaluate('//a[@href="' + drama.currentUrl + '"]' + vSubs, html);
    return drama;
}

// MAT Scraping Constants
var matImage = '//div[@class="movie"]//img[@class="poster"]/attribute::src';
var matName = '//div[@class="movie"]//h1/text()';
var matCurrentEpNumber = '//ul[@class="list-episode"]/li/h2/a/text()';
var matCurrentEpUrl = '//ul[@class="list-episode"]/li/h2/a/attribute::href';
var matSubs = '//ul[@class="list-episode"]/li/img/attribute::src';

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
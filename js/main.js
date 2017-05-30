var app = angular.module("DramaTracker", ['ngRoute', 'ui.bootstrap']);

// Main page controller
app.controller("HomeController", function($scope, UserService) {
    // Load all dramas
    $scope.today = (new Date()).getDay();
    $scope.dramas = [];
    $scope.airDays = [];
    $scope.daysOfWeek = DAYS_OF_WEEK;

    for (url in UserService.user.dramaUrls) {
        getDramaDetails(url);
    };

    function getDramaDetails(url) {
        scrapeDrama(url, function(drama) { 
            drama.url = url;
            drama.airDayFromToday = getNextAirDay(url);

            $scope.dramas.push(drama);
            $scope.$apply();
        });
    }

    // Set drama list sort order based on next air day
    function getNextAirDay(url) {
        let dramaAirDays = UserService.user.dramaUrls[url].airDays;
        let nextAirDay = UNKNOWN_AIR_DAYS;

        if (dramaAirDays.length > 0) {
            // Get the latest air day
            let largest = dramaAirDays[dramaAirDays.length-1];

            // Next episode airs this week
            if (largest >= $scope.today) {
                // Look for next air day
                for (i = 0; i < dramaAirDays.length; i++) {
                    let day = dramaAirDays[i];
                    if (day >= $scope.today) {
                        largest = day;
                        break;
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
        let newDramaUrl = $scope.newDramaUrl;

        // Show error message if URL is invalid
        if (!newDramaUrl || UserService.user.dramaUrls.hasOwnProperty(newDramaUrl)) {
            let errorMessage = !newDramaUrl ? INVALID_URL_ERR : DUPLICATE_ERR;
            showError("url-input", "error-message", errorMessage);
        } else {
            // Collapse the form
            $('#track-new').collapse('hide');

            // Save the URL
            UserService.user.dramaUrls[newDramaUrl] = { airDays: $scope.airDays };
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
        if (!$scope.settings.updateFrequency || !$scope.settings.minSubs) {
            if (!$scope.settings.updateFrequency) {
                showError("freq-input", "error-frequency", INVALID_FREQ_ERROR);
            }
            if (!$scope.settings.minSubs) {
                showError("subs-input", "error-subs", INVALID_SUBS_ERROR);
            }
        } else {
            UserService.save();
            $location.path("/"); 
        }
    }
});

// Directive for tracking multiple checkboxes
app.directive("checkboxGroup", function() {
    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            // update array whenever checkbox is clicked
            element.bind("click", function() {
                let index = scope.airDays.indexOf(scope.num);

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
            var drama = scope.drama;
            
            // Update a drama's last watched episode
            var watchButton = $(element).find(".watch-drama");
            watchButton.on('click', function() {
                setWatchedEp(drama.url, drama.currentEp, UserService);
                goToUrl(drama.currentUrl);
            });

            // Delete a drama
            var deleteButton = $(element).find(".delete-drama");
            deleteButton.on('click', function() {               
                // Delete saved URL
                delete UserService.user.dramaUrls[drama.url];
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
    // Save and restore user settings to/from Chrome local storage
    var service = {
        user: {},
        save: function() {
            localStorage.DramaTracker = angular.toJson(service.user);
            chrome.runtime.sendMessage(SETTINGS_UPDATED_MSG);
        },
        restore: function() {
            service.user = angular.fromJson(localStorage.DramaTracker) || defaultSettings;
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

// Display an error message for a form
function showError(inputId, messageId, message) {
    inputId = "#" + inputId;
    messageId = "#" + messageId;

    $(messageId).text(message);
    $(messageId).collapse("show");
    $(inputId).parent(".input-group").addClass("has-error");
    $(inputId).focus(function() {
        $(messageId).collapse("hide");
        $(inputId).parent().removeClass("has-error");
    });
}

// Error message constants
var INVALID_URL_ERR = "Please enter a valid URL.";
var DUPLICATE_ERR = "You're already tracking this drama!";
var INVALID_FREQ_ERROR = "Please enter a number greater than 1.";
var INVALID_SUBS_ERROR = "Please enter a number between 0 and 100.";
var UNKNOWN_AIR_DAYS = 7;
var DAYS_OF_WEEK = { 0 : "S", 1 : "M", 2 : "T", 3 : "W", 4 : "T", 5 : "F", 6 : "S" };

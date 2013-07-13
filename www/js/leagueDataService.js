angular.module('leagueDataService', []).factory('league', function ($http) {
    debug.debug("league Init called");
    
    var l = {
        dataSource : '/data/league.json',
        data : {},
        computed : {}
    };

   
    l.bHaveData = false;
    l.haveData = function(d) {
        if (typeof(d) == "boolean") { l.bHaveData = d; }
        return l.bHaveData;
    };
 
    l.bLoadingData = true; //N.B. Set to true as this module loads on init 
    l.loadingData = function(d) {
        if (typeof(d) == "boolean") { l.bLoadingData = d; }
        return l.bLoadingData;
    };


    l.getLeagueData = function() { return l.leagueData; };
    l.loadLeagueData = function() {
        l.loadingData(true);
        l.haveData(false);
        $http.get(l.dataSource)
             .success(function (data, status, headers, config) {
            l.leagueData = data;
            
            l.haveData(true);
            l.loadingData(false);
            
        });
    };

    l.getMinSeason = function() {
        if (!l.haveData()) {
            return null;
        }
 
        if ('minSeason' in l.computed) {
            return l.computed.minSeason;
        }
        var seasons = l.leagueData.seasons;
        for (var i = 0; i < seasons.length; i++) {
            if (!('minSeason' in l.computed) || l.computed.minSeason > seasons[i]) {
                l.computed.minSeason = seasons[i];
            }
        }
        
        return l.computed.minSeason; 
    }
    
    l.getMaxSeason = function() {
        if (!l.haveData()) {
            return null;
        }
 
        if ('maxSeason' in l.computed) {
            return l.computed.maxSeason;
        }
        var seasons = l.leagueData.seasons;
        for (var i = 0; i < seasons.length; i++) {
            if (!('maxSeason' in l.computed) || l.computed.maxSeason < seasons[i]) {
                l.computed.maxSeason = seasons[i];
            }
        }
        
        return l.computed.maxSeason; 
    }


    l.loadLeagueData();

    return l;
});

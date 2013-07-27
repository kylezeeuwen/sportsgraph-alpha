angular.module('leagueDataService', []).factory('league', function ($http) {
    debug.debug("league Init called");
    
    var l = {
        //dataSource : '/data/league.json',
        dataSource : '/data/league.starta.json',
        //dataSource : '/data/league.test.pretty.json',
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

    l.getSeasons = function() {
        if (!l.haveData()) {
            return null;
        }

        return l.leagueData.seasons.sort();
    }

    l.getNextSeason = function(curSeason) {
        var seasons = l.getSeasons();
        for (var i = 0; i < seasons.length; i++) {
            if (seasons[i] == curSeason) {
                if (i + 1 < seasons.length) {
                    return seasons[i + 1];
                }
                else {
                    return null;
                }
            }
        }
        return null;
    }

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

    l.getRoster = function(season) {
        if (!l.haveData()) {
            return null;
        }
        
        return l.leagueData.roster[season]; 
    }

    l.getArenas = function() {
        if (!l.haveData()) {
            return null;
        }
        
        return l.leagueData.arenas;
    }

    l.getArena = function(teamID, season) {
        if (!l.haveData()) {
            return null;
        }

        //XXX: Data model limition. Currently I only have one arena / team
        return l.leagueData.arenas[teamID];
    }

    l.loadLeagueData();

    return l;
});

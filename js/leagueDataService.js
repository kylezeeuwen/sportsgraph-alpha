angular.module('leagueDataService', []).factory('league', function ($http) {
    if (globals.debugF) { console.log("league Init called"); }
    
    var me = {
        dataSource : globals.graph.sources.league,
        data : {}
    };

    me.bHaveData = false;
    me.haveData = function(d) {
        if (typeof(d) == "boolean") { me.bHaveData = d; }
        return me.bHaveData;
    };
 
    me.bLoadingData = true; // initial value true as this module loads on init 
    me.loadingData = function(d) {
        if (typeof(d) == "boolean") { me.bLoadingData = d; }
        return me.bLoadingData;
    };

    me.getLeagueData = function() { return me.leagueData; };
    me.loadLeagueData = function() {
        me.loadingData(true);
        me.haveData(false);

        $http.get(me.dataSource)
            .success(function (data, status, headers, config) {
                me.leagueData = data;
                me.haveData(true);
                me.loadingData(false);
            })
            .error(function (data, status, headers, config) {
                //XXX: This is a nono (HTML in a service!!)
                // But this is just a demo ... lets not take ourselves
                // too sersiously ...
                title = 
                    'Fail to get league data from URL ' + 
                    me.dataSource
                    + ' : ' + status;

                var dialog = $(
                    "<div class='dialog' title='" + title + "'</div>"
                ).dialog({
                    resizable: false,
                    height: 140,
                    width: 850,
                    buttons: {
                        "That sucks": function() {
                            $( this ).dialog( "close" );
                        }
                    }
                });
                $('body').append(dialog);
            })
    };

    me.getSeasons = function() {
        if (!me.haveData()) {
            return null;
        }

        return me.leagueData.seasons.sort();
    }

    me.getNextSeason = function(curSeason) {
        var seasons = me.getSeasons();
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

    me.getMinSeason = function() {
        if (!me.haveData()) {
            return null;
        }
 
        var seasons = me.getSeasons();
        return seasons[0];
    }
    
    me.getMaxSeason = function() {
        if (!me.haveData()) {
            return null;
        }
        
        var seasons = me.getSeasons();
        return seasons[seasons.length - 1];
    }

    me.getRoster = function(season) {
        if (!me.haveData()) {
            return null;
        }
        
        return me.leagueData.roster[season]; 
    }

    me.getArenas = function() {
        if (!me.haveData()) {
            return null;
        }
        
        return me.leagueData.arenas;
    }

    me.getArena = function(teamID, season) {
        if (!me.haveData()) {
            return null;
        }

        //XXX: Data model limition. Currently I only have one arena / team
        return me.leagueData.arenas[teamID];
    }
    
    me.getTeams = function() {
        if (!me.haveData()) {
            return null;
        }
        
        return me.leagueData.teams;
    }

    // Initiate the data load
    // XXX: Should this be done in app.config ?
    me.loadLeagueData();

    return me;
});

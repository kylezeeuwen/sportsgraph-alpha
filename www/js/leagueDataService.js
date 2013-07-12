angular.module('leagueDataService', []).factory('league', function ($http) {

    debug.debug("league Init called");
    
    var l = {
        dataSource : '/data/league.js',
        data : {}
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
            l.data = data;
            
            l.haveData(true);
            l.loadingData(false);
            
        });
    };

    l.loadLeagueData();

    return l;
});

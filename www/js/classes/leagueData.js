"use strict";

function LeagueData(params) {
    var me = this;

    // Start constructor

    //Apply defaults to the input params
    //unless the key exists and is defined in param,
    //use the default
    //NB: for a param to make it in, there must be an entry in default
    var defaultParams = {
        debugF      : 0,  // F - Flow
    };

    for (var key in defaultParams) {
        if (!(key in params)) {
            me[key] = defaultParams[key];
        }
        else {
            me[key] = params[key];
        }
    }

    // End constructor
    if (me.debugF) { console.log("Constructor called for LeagueData"); };

    me.init = function() {
        if (me.debugF) { console.log("LT.init called"); };
    };

}

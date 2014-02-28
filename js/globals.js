"use strict";

var globals = {
    debugF : false, // Turn on for debugging to console.log
    debugT : false, // Turn on for debugging to console.log
    graph : {
        sources : {
            world : 'data/world-50m.json',
            //league : 'data/league.json' // full league. You cant handle the full league!!
            league : 'data/league.haslettert.quartersize.json' // This is currently just right
            //league : 'data/league.121record.json' // this one is really just for isolating bugs
        },
        start : {
            // brantford, ontario
            //"lat" : 43.166, "long" : -80.25 
            // churchill, manitoba
            //"lat" : 58.769, "long" : -94.169 
            // south tip of hudsons bay (aka middle of nowhere)
            "lat" : 51.299, "long" : -80.252 
        },
        end : {
            // naples, florida (<3 to golf!)
            //"lat" : 26.15, "long" : -81.8  
            // top of florida (<3 to golf!)
            "lat" : 31.349, "long" : -82.72  
        }
    } 
};

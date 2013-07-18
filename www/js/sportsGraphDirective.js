angular.module("sportsGraphDirective", []).directive(
    'sportsgraph',
    function factory(league) {
        var directiveObject = {
            restrict: 'E',
            scope : {
                currentYear: '='
            },
            link : function(scope, iElement, iAttrs, controller) {
                debug.debug("graph directive link called"); 

                //add methods to scope
                initScope(scope,league);    

                scope.setupCanvas(iElement, scope.w, scope.h);
                
                //data should be delivered by a one directional binding with the outerController
                scope.$watch(league.haveData, function (haveData) {
                    scope.haveData = haveData;
                });
                
                scope.$watch('haveData + haveMap', function (n) {
                    debug.debug("graph haveData(" + scope.haveData + ") + haveMap(" + scope.haveMap + ") called");
                    if (scope.haveData && scope.haveMap) {
                        scope.start();
                    }
                });

               //XXX: For now dont watch the slider, just control it
               //scope.$watch('currentYear', function (newYear, oldYear) {
               //    debug.debug("newYear " + newYear + " oldYear " + oldYear);
               //   
               //    if (!newYear || newYear == 'NaN') {
               //        return;
               //    }
               //    if (!oldYear || oldYear == 'NaN') {
               //        scope.doFirstSeason();
               //    } 
               //    else if (newYear != oldYear) {
               //        scope.doTransitionSeason()
               //    }
               //});
            }
        };
        
        return directiveObject;
    }
);

//add methods to scope
initScope = function(scope,league) {

    var me = scope;

    me.w = 1024;
    me.h = 800;
    me.fill = d3.scale.category20();
    me.activePlayers = [];

    ///////////////////////////////////////////////////////////////////////////////
    // Init the svg canvas
    
    me.setupCanvas = function(iElement, w, h) {
        debug.debug("graph setupCanvas called");
        var fill = d3.scale.category20();
        
        me.svg = d3.select('#' + iElement.attr('id')).append("svg")
            .attr("width", w)
            .attr("height", h);
    
        ///////////////////////////////////////////////////////////////////////////////
        // Init the map bits
        
        me.projection = d3.geo.mercator()
            .center([-100,45])
            .scale(850);
        
        me.path = d3.geo.path()
            .projection(me.projection);
        
        $.ajax({
            url: "/data/world-50m.json",
            async: false,
            success: function (d) {
                me.world = d;
        
                //add land mass
                me.svg.insert("path", ".graticule")
                    .datum(topojson.feature(me.world, me.world.objects.land))
                    .attr("class", "land")
                    .attr("d", me.path);
                
                //add country borders
                me.svg.insert("path", ".graticule")
                    .datum(topojson.mesh(
                        me.world, me.world.objects.countries, function(a, b) { return a !== b; }
                    ))
                    .attr("class", "boundary")
                    .attr("d", me.path);
                

                me.haveMap = true;
            }
        });
                    
    };
    
    me.start = function() {
        debug.debug("graph Start called");

        me.force = d3.layout.force()
            .links([])
            .gravity(0)
            .size([me.w, me.h]);
        
        me.force.on("tick", function(e) {
        
            debug.debug("in tick e.alpha is %s", e.alpha);
        
            var k = 1.5 * e.alpha;
            if (k > 1) { k = 1; }
        
            me.activePlayers.forEach(function(player, i) {
        
                var arenaInfo = me.arenas[player.arenaID];
        
                player.x += (arenaInfo.cx - player.x) * k; 
                player.y += (arenaInfo.cy - player.y) * k; 
            });
        
            me.svg.selectAll("circle.node")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        
            if (e.alpha < 0.075) {
                debug.debug("force.stop");
                me.force.stop();
            }
        });

        me.assignArenaCoordinates();

        var seasons = league.getSeasons();
        for (var i = 0; i < seasons.length; i++) {
    
            if (i == 0) {
                scope.doFirstSeason(seasons[i]);
            }
            else {
                scope.doTransitionSeason(seasons[i-1],seasons[i]);
            }
        }
    }
    
    me.assignArenaCoordinates = function() { 
        me.arenas = league.getArenas();
        for (var arenaID in me.arenas) {
            var arena = me.arenas[arenaID];
            var coords = me.projection([arena['longitude'], arena['latitude']]);
            arena.cx = coords[0];
            arena.cy = coords[1];
            arena.fill = me.fill(arenaID);
        }
    }

    me.doFirstSeason = function(curSeason) {
        debug.debug("Do firstSeason");

        me.activePlayers = [];
        var roster = league.getRoster(curSeason);
        for (var teamID in roster) {
            for (var i = 0; i < roster[teamID].length; i++) {
                var player = {
                    'id' : roster[teamID][i],
                    'fill' : me.arenas[teamID].fill,
                    'x' : Math.random() * me.w,
                    'y' : Math.random() * me.h,
                    'teamID'  : teamID,
                    'arenaID' : teamID //XXX: this should be a function of the season and the team
                }; 
                me.activePlayers.push(player);
            }
        }
        me.force.start();

        me.svg.selectAll("circle.node")
            .data(me.activePlayers)
            .enter().append("svg:circle")
              .attr("class", "node")
              .attr("cx", function(d) { return d.x; })
              .attr("cy", function(d) { return d.y; })
              .attr("r", 5)
              .style("fill", function(d) { return d.fill; })
              .style("stroke", function(d) { return d3.rgb(d.fill).darker(2); })
              .style("stroke-width", 1.5)
              .call(me.force.drag);

    };
    
    me.doTransitionSeason = function(prevSeason, curSeason) {
        debug.debug("Do transition");
    };
};

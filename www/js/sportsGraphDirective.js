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
                var me = scope;
                me.trackThesePlayers = {
                   // 1 : 1
                };

                //add methods to me
                initScope(me,league);    

                me.setupCanvas(iElement, me.w, me.h);
                
                //data should be delivered by a one directional binding with the outerController
                me.$watch(league.haveData, function (haveData) {
                    me.haveData = haveData;
                });
                
                me.$watch('haveData + haveMap', function (n) {
                    debug.debug("graph haveData(" + me.haveData + ") + haveMap(" + me.haveMap + ") called");
                    if (me.haveData && me.haveMap) {
                        me.assignArenaCoordinates();
                        me.ready = true;
                        me.doFirstSeason(me.currentYear);
                    }
                });

                me.$watch('currentYear', function (newYear, oldYear) {
                    debug.debug(
                        "newYear " + newYear + 
                        " oldYear " + oldYear + 
                        " ready " + me.ready + 
                        " transitionInProgress " + me.transitionInProgress
                    );
                
                    if (!me.ready || me.transitionInProgress || !newYear || newYear == 'NaN') {
                        return;
                    }
                    else if (!oldYear || oldYear == 'NaN') {
                        scope.doFirstSeason(newYear);
                    } 
                    else if (newYear != oldYear) {
                        scope.doFirstSeason(newYear);
                    }
                });
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
    me.speed = 0.75;
    me.transitionCutoff = 0.96;
    me.fill = d3.scale.category20();
    me.activePlayers = [];
    me.playerLastCoord = {};

    ///////////////////////////////////////////////////////////////////////////////
    // Init the svg canvas
    
    me.setupCanvas = function(iElement, w, h) {
        debug.debug("graph setupCanvas called");
        
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
        
        me.force = d3.layout.force()
            .links([])
            .gravity(0)
            .size([me.w, me.h]);
        
        me.force.on("tick", function(e) {
        
            //debug.debug("in tick e.alpha is %s", e.alpha);
        
            var k = me.speed * e.alpha;
            if (k > 0.7) { k = 0.7; }
        
            me.activePlayers.forEach(function(player, i) {
        
                var arenaInfo = me.arenas[player.arenaID];
                var id = player.id;
                var closeEnough = 1;                
                var diff;

                diff = arenaInfo.cx - me.playerLastCoord[id].x;
                if (Math.abs(diff) > closeEnough) {
                    me.playerLastCoord[id].x += diff * k; 
                }
                
                diff = arenaInfo.cy - me.playerLastCoord[id].y;
                if (Math.abs(diff) > closeEnough) {
                    me.playerLastCoord[id].y += diff * k; 
                }

                if (id in me.trackThesePlayers) {
                    debug.debug(
                        "Tracked player " + id + 
                        "Arena ID " + player.arenaID + 
                        " at " + 
                        "x: " + Math.round(me.playerLastCoord[id].x) + 
                        "y: " + Math.round(me.playerLastCoord[id].y) + 
                        "arena at " + 
                        "x: " + Math.round(arenaInfo.cx) + 
                        "y: " + Math.round(arenaInfo.cy)
                    );
                }
            });
        
            //XXX: write xy to playerLastCoord AND activeplayers, only retrieve on miss, save time 
            me.svg.selectAll("circle.node")
                .attr("cx", function(d) { return me.playerLastCoord[d.id].x; })
                .attr("cy", function(d) { return me.playerLastCoord[d.id].y; })
        
            if (e.alpha < (1 - me.transitionCutoff)) {
                debug.debug("force.stop" +
                    " seasonOver " + me.currentYear +
                    " entered " + me.counts.enter +
                    " updated " + me.counts.update +
                    " exited " + me.counts.exit
                );
                me.force.stop();
                me.transitionInProgress = false;
                var nextSeason = league.getNextSeason(me.currentYear);
                if (nextSeason) { 
                    me.currentYear = nextSeason;
                    me.$apply();
                }
            }
        });
        
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
        debug.debug("Do firstSeason " + curSeason);

        me.activePlayers = [];
        var roster = league.getRoster(curSeason);
        for (var teamID in roster) {
            for (var i = 0; i < roster[teamID].length; i++) {
                var player = {
                    'id' : roster[teamID][i],
                    'fill' : me.arenas[teamID].fill,
                    'teamID'  : teamID,
                    'arenaID' : teamID //XXX: this should be a function of the season and the team
                };

                if (!(player.id in me.playerLastCoord)) {
                    me.playerLastCoord[player.id] = {
                        'x' : Math.random() * me.w,
                        'y' : Math.random() * me.h
                    };
                };

                me.activePlayers.push(player);
            }
        }

        me.counts = {
            "enter"  : 0,
            "update" : 0,
            "exit"   : 0
        };

        me.force.start();
        me.transitionInProgress = true;

        //node is the selection of players that persisted from one season to the next
        //node.enter() yeilds arriving players, node.exit() yileds exiting players.
        // Read the D3 docs and specifically D3 constancy to figure this out:
        // NB links may get out of date. search "D3 constancy":
        //  summary: http://bost.ocks.org/mike/constancy/
        //  source: https://github.com/mbostock/bost.ocks.org/blob/gh-pages/mike/constancy/index.html

        var node = me.svg.selectAll("circle.node")
            .data(me.activePlayers, function (d) { return d.id });
        
        var nodeEnter = node.enter().append("svg:circle")
              .attr("class", "node")
              .attr("debug", function(d) { me.counts.enter++; })
              .attr("cx", function(d) { return me.playerLastCoord[d.id].x; })
              .attr("cy", function(d) { return me.playerLastCoord[d.id].y; })
              .attr("r", 5)
              .style("fill", function(d) { return d.fill; })
              .style("stroke", function(d) { return d3.rgb(d.fill).darker(2); })
              .style("stroke-width", 1.5)
              .append("svg:title").text(function(d) { return d.id })
              .call(me.force.drag);
        
        var nodeUpdate = d3.transition(node)
              .select("circle")
              .attr("debug", function(d) { me.counts.update++; })
              .attr("cx", function(d) { return me.arenas[d.arenaID].cx; })
              .attr("cy", function(d) { return me.arenas[d.arenaID].cy; })
              .style("fill", function(d) { return d.fill; })
              .style("stroke", function(d) { return d3.rgb(d.fill).darker(2); });
              //.each("end", function(d) { debug.debug("end called for " + d.id); });
            
        var nodeExit = d3.transition(node.exit())
              .select("circle")
              .style("fill-opacity", 0)
              .attr("debug", function(d) { me.counts.remove++; })
              .remove();
    };
};

angular.module("sportsGraphDirective", []).directive(
    'sportsgraph',
    function factory(league) {
        var directiveObject = {
            restrict: 'E',
            scope : {
                currentYear: '=',
                currentSpeed: '=',
                width: '=',
                height: '='
            },
            link : function(scope, iElement, iAttrs, controller) {
                if (globals.debugF) { console.log("graph directive link called"); }
                var me = scope;
                me.trackThesePlayers = {
                //   1458 : 1
                };

                me.setupCanvas(iElement);
                
                //data should be delivered by a one directional binding with the outerController
                me.$watch(league.haveData, function (haveData) {
                    me.haveData = haveData;
                });
                
                me.$watch('haveData + haveMap', function (n) {
                    if (globals.debugF) { console.log("graph haveData(" + me.haveData + ") + haveMap(" + me.haveMap + ") called"); }
                    if (me.haveData && me.haveMap) {
                        me.assignArenaCoordinates();
                        me.ready = true;
                        me.animateSeason(me.currentYear);
                    }
                });

                me.$watch('currentYear', function (newYear, oldYear) {
                    if (globals.debugF) { console.log(
                        "newYear " + newYear + 
                        " oldYear " + oldYear + 
                        " ready " + me.ready + 
                        " transitionInProgress " + me.transitionInProgress
                    )}
                
                    if (!me.ready || me.transitionInProgress || !newYear || newYear == 'NaN') {
                        return;
                    }
                    else if (!oldYear || oldYear == 'NaN') {
                        scope.animateSeason(newYear);
                    } 
                    else if (newYear != oldYear) {
                        scope.animateSeason(newYear);
                    }
                });
            },
            controller : function($scope, league) {
                if (globals.debugF) { 
                    console.log("in sportsGraphDirective controller init");
                    console.log("controller init width is %s and height is %s", $scope.width, $scope.height);
                } 
 
                var me = $scope;
                
                me.w = me.width;
                me.h = me.height;
                me.fill = d3.scale.category20();
                me.activePlayers = [];
                me.playerLastCoord = {};
                
                ///////////////////////////////////////////////////////////////////////////////
                // Init the svg canvas
                
                me.setupCanvas = function(iElement) {
                    if (globals.debugF) { console.log("graph setupCanvas called"); }
                    
                    me.svg = d3.select('#' + iElement.attr('id')).append("svg")
                        .attr("width", me.w)
                        .attr("height", me.h);
                
                    ///////////////////////////////////////////////////////////////////////////////
                    // Init the map bits
                    ///////////////////////////////////////////////////////////////////////////////
        
                    me.projection = d3.geo.mercator()
                        .center([-100,43])
                        .scale(800);
                    
                    me.path = d3.geo.path()
                        .projection(me.projection);
                    
                    me.force = d3.layout.force()
                        .nodes(me.activePlayers)     
                        .links([])
                        .gravity(0)
                        .size([me.w, me.h]);

                    $.ajax({
                        url: globals.graph.sources.world,
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

                            //add hockey start image if this feature is enabled
                            if (me.haveOriginCoords()) {
                                var startCoords = me.projection([
                                    globals["graph"]["start"]["long"],
                                    globals["graph"]["start"]["lat"]
                                ]);

                                var innerG = me.svg.append("svg:g")
                                    .attr("class","start")
                                    .attr("transform",
                                        "translate(" + startCoords[0] + "," + startCoords[1] + ")");

                                innerG.append("image")
                                      .attr("xlink:href", "images/cradle.png")
                                      .attr("width", 32)
                                      .attr("height", 32);
                                
                                innerG.append("svg:title").text(
                                    "This is where all rookies start from (I dont have their actual home towns but that would be better)!"
                                );
                            }
                        }
                    });
                    
                    me.force.on("tick", function(e) {
                 
                        //XXX: this is not really an appropriate use of force as I am no longer using gravity or alpha   
                        //define variables outside loop to reduce required garbage collection
                        var closeEnough = 0.5;                
                        var xDiff, yDiff;
                        var arenaInfo, id;
                        var minTicksToGetHome = 100;
                        var stillTransitioning = false;
                        var numTransitioned = 0;
                        var playerTransitioned;
                        me.activePlayers.forEach(function(player, i) {

                            playerTransitioned = false;
                            arenaInfo = me.arenas[player.arenaID];
                            id = player.id;
                   
                            var pos = me.playerLastCoord[id];
                            // is player at dst
                            xDiff = pos["dst"][0] - pos["cur"][0];
                            yDiff = pos["dst"][1] - pos["cur"][1];
                            
                            xTotalDiff = pos["dst"][0] - pos["src"][0];
                            yTotalDiff = pos["dst"][1] - pos["src"][1];

                            if (Math.abs(xDiff) > closeEnough || Math.abs(yDiff) > closeEnough) {
                                playerTransitioned = true;
                                pos["cur"][0] += xTotalDiff * ( me.currentSpeed * 0.01 / minTicksToGetHome); 
                                pos["cur"][1] += yTotalDiff * ( me.currentSpeed * 0.01 / minTicksToGetHome); 
                            }
                            
                            if (playerTransitioned) {
                                stillTransitioning = true;
                                numTransitioned++;
                            }
                   
                            // debug feature
                            if (id in me.trackThesePlayers) {
                                if (globals.debugF) { console.log(
                                    "Tracked player %s TeamID %s loc: cur (%f,%f), src (%f,%f), dst (%f, %f)",
                                    id, player.teamID, 
                                    Math.round(me.playerLastCoord[id]["cur"][0]), 
                                    Math.round(me.playerLastCoord[id]["cur"][1]), 
                                    Math.round(me.playerLastCoord[id]["src"][0]), 
                                    Math.round(me.playerLastCoord[id]["src"][1]), 
                                    Math.round(me.playerLastCoord[id]["dst"][0]), 
                                    Math.round(me.playerLastCoord[id]["dst"][1])
                                )};
                            }
                        });
                        if (globals.debugF) { 
                            console.log(
                                "%s tick %d players transitioned", 
                                me.currentYear, 
                                numTransitioned
                            );
                        }

                        //XXX: write xy to playerLastCoord AND activeplayers, only retrieve on miss, save time 
                        me.svg.selectAll("circle.node")
                            .attr("cx", function(d) { return me.playerLastCoord[d.id]["cur"][0]; })
                            .attr("cy", function(d) { return me.playerLastCoord[d.id]["cur"][1]; })
                            .style("fill", function(d) { return me.arenas[d.arenaID].fill; })
                            .style("stroke", function(d) { return d3.rgb(me.arenas[d.arenaID].fill).darker(2); });
                    
                        if (!stillTransitioning || me.tickCount > 1000) {
                            if (globals.debugF) { console.log(
                                "force.stop" +
                                " seasonOver " + me.currentYear +
                                " entered " + me.counts.enter +
                                " exited " + me.counts.exit +
                                " tickCount " + me.tickCount
                            )}
                            me.force.stop();
                            me.transitionInProgress = false;
                            var nextSeason = league.getNextSeason(me.currentYear);
                            if (nextSeason) { 
                                me.currentYear = nextSeason;
                                me.$apply();
                            }
                        }
                        else {
                            //keep the simulation hot!
                            me.force.alpha(0.1);
                            me.tickCount++;
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
                };
                
                me.animateSeason = function(curSeason) {
                    if (globals.debugF) { console.log("Do firstSeason " + curSeason); }
                
                    me.tickCount = 0;
                    me.activePlayers = [];
                    me.force.nodes(me.activePlayers);
                    var roster = league.getRoster(curSeason);

                    for (var teamID in roster) {
                        for (var i = 0; i < roster[teamID].length; i++) {
                            var id = roster[teamID][i];
                            var player = {
                                'id' : id,
                                'fill' : me.arenas[teamID].fill,
                                'teamID'  : teamID,
                                'arenaID' : teamID //XXX: this should be a function of the season and the team
                            };
                
                            // if the player in not in playerLastCoord this is a new player entering league
                            // else it is an existing player
                            if (!(player.id in me.playerLastCoord)) {
    
                                // if there is an initial point specified for entering 
                                // players then use this point.
                                // The visual effect will be that all players emerge from this point
                                // else use a random point
                                var coords = me.getOriginCoords();
                                me.playerLastCoord[player.id] = {
                                    'src' : coords,
                                    'cur' : coords.slice(0),
                                    'dst' : [me.arenas[teamID].cx, me.arenas[teamID].cy]
                                };
                            }
                            else {
                                // i am starting from where I currently am
                                me.playerLastCoord[player.id]["src"] =
                                    me.playerLastCoord[player.id]["cur"].slice(0);
                                // i am moving to the arena of my current team
                                me.playerLastCoord[player.id]["dst"] = 
                                    [me.arenas[teamID].cx, me.arenas[teamID].cy];
                                //XXX: Add some suppress right here to say (NOT TRANSITIONING THIS YEAR)

                            }
                
                            if (id in me.trackThesePlayers) {
                                if (globals.debugF) { console.log(
                                    "Adding tracked player " + id + 
                                    " team ID " + player.teamID + 
                                    " to activePlayers."
                                )}
                            }
                
                            me.activePlayers.push(player);
                        }
                    }
                
                    me.counts = {
                        "enter"  : 0,
                        "exit"   : 0
                    };
                    
                    //node is the selection of players that persisted from one season to the next
                    //node.enter() yeilds arriving players, node.exit() yileds exiting players.
                    // Read the D3 docs and specifically D3 constancy to figure this out:
                    // NB links may get out of date. search "D3 constancy":
                    //  summary: http://bost.ocks.org/mike/constancy/
                    //  source: https://github.com/mbostock/bost.ocks.org/blob/gh-pages/mike/constancy/index.html
                
                    me.force.nodes(me.activePlayers);
                    var node = me.svg.selectAll(".node").data(me.force.nodes(), function(d) { return d.id;});
                
                    node.enter().append("svg:circle")
                        .each( function(d) { 
                            me.counts.enter++;
                            if (d.id in me.trackThesePlayers) {
                                if (globals.debugF) { console.log("Saw player " + d.id + " enter league"); }
                            }
                        })
                        .attr("class", "node")
                        .attr("cx", function(d) { return me.playerLastCoord[d.id]["src"][0]; })
                        .attr("cy", function(d) { return me.playerLastCoord[d.id]["src"][1]; })
                        .attr("r", 5)
                        .style("fill", function(d) { return d.fill; })
                        .style("stroke", function(d) { return d3.rgb(d.fill).darker(2); })
                        .style("stroke-width", 1.5)
                        .append("svg:title").text(function(d) { return d.id });
                        //.call(me.force.drag);
                    
                    node.exit().each( function(d) { 
                        me.counts.exit++;
                        if (d.id in me.trackThesePlayers) {
                            if (globals.debugF) { console.log("Saw player " + d.id + " exit league"); }
                        }
                    }).remove();
                
                    me.force.start();
                    me.transitionInProgress = true;
                
                };

                me.haveOriginCoords = function() {
                    return (
                        typeof(globals["graph"]) != "undefined" && 
                        typeof(globals["graph"]["start"]) != "undefined"
                    );
                };

                me.getOriginCoords = function () {
                    var coords;
                    if (me.haveOriginCoords()) {
                        coords = me.projection([
                            globals.graph.start["long"],
                            globals.graph.start["lat"]
                        ]);
                    }
                    else {
                        coords = [
                            Math.random() * me.w,
                            Math.random() * me.h
                        ];
                    }
                    return coords;
                };
            }
        
        };
        
        return directiveObject;
    }
);


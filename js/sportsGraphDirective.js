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
                   1015 : 1
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
                        me.doFirstSeason(me.currentYear);
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
                        scope.doFirstSeason(newYear);
                    } 
                    else if (newYear != oldYear) {
                        scope.doFirstSeason(newYear);
                    }
                });
            },
            controller : function($scope, league) {
                if (globals.debugF) { console.log("in sportsGraphDirective controller init"); }
               console.log("controller init width is %s and height is %s", $scope.width, $scope.height);   
 
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
                        }
                    });
                    
                    me.force.on("tick", function(e) {
                 
                        //XXX: this is not really an appropriate use of force as I am no longer using gravity or alpha   
                  
                        //define variables outside loop to reduce required garbage collection
                        var closeEnough = 0.05;                
                        var xDiff, yDiff;
                        var arenaInfo, id;
                        var minTicksToGetHome = 30;
                        var stillTransitioning = false;
                        var numTransitioned = 0;
                        var playerTransitioned;
                        me.activePlayers.forEach(function(player, i) {

                            playerTransitioned = false;
                            arenaInfo = me.arenas[player.arenaID];
                            id = player.id;
                    
                            xDiff = arenaInfo.cx - me.playerLastCoord[id].x;
                            if (Math.abs(xDiff) > closeEnough) {
                                playerTransitioned = true;
                                me.playerLastCoord[id].x += xDiff * ( me.currentSpeed * 0.01 / minTicksToGetHome); 
                            }
                            
                            yDiff = arenaInfo.cy - me.playerLastCoord[id].y;
                            if (Math.abs(yDiff) > closeEnough) {
                                playerTransitioned = true;
                                me.playerLastCoord[id].y += yDiff * ( me.currentSpeed * 0.01 / minTicksToGetHome); 
                            }
                            
                            if (playerTransitioned) {
                                stillTransitioning = true;
                                numTransitioned++;
                            }
                   
                            // debug feature
                            if (id in me.trackThesePlayers) {
                                if (globals.debugF) { console.log(
                                    "Tracked player " + id + 
                                    " Team ID " + player.teamID + 
                                    " at " + 
                                    " x: " + Math.round(me.playerLastCoord[id].x) + 
                                    " y: " + Math.round(me.playerLastCoord[id].y) + 
                                    " arena at " + 
                                    " x: " + Math.round(arenaInfo.cx) + 
                                    " y: " + Math.round(arenaInfo.cy)
                                )};
                            }
                        });
                        console.log("%s tick %d players transitioned", me.currentYear, numTransitioned);

                        //XXX: write xy to playerLastCoord AND activeplayers, only retrieve on miss, save time 
                        me.svg.selectAll("circle.node")
                            .attr("cx", function(d) { return me.playerLastCoord[d.id].x; })
                            .attr("cy", function(d) { return me.playerLastCoord[d.id].y; })
                            .style("fill", function(d) { return me.arenas[d.arenaID].fill; })
                            .style("stroke", function(d) { return d3.rgb(me.arenas[d.arenaID].fill).darker(2); });
                    
                        if (!stillTransitioning) {
                            if (globals.debugF) { console.log(
                                "force.stop" +
                                " seasonOver " + me.currentYear +
                                " entered " + me.counts.enter +
                                " exited " + me.counts.exit
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
                
                me.doFirstSeason = function(curSeason) {
                    if (globals.debugF) { console.log("Do firstSeason " + curSeason); }
                
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
                
                            if (!(player.id in me.playerLastCoord)) {
    
                                // if there is an initial point specified for entering 
                                // players then use this point.
                                // The visual effect will be that all players emerge from this point
                                // else use a random point
                                if (typeof(globals["graph"]) != undefined && 
                                    typeof(globals["graph"]["start"]) != undefined) {

                                    var coords = me.projection([
                                        globals.graph.start["long"],
                                        globals.graph.start.lat
                                    ]);
                                    me.playerLastCoord[player.id] = {
                                        'x' : coords[0],
                                        'y' : coords[1]
                                    };
                                }
                                else {
                                    me.playerLastCoord[player.id] = {
                                        'x' : Math.random() * me.w,
                                        'y' : Math.random() * me.h
                                    };
                                }

                            };
                
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
                        .attr("cx", function(d) { return me.playerLastCoord[d.id].x; })
                        .attr("cy", function(d) { return me.playerLastCoord[d.id].y; })
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
            }
        
        };
        
        return directiveObject;
    }
);


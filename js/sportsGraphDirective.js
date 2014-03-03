angular.module("sportsGraphDirective", []).directive(
    'sportsgraph',
    function factory($timeout, league) {
        var directiveObject = {
            restrict: 'E',
            scope : {
                haveData: '=',
                currentYear: '=',
                currentSpeed: '=',
                showRookies: '=',
                showRetirees: '=',
                width: '=',
                height: '='
            },
            link : function(scope, iElement, iAttrs, controller) {
                if (globals.debugF) { 
                    console.log("graph directive link called"); 
                }
                var me = scope;

                me.setupCanvas(iElement);
                
                me.$watch('haveData + haveMap', function (n) {
                    if (globals.debugF) { 
                        console.log(
                            "graph haveData(" + me.haveData + 
                            ") + haveMap(" + me.haveMap + ") called"
                        ); 
                    }

                    if (me.haveData && me.haveMap) {
                        me.assignArenaCoordinates();
                        me.ready = true;
                        me.animateSeason(me.currentYear);
                    }
                });

                me.$watch('currentYear', function (newYear, oldYear) {
                    if (globals.debugF) { 
                        console.log(
                            "newYear " + newYear + 
                            " oldYear " + oldYear + 
                            " ready " + me.ready + 
                            " transitionInProgress " + me.transitionInProgress
                        );
                    }
                
                    if (!me.ready || me.transitionInProgress || 
                        !newYear || newYear == 'NaN') {
                        return;
                    }
                    else if (!oldYear || oldYear == 'NaN') {
                        // Do first season animation
                        scope.animateSeason(newYear);
                    } 
                    else if (newYear != oldYear) {
                        // Do interseason animation
                        scope.animateSeason(newYear);
                    }
                });
            },
            controller : function($scope, league) {
                if (globals.debugF) { 
                    console.log("in sportsGraphDirective controller init");
                } 
 
                var me = $scope;
                
                me.w = me.width;
                me.h = me.height;
                me.closeEnough = 0.5; //XXX: Move to config               
                me.minTicksToGetHome = 50; //XXX: Move to config
                me.activePlayers = [];
                
                // Initialize the svg canvas, map overlay, and force overlay
                //   RETURNS: null
                me.setupCanvas = function(iElement) {
                    if (globals.debugF) { 
                        console.log("graph setupCanvas called"); 
                    }
                   
                    // auto color scheme
                    me.fill = d3.scale.category20();

                    me.svg = d3.select('#' + iElement.attr('id')).append("svg")
                        .attr("width", me.w)
                        .attr("height", me.h);
                
                    ////////////////////////////////
                    // Init the world map components
                    ////////////////////////////////
        
                    me.projection = d3.geo.mercator()
                        .center([-100,42])
                        .scale(800);
                    
                    me.path = d3.geo.path()
                        .projection(me.projection);
                    
                    $.ajax({
                        url: globals.graph.sources.world,
                        async: false,
                        success: function (d) {
                            me.world = d;
                    
                            //add land mass
                            me.svg.insert("path", ".graticule")
                                .datum(topojson.feature(
                                    me.world, me.world.objects.land
                                ))
                                .attr("class", "land")
                                .attr("d", me.path);
                            
                            //add country borders
                            me.svg.insert("path", ".graticule")
                                .datum(topojson.mesh(
                                    me.world, 
                                    me.world.objects.countries, 
                                    function(a, b) { return a !== b; }
                                ))
                                .attr("class", "boundary")
                                .attr("d", me.path);
                    
                            me.haveMap = true;

                            //add hockey start image if this feature is enabled
                            if (me.haveRookieCoords()) {
                                var startCoords = me.projection([
                                    globals["graph"]["start"]["long"],
                                    globals["graph"]["start"]["lat"]
                                ]);

                                var innerG = me.svg.append("svg:g")
                                    .attr("class","start")
                                    .attr("transform",
                                        "translate(" + startCoords[0] + "," + startCoords[1] + ")"
                                    );

                                innerG.append("image")
                                    .attr("xlink:href", "images/cradle.png")
                                    .attr("width", 32)
                                    .attr("height", 32);
                                
                                innerG.append("svg:title").text(
                                    // would be better if I had their hometown
                                    "This is where all rookies start from"
                                );
                            }
                            
                            //add hockey end image if this feature is enabled
                            if (me.haveRetireeCoords()) {
                                var coords = me.projection([
                                    globals["graph"]["end"]["long"],
                                    globals["graph"]["end"]["lat"]
                                ]);

                                var innerG = me.svg.append("svg:g")
                                    .attr("class","end")
                                    .attr("transform",
                                        "translate(" + coords[0] + "," + coords[1] + ")");

                                innerG.append("image")
                                      .attr("xlink:href", "images/golfer1.png")
                                      .attr("width", 32)
                                      .attr("height", 32);
                                
                                innerG.append("svg:title").text(
                                    "This is where all retirees go to play golf"
                                );
                            }
                        }
                    });
                    
                    //////////////////////////////////////////
                    // Init the directed force graph component
                    //////////////////////////////////////////

                    me.force = d3.layout.force()
                        .nodes(me.activePlayers)     
                        .links([])
                        .gravity(0)
                        .size([me.w, me.h]);
                   
                    // Tick is repeatedly called after force.start() is called
                    // until force.stop() is called. In 'tick' we control the 
                    // movement of the player nodes from A to B
                    // XXX: I am not sure if this is not really an appropriate use of force 
                    // as I am no longer using gravity or alpha.
                    // I could just use transitions() to animate movement, but then
                    // I could not control speed. So, if speed feature is removed then
                    // use of force directed layout should also be removed
                    me.force.on("tick", function(e) {
                        
                        me.stillTransitioning = false;
                        me.numTransitioned = 0;
                        me.svg.selectAll("circle.node").each(me.computeNewCoord);
                        if (globals.debugF) { 
                            console.log(
                                "%s tick %d players transitioned", 
                                me.currentYear, 
                                me.numTransitioned
                            );
                        }

                        if (!me.stillTransitioning || me.tickCount > 1000) {
                            if (globals.debugF) { console.log(
                                "force.stop" +
                                " seasonOver " + me.currentYear +
                                " entered " + me.counts.enter +
                                " exited " + me.counts.exit +
                                " tickCount " + me.tickCount
                            )}
                            me.force.stop();
                            me.transitionInProgress = false;

                            var nextSeason = league.getNextSeason(
                                me.currentYear);

                            // if there are more seasons then 
                            // advance the currentSeason after a short delay
                            if (nextSeason) { 
                                var delay = 0;
                                if (typeof(
                                    globals.graph.transitionDelay) != 'undefined'
                                ) {
                                    delay = globals.graph.transitionDelay;
                                }
                                $timeout(function() {
                                    me.currentYear = nextSeason;
                                }, delay);
                            }
                        }
                        else {
                            //keep the simulation hot!
                            me.force.alpha(0.1);
                            me.tickCount++;
                        }
                    });
                };
               
                // translate arena lat,long coordinates
                // to x,y positions and assign a color to this arena
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
                    if (globals.debugF) { 
                        console.log("Do firstSeason " + curSeason); 
                    }
                
                    me.tickCount = 0;
                    me.activePlayers = [];
                    
                    // At the beginning of the new season
                    // record where player ended last season
                    var previousLocations = {};
                    me.svg.selectAll(".node").each( function (d) {
                            previousLocations[d.id] = d.coord["dst"].slice();
                    });

                    var roster = league.getRoster(curSeason);
                    for (var teamID in roster) {
                        for (var i = 0; i < roster[teamID].length; i++) {
                            var id = roster[teamID][i];
                            
                            var curCoords;
                            if (id in previousLocations) {
                                curCoords = previousLocations[id].slice(0);
                            }
                            else {
                                curCoords = me.getRookieCoords(teamID);
                            }

                            var player = {
                                'id' : id,
                                'teamID'  : teamID,
                                //XXX: in true model the arena should be a 
                                // function of the season and the team 
                                // (teams sometimes move)
                                'arenaID' : teamID,
                                'coord' : {
                                    'src' : curCoords,
                                    'cur' : curCoords.slice(0), //clone
                                    'dst' : [
                                        me.arenas[teamID].cx, 
                                        me.arenas[teamID].cy
                                    ]
                                }
                            };
                            
                            if (player['coord']['src'][0] == player['coord']['dst'][0] &&
                                player['coord']['src'][1] == player['coord']['dst'][1]) {
                                player['dormant'] = true;
                            }
                
                            if (id in globals.trackThesePlayers) {
                                if (globals.debugF) { console.log(
                                    "Adding tracked player " + id + 
                                    " team ID " + player.teamID + 
                                    " to activePlayers."
                                )}
                            }
                
                            me.activePlayers.push(player);
                        }
                    }
                    
                    //node is the D3 data join for players.
                    // node.enter() yeilds arriving players, 
                    // node.exit() yields exiting players.
                    // Read the D3 docs and specifically 
                    // D3 constancy to figure this out:
                    // NB links may get out of date. search "D3 constancy":
                    //  summary: http://bost.ocks.org/mike/constancy/
                    //  source: https://github.com/mbostock/bost.ocks.org/blob/gh-pages/mike/constancy/index.html
                    me.counts = { 'enter' : 0, 'exit' : 0 };

                    me.force.nodes(me.activePlayers);
                    var node = me.svg.selectAll(".node").data(
                        me.force.nodes(), 
                        function(d) { return d.id;}
                    );
                
                    node.enter()
                        .append("svg:circle")
                        .each( function(d) {
                            me.counts.enter++;
                            d.rookieSeason = curSeason;
                            if (d.id in globals.trackThesePlayers) {
                                console.log(
                                    "Saw player " + d.id + " enter league"); 
                            }
                        })
                        .attr("class", "node")
                        .attr("cx", function(d) { return d['coord']['src'][0]; })
                        .attr("cy", function(d) { return d['coord']['src'][1]; })
                        .attr("r", 5)
                        .style("stroke-width", 1.5)
                        .append("svg:title").text(function(d) { return d.id });
                   
                    // this is for all rookie and veteran players
                    // update the color as the team may have changed
                    node.style("fill", function(d) { 
                            return me.arenas[d.arenaID].fill; 
                        })
                        .style("stroke", function(d) { 
                            return d3.rgb(
                                me.arenas[d.arenaID].fill).darker(2); 
                        });

                    // this is for all retirees
                    node.exit().each( function(d) { 
                        me.counts.exit++;
                        if (d.id in globals.trackThesePlayers) {
                            console.log("Saw player " + d.id + " exit league"); 
                        }
                    }).remove();
                
                    me.force.start();
                    me.transitionInProgress = true;
                
                };
                
                // For both Rookie and Retiree funtions:
                // Determine the coordinates for a rookie to start from
                // Three options:
                //   a) if me.showRookies is false then start the rookie at their
                //      team arena so there is no transition 
                //   a) if me.showRookies is true and globals.graph.start is defined,
                //      then use globals.graph.start as the 'hockey origin' of all rookies
                //   c) if me.showRookies is true and globals.graph.start is not defined use
                //      a random set of coordinates 
                //      XXX:alternatively detect this condition and error on init

                // See Rookie and Retiree description above
                //   RETURNS : boolean
                me.haveRookieCoords = function() {
                    return (
                        typeof(globals["graph"]) != "undefined" && 
                        typeof(globals["graph"]["start"]) != "undefined"
                    );
                };
                
                // See Rookie and Retiree description above
                //   RETURNS : boolean
                me.haveRetireeCoords = function() {
                    return (
                        typeof(globals["graph"]) != "undefined" && 
                        typeof(globals["graph"]["end"]) != "undefined"
                    );
                };

                // See Rookie and Retiree description above
                //   RETURNS: array containing [x,y]
                me.getRookieCoords = function (teamID) {
                    var coords;
                    if (!me.showRookies) {
                        coords = [me.arenas[teamID].cx, me.arenas[teamID].cy];
                    }
                    else if (me.haveRookieCoords()) {
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
                
                // See Rookie and Retiree description above
                //   RETURNS: array containing [x,y]
                me.getRetireeCoords = function (teamID) {
                    var coords;
                    if (!me.showRetirees) {
                        coords = [me.arenas[teamID].cx, me.arenas[teamID].cy];
                    }
                    else if (me.haveRetireeCoords()) {
                        coords = me.projection([
                            globals.graph["end"]["long"],
                            globals.graph["end"]["lat"]
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

                me.computeNewCoord = function (d) {
                    if (!d['dormant']) {
                        var pos = d['coord'];
                        var xDiff = Math.abs(pos["dst"][0] - pos["cur"][0]);
                        var yDiff = Math.abs(pos["dst"][1] - pos["cur"][1]);
                        
                        var xTotalDiff = pos["dst"][0] - pos["src"][0];
                        var yTotalDiff = pos["dst"][1] - pos["src"][1];
        
                        var overShotTheMark = me.detectOverShoot(pos);
        
                        if (
                            (xDiff > me.closeEnough || yDiff > me.closeEnough) 
                            && !overShotTheMark
                        ) {
                            me.stillTransitioning = true;
                            me.numTransitioned++;
                            pos["cur"][0] += xTotalDiff * 
                                (me.currentSpeed * 0.01 / me.minTicksToGetHome); 
                            pos["cur"][1] += yTotalDiff * 
                                (me.currentSpeed * 0.01 / me.minTicksToGetHome); 
                        }
                        else {
                            pos["cur"] = pos["dst"].slice(0);
                        }
        
                        this.setAttribute('cx', pos["cur"][0]);
                        this.setAttribute('cy', pos["cur"][1]);
        
                        // debug feature
                        if (d.id in globals.trackThesePlayers) {
                            if (globals.debugF) { console.log(
                                "Tracked player %s TeamID %s loc: cur (%f,%f), src (%f,%f), dst (%f, %f)",
                                d.id, d.teamID, 
                                Math.round(pos["cur"][0]), 
                                Math.round(pos["cur"][1]), 
                                Math.round(pos["src"][0]), 
                                Math.round(pos["src"][1]), 
                                Math.round(pos["dst"][0]), 
                                Math.round(pos["dst"][1])
                            )};
                        }
                    }
                }

                // When the user adjusts the speed mid simulation 
                // players sometimes 'over shoot the mark',
                // as in they pass destination and never stop
                // this guards against this condition.
                //   RETURNS: boolean

                // XXX: This is UUUUGLY!
                // Alternative: if I use src and dst as corners 
                // of a rectangle this is simply a 'contains'
                // calculation ...
                me.detectOverShoot = function (pos) {
                    var overShotTheMark = false;

                    // check for overshoot in x and y (element 0 and 1)
                    for (var i = 0; i < 2; i++) {
                        var cur = pos["cur"][i];

                        // if cur is on either side of both src and dst
                        if (
                            (pos["src"][i] < cur && pos["dst"][i] < cur) || 
                            (pos["src"][i] > cur && pos["dst"][i] > cur)
                        ) {
                            overShotTheMark = true;
                        }
                    }
                    return overShotTheMark;
                }
            }
        
        };
        
        return directiveObject;
    }
);


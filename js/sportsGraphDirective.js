angular.module("sportsGraphDirective", []).directive(
    'sportsgraph',
    function factory($timeout, league) {
        var directiveObject = {
            restrict: 'E',
            scope : {
                initCallBack: '&onInit',
                go: '=',
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
               
                //loading dependencies are controlled here via multiple watch(s)
                
                // The $watch stmts below dont work with league.haveData,
                // so make a local to monitor 
                me.$watch(league.haveData, function (n) {
                    if (globals.debugF) { 
                        console.log("watch league haveData ", n); 
                    }
                    if (n) {
                        me.haveData = true;
                    }
                });
                
                // 1) once we have league and map data we can 
                //   -load static images and calc x,y of our arenas (our destination)
                me.$watch('haveData && haveMap', function (n) {
                    if (globals.debugF) { 
                        console.log(
                            "graph haveData(" + me.haveData + 
                            ") + haveMap(" + me.haveMap + ") called"
                        ); 
                    }

                    if (me.haveData && me.haveMap) {

                        //this will start loading logos and 
                        // set logosLoaded=true once all async calls complete
                        me.assignArenaCoordinates();
                        me.ready = true;
                    }
                });

                // 2) once we have league, map data, and static images loaded
                //    we are ready, but wait for external signal to begin 
                me.$watch('haveData && haveMap && logosLoaded', function (n) {
                    if (globals.debugF) { 
                        console.log(
                            "graph haveData(" + me.haveData + 
                            ") + haveMap(" + me.haveMap + 
                            ") + logosLoaded(" + me.logosLoaded + ") called"
                        ); 
                    }
                    if (me.haveData && me.haveMap && me.logosLoaded) {
                        me.ready = true;

                        //the init call back signals readiness to outercontroller
                        // when outer controller is ready, it will set 'go'
                        me.initCallBack();
                    }
                });

                // 3) If we are ready, When we get the signal to go, then go
                me.$watch('ready && go', function (n) {
                    if (globals.debugF) { 
                        console.log(
                            "ready(" + me.ready + ") + go(" + me.go + ") called"
                        ); 
                    }

                    if (me.ready && me.go) {
                        me.minSeason = parseInt(league.getMinSeason());
                        me.maxSeason = parseInt(league.getMaxSeason());
                        me.currentYear = me.minSeason;

                    }
                });

                // 4) As soon as the season is set, the animation begins
                // When year X is complete, the year is incremented and this 
                // watch restarts the animation for the next year
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
                        me.animateSeason(newYear);
                    } 
                    else if (newYear != oldYear) {
                        // Do interseason animation
                        me.animateSeason(newYear);
                    }
                });
            },
            controller : function($scope, league) {
                if (globals.debugF) { 
                    console.log("in sportsGraphDirective controller init");
                } 
 
                var me = $scope;
                
                me.ready = false; // haveData && me.haveMap && me.logosLoaded
                me.haveData = false;
                me.haveMap = false;
                me.logosLoaded = false;
                
                me.w = me.width;
                me.h = me.height;
                me.closeEnough = 0.5; //XXX: Move to config               
                me.minTicksToGetHome = 50; //XXX: Move to config
                me.activePlayers = [];
                me.previousLocations = {};
                me.loadedLogosCount = 0;

                
                // Initialize the svg canvas, map overlay, and force overlay
                //   RETURNS: null
                me.setupCanvas = function(iElement) {
                    if (globals.debugF) { 
                        console.log("graph setupCanvas called"); 
                    }
                  
                    // create the outer svg canvas
                    me.svg = d3.select('#' + iElement.attr('id')).append("svg")
                        .attr("width", me.w)
                        .attr("height", me.h);
                
                    ////////////////////////////////
                    // Init the world map components
                    ////////////////////////////////
        
                    // XXX: TODO: this will be calc based on screen size
                    //  Actually fairly complex to do so.
                    // google for (stackoverflow articles):
                    // -d3js-cartography-auto-focus-on-geographic-area-svg-canvas-zoom-scale-coord
                    // -center-a-map-in-d3-given-a-geojson-object 

                    me.projection = d3.geo.mercator()
                        .center([-100,42])
                        .scale(800);
                    
                    me.path = d3.geo.path()
                        .projection(me.projection);
                    
                    $.ajax({
                        url: globals.sources.world,
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
                                    me.world, me.world.objects.countries, 
                                    function(a, b) { return a !== b; }
                                ))
                                .attr("class", "boundary")
                                .attr("d", me.path);
                   
                            // signal that map load is complete
                            me.haveMap = true;

                            //add hockey start image if this feature is enabled
                            if (me.haveRookieCoords()) {
                                me.addImage(
                                    globals.start.image,
                                    me.getRookieCoords(),
                                    globals.image.arena_size,
                                    "This is where all rookies start from",
                                    "logo"
                                );
                            }
                            
                            //add hockey end image if this feature is enabled
                            if (me.haveRetireeCoords()) {
                                me.addImage(
                                    globals.end.image,
                                    me.getRetireeCoords(),
                                    globals.image.arena_size,
                                    "This is where all retirees go to play golf",
                                    "logo"
                                );
                            }
                        }
                        // XXX: TODO: Add failure handler
                    });
                    
                    //////////////////////////////////////////
                    // Init the directed force graph component
                    //////////////////////////////////////////

                    me.force = d3.layout.force()
                        .nodes(me.activePlayers)     
                        .links([])
                        .gravity(0)
                        .size([me.w, me.h]);
                     
                    // Register the 'on tick' handler. tick is repeatedly 
                    // called after force.start() is called until force.stop()
                    // is called. In 'tick' we control the movement of the 
                    // player nodes from A to B
                    me.force.on("tick", me.tick);
                    
                };

                // Tick is repeatedly called after force.start() is called
                // until force.stop() is called. In 'tick' we control the 
                // movement of the player nodes from A to B
                // NB - design note: I am not sure if this is not really 
                // an appropriate use of force 
                // as I am no longer using gravity or alpha.
                // I could just use transitions() to animate movement, but then
                // I could not control speed. So, if speed feature is removed then
                // use of force directed layout should also be removed
                //   RETURNS: null
                me.tick = function() {
                    
                    me.stillTransitioning = false;
                    me.numTransitioned = 0;

                    // compute the new coordinates of the players,
                    // and set stillTransitioning to (true/false)
                    me.svg.selectAll(".player").each(me.computeNewCoord);
                    if (globals.debugF) { 
                        console.log(
                            "%s tick %d players transitioned", 
                            me.currentYear, 
                            me.numTransitioned
                        );
                    }

                    // terminate this season animation,
                    // or keep animating
                    if (!me.stillTransitioning || me.tickCount > 1000) {
                        if (globals.debugF) { console.log(
                            "force.stop" +
                            " seasonOver " + me.currentYear +
                            " entered " + me.counts.enter +
                            " updated " + me.counts.update +
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
                                globals.transitionDelay) != 'undefined'
                            ) {
                                delay = globals.transitionDelay;
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
                };
               
                // translate arena lat,long coordinates
                // to x,y positions and load logos images for each arena
                //   RETURNS: null
                me.assignArenaCoordinates = function() { 
                    if (globals.debugF) { 
                        console.log("graph assignArenaCoords called"); 
                    }
                    me.arenas = league.getArenas();
                    me.arenaCount = Object.keys(me.arenas).length;
                    me.teams = league.getTeams();

                    // this code makes more sense after reading the for below
                    // -NB it is rumored on stackoverflow that if an 
                    // image is cached in browser the onload does not 
                    // always fire. This timeout defends against that condition
                    me.loadLogoTimeoutID = $timeout( function () {
                        if (globals.debugF) { console.log("in logo timeout"); }
                        me.logosLoaded = true;
                    }, 3000);
                

                    for (var arenaID in me.arenas) {
                        var arena = me.arenas[arenaID];
                        var coords = me.projection([arena['longitude'], arena['latitude']]);
                        arena.cx = coords[0];
                        arena.cy = coords[1];
                        arena.player = false; // optimization to speed sorting

                        // XXX: This doesn't work with full data model
                        // where teams move year to year etc.
                        arena.team = me.teams[arena.team_id];
                        
                        // This is a dirty hack to avoid z-position flickering
                        // Wothout these static logos, there is one copy of
                        // the logo, controlled by D3, and all the player icons,
                        // controlled by D3. I always want arena logos on top.
                        // To do so, once a season I must reorder all the new 
                        // SVG elements (i.e., rookie players) to be before 
                        // (i.e., under) the arena logos.
                        // But the sort manipulates the DOM causing a flicker 
                        // where the logo briefly dissappears. 
                        // So the dirty hack here is to draw the logo again,
                        // and this copy of the logo is not sorted. 
                        // When the flicker occurs this logo is still here.
                        // So visually no flicker. Terrible ?
                        if ('logo' in arena.team) {
                            var img = me.addImage(
                                arena.team.logo,
                                coords,
                                // make it smaller so it gives a little pulse
                                0.8 * globals.image.arena_size, 
                                arena.arena_name,
                                "logo static-logo"

                            );

                            //set logosLoaded when all logos are loaded.
                            img.attr('onload', function() {
                                me.loadedLogosCount++;
                                if (globals.debugF) { 
                                    console.log( 
                                        "In image onload, total is ", 
                                        me.loadedLogosCount
                                    ); 
                                }
                                if (me.loadedLogosCount >= me.arenaCount) {
                                    $timeout.cancel(me.loadLogoTimeoutID);
                                    me.logosLoaded = true;
                                }
                            })
                        }
                        //XXX: TODO use default image if no image present
                    }

                };
                
                // compute new player destinations.
                // Compute the D3 data join for (new,update,remove)
                // which in this domain translates into (rookies,veterans,retirees)
                // Also deal with D3 controlled arena icons on first call
                // Finally call sort so the arenas are visually on top
                //   RETURNS: null
                me.animateSeason = function(curSeason) {
                    if (globals.debugF) { console.log("animate " + curSeason); }
                
                    // before getting the new data, perform 
                    // an update on the veterans
                    // and record their current locations
                    me.previousLocations = {};
                    me.svg.selectAll(".player")
                        // drop z-sortable (the sort is only necessary once on entry)
                        .attr("class","player") 
                        // use the previous season team logo
                        // this shows where the player is coming from, 
                        // not where he is going 
                        // (this has a much better visual effect)
                        .attr("xlink:href", function(d) {
                            var team = me.teams[d.team_id];
                            return team.logo;
                        })
                        .each( function (d) {
                            me.counts.update++;
                            // At the beginning of the new season
                            // record where player ended last season
                            me.previousLocations[d.id] = d.coord["dst"].slice();
                        });

                    // Now get the new roster and generate the list of active
                    // players
                    me.activePlayers = [];
                    var roster = league.getRoster(curSeason);
                    var player_size = globals.image.player_size;
                    for (var teamID in roster) {
                        for (var i = 0; i < roster[teamID].length; i++) {
                            var id = roster[teamID][i];
                            
                            var curCoords;
                            if (id in me.previousLocations) {
                                curCoords = me.previousLocations[id].slice(0);
                            }
                            else {
                                curCoords = me.getRookieCoords(teamID);
                            }

                            var playerData = {
                                'id' : id,
                                'player' : true, // optimization to speed sorting
                                'team_id'  : teamID,
                                //XXX: in true model the arena should be a 
                                // function of the season and the team 
                                // (teams sometimes move)
                                'arena_id' : teamID,
                                'coord' : {
                                    'src' : curCoords,
                                    'cur' : curCoords.slice(0), //clone
                                    'dst' : [
                                        me.arenas[teamID].cx - player_size/2, 
                                        me.arenas[teamID].cy - player_size/2
                                    ]
                                }
                            };
                            
                            if (playerData['coord']['src'][0] == playerData['coord']['dst'][0] &&
                                playerData['coord']['src'][1] == playerData['coord']['dst'][1]) {
                                playerData['dormant'] = true;
                            }
                
                            if (id in globals.trackThesePlayers) {
                                if (globals.debugF) { console.log(
                                    "Adding tracked playerData " + id + 
                                    " team ID " + playerData.teamID + 
                                    " to activePlayers."
                                )}
                            }
                
                            me.activePlayers.push(playerData);
                        }
                    }
                    
                    //player is the D3 data join for players.
                    // player.enter() yeilds arriving players, 
                    // player.exit() yields exiting players.
                    // Read the D3 docs and specifically 
                    // D3 constancy to figure this out:
                    // NB links may get out of date. search "D3 constancy":
                    //  summary: http://bost.ocks.org/mike/constancy/
                    //  source: https://github.com/mbostock/bost.ocks.org/blob/gh-pages/mike/constancy/index.html
                    me.counts = { 'enter' : 0, 'exit' : 0, 'update' : 0 };

                    me.force.nodes(me.activePlayers);
                    var player = me.svg.selectAll(".player").data(
                        me.force.nodes(), 
                        function(d) { return d.id;}
                    );
                   
                    // add rookies
                    player.enter()
                        .append("image")
                        .each( function(d) {
                            me.counts.enter++;
                            d.rookieSeason = curSeason;
                            if (d.id in globals.trackThesePlayers) {
                                console.log(
                                    "Saw player " + d.id + " enter league"); 
                            }
                        })
                        // set z-sortable on entry so player is sorted 'under' arena icons
                        .attr("class", "player z-sortable")
                        .attr("x", function(d) { return d['coord']['src'][0]; })
                        .attr("y", function(d) { return d['coord']['src'][1]; })
                        .attr("width", globals.image.player_size )
                        .attr("height", globals.image.player_size )
                        .attr("xlink:href", function(d) {
                            var team = me.teams[d.team_id];
                            return team.logo;
                        })
                        .append("svg:title").text(function(d) { return d.id })
                    
                    // remove retirees
                    var playerExit = player.exit().each( function(d) {
                        me.counts.exit++;
                        if (d.id in globals.trackThesePlayers) {
                            console.log("Saw player " + d.id + " exit league"); 
                        }
                    });
                   
                    // get all the arenas (they are controlled by D3 as well,
                    // so that i can sort them
                    var arena = me.svg.selectAll(".arena").data(
                        // inline equiv of me.arenas.values() 
                        Object.keys(me.arenas).map(function(arena_id){
                            return me.arenas[arena_id];
                        }),
                        function(d) { return d.arena_id;}
                    );

                    // add new arenas (this is done first season only)
                    var arenaEnter = arena.enter()
                        .append("svg:g")
                        // arenas need z-sortable so they can be sorted 'over' 
                        // new arriving players
                        .attr("class","arena z-sortable")
                        .attr("transform", function (d) {
                            var size = globals.image.arena_size;
                            return "translate(" + (d.cx - size/2) + "," + (d.cy - size/2) + ")";
                        });

                    arenaEnter.append("image")
                        .attr("xlink:href", function(d) {
                            team = me.teams[d.team_id];
                            return team.logo;
                            //XXX: Handle default here
                        })
                        .attr("width", function(d) { return globals.image.arena_size; })
                        .attr("height", function(d) { return globals.image.arena_size; });
                    
                    arenaEnter.append("svg:title")
                        .text(function(d) { return d.arena_name; });

                    // put the arenas on top of the entering rookies
                    me.sortNodes(); // this ensures correct z ordering

                    // if there are retiring players and showRetirees is enabled
                    // then animate the exit of the retirees and THEN start 
                    // the normal season simulation
                    // if showRetirees is disabled, we just remove the retirees
                    // with no animation
                    if (me.showRetirees && me.counts.exit) {
                        var activeExits = me.counts.exit;
                        var coords = me.getRetireeCoords();
                        playerExit.transition()
                            .ease('linear') 
                            // make it so at full speed it takes ~ 2 seconds 
                            .duration(200000 / me.currentSpeed) 
                            .attr("transform", function(d) {
                                var moveX = coords[0] - d['coord']['cur'][0];
                                var moveY = coords[1] - d['coord']['cur'][1];
                                return "translate(" + moveX + "," + moveY + ")";
                            })
                            .each("end", function (transition) {
                                --activeExits;
                                if (activeExits < 1) {
                                    me.tickCount = 0;
                                    me.force.start();
                                    me.transitionInProgress = true;
                                }
                            })
                            .remove();
                    }
                    else {
                        playerExit.remove();
                        me.tickCount = 0;
                        me.force.start();
                        me.transitionInProgress = true;
                    }
                };
              
                //XXX: TODO  I cannot get this to stop flickering
                // see dirty hack workaround above (i draw the images twice)
                // Why 'sort' ?
                // SVG does not support z-index attribute (controlling what 
                // goes on top) instead it relies on a 'last goes on top' 
                // based on the ordering of elements in the DOM D3 provides 
                // an ordering function which will rearrange DOM ordering. 
                // We want arenas on top and players on bottom
                //   RETURNS: NULL
                me.sortNodes = function () {
                    me.svg.selectAll(".z-sortable").sort( function (a,b) {
                        if (a.player) { return -1; }
                        if (b.player) { return 1; }
                        return 0;
                    });
                };

                // For both Rookie and Retiree funtions:
                // Determine the coordinates for a rookie to start from
                // Three options:
                //   a) if me.showRookies is false then start the rookie at their
                //      team arena so there is no transition 
                //   a) if me.showRookies is true and globals.start is defined,
                //      then use globals.start as the 'hockey origin' of all rookies
                //   c) if me.showRookies is true and globals.start is not defined use
                //      a random set of coordinates 
                //      XXX:alternatively detect this condition and error on init

                // See Rookie and Retiree description above
                //   RETURNS : boolean
                me.haveRookieCoords = function() {
                    return (
                        typeof(globals.start) != "undefined"
                    );
                };
                
                // See Rookie and Retiree description above
                //   RETURNS : boolean
                me.haveRetireeCoords = function() {
                    return (
                        typeof(globals["end"]) != "undefined"
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
                            globals.start["long"],
                            globals.start["lat"]
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
                            globals["end"]["long"],
                            globals["end"]["lat"]
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

                // This function is called in the force.tick
                // Given the simulation speed, and the 
                // src location, current, location, and destination
                // compute the next position of the player
                // d is the player object (the d3 data part of the data join)
                //   RETURNS: NULL
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
        
                        this.setAttribute('x', pos["cur"][0]);
                        this.setAttribute('y', pos["cur"][1]);
        
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

                // wrapper function to add an svg:image to the canvas
                // RETURNS: the svg:image object (kind of)
                me.addImage = function (src, coords, size, title, classString) {

                    var innerG = me.svg.append("svg:g")
                        .attr("class",classString)
                        .attr("transform",
                            "translate(" + (coords[0] - size/2) + "," + (coords[1] - size/2) + ")"
                        );

                    var img = innerG.append("image")
                        .attr("xlink:href", src)
                        .attr("width", size)
                        .attr("height", size);
                    
                    innerG.append("svg:title").text(title);

                    return img;
                }
            }
        
        };
        
        return directiveObject;
    }
);


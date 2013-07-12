
var w = 1024,
    h = 800,
    fill = d3.scale.category20();


var svg = d3.select("body").append("svg")
    .attr("width", w)
    .attr("height", h);

///////////////////////////////////////////////////////////////////////////////
// Init the map bits

var projection = d3.geo.mercator()
    .center([-100,45])
    .scale(850);

var path = d3.geo.path()
    .projection(projection);

var world;
$.ajax({
    url: "/data/world-50m.json",
    async: false,
    success: function (d) {
        world = d;

        //add land mass
        svg.insert("path", ".graticule")
            .datum(topojson.feature(world, world.objects.land))
            .attr("class", "land")
            .attr("d", path);
        
        //add country borders
        svg.insert("path", ".graticule")
            .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
            .attr("class", "boundary")
            .attr("d", path);
    }
});

///////////////////////////////////////////////////////////////////////////////
// Init the hockey data bits

var data;
$.ajax({
    url: "/data/player_to_team.json",
    async: false,
    success: function (d) {
        data = d;
    }
});

var arenaLocations;
var i = 0;
$.ajax({
    url: "/data/arenas.json",
    async: false,
    success: function (d) {
        arenaLocations = d;

        for (teamName in arenaLocations) {
            var arenaInfo = arenaLocations[teamName];
            var coords = projection([arenaInfo['long'], arenaInfo['lat']]);
            arenaInfo.cx = coords[0];
            arenaInfo.cy = coords[1];
            arenaInfo.id = i;
            arenaInfo.fill = fill(i);
            i++;
        };
    }
});
console.dir(arenaLocations);

var players = {};
var j = 0;
$(data.player_team).each(function(i,player_team) {
    if (players[player_team.player]) {
        return;
    }
    player_team.id = j;
    player_team.fill = arenaLocations[player_team.team].fill;
    player_team.x = Math.random() * w;
    player_team.y = Math.random() * h;
    players[player_team.player] = j;
    j++;
});

///////////////////////////////////////////////////////////////////////////////
// Init the force simulation

var force = d3.layout.force()
    .links([])
    .gravity(0)
    .size([w, h]);

var missedPlayers = {};
var missedTeams = {};
force.on("tick", function(e) {

    console.log("in tick e.alpha is %s", e.alpha);

    var k = 1.5 * e.alpha;
    if (k > 1) { k = 1; }

    data.player_team.forEach(function(o, i) {
        if (!(o.team in arenaLocations)) {
            console.log("%s for team %s has no arenaInfo",
                o.name, o.team
            );
            return;
        }

        var arenaInfo = arenaLocations[o.team];

        o.x += (arenaInfo.cx - o.x) * k; 
        o.y += (arenaInfo.cy - o.y) * k; 
    });

    svg.selectAll("circle.node")
        .attr("cx", function(d) { 
            if (isNaN(d.x)) { 
                missedPlayers[d.player]++; 
                missedTeams[d.team]++; 
                return arenaLocations["Calgary Flames"].cx 
            }
            else {
                return d.x; 
            }
        })
        .attr("cy", function(d) {
            if (isNaN(d.y)) { 
                return arenaLocations["Calgary Flames"].cy 
            }
            else {
                return d.y; 
            }
        });

    if (e.alpha < 0.075) {
        console.log("force.stop");
        force.stop();
    }
});

force.start();

svg.selectAll("circle.node")
    .data(data.player_team)
    .enter().append("svg:circle")
      .attr("class", "node")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", 5)
      .style("fill", function(d) { return d.fill; })
      .style("stroke", function(d) { return d3.rgb(d.fill).darker(2); })
      .style("stroke-width", 1.5)
      .call(force.drag);



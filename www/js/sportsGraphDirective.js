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

                scope.w = 1024;
                scope.h = 800;

                console.dir(scope);

                setupCanvas(iElement, w, h);
                
                //XXX: you are here
                //data should be delivered by a one directional binding with the outerController
                scope.$watch(league.haveData, function (haveData) {
                    scope.haveData = haveData;
                    if (!haveData) {
                        return;
                    }
                }

                scope.$watch('currentYear', function (newYear, oldYear) {
                    debug.debug("newYear " + newYear + " oldYear " + oldYear);
                   
                    if (!newYear || newYear == 'NaN') {
                        return;
                    }

                    if (!oldYear || oldYear == 'NaN') {
                        doFirstYear();
                    } 
                    else if (newYear != oldYear) {
                        doTransition()
                    }
                });
            }
        };

        ///////////////////////////////////////////////////////////////////////////////
        // Init the svg canvas

        setupCanvas = function(iElement, w, h) {
            var fill = d3.scale.category20();
            
            var svg = d3.select('#' + iElement.attr('id')).append("svg")
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
                        
        }

        doFirstYear = function() {
            debug.debug("Do firstYear");
        };
        
        doTransition = function() {
            debug.debug("Do transition");
        }

        return directiveObject;
    }
);

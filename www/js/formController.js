//function formController($scope, league) {
//    debug.debug("formController Init called");
//
//    $scope.available = false;
//
//    $scope.$watch(league.haveData, function(new) {
//        debug.debug("In formController watch haveData");
//    });
//}
//<div ng-controller="formController">
//<p>
//  <label for="amount">Donation amount ($50 increments):</label>
//  <input type="text" id="amount" style="border: 0; color: #f6931f; font-weight: bold;" />
//</p>
//<div id="slider"></div>
//</div>


angular.module("sliderDirective", []).directive(
    'leagueSlider',
    function factory($timeout, league) {

        var directiveObject = {
            controller : ['$scope', '$element', '$attrs', '$transclude', function($scope, $element, $attrs, $transclude) {
                $scope.$watch(league.haveData, function(new) {
                    debug.debug("In formController watch haveData");
                    $element.find('#slider');
                    sliderDiv.slider({
                      value:100,
                      min: 0,
                      max: 500,
                      step: 50,
                      slide: function( event, ui ) {
                        //$( "#amount" ).val( "$" + ui.value );
                      }
                    });
                });

            }],
            link : function(scope, iElement, iAttrs, controller) {

                var sliderDiv = $('<div>').attr('id','slider');
                sliderDiv.appendTo(iElement);
                //$( "#amount" ).val( "$" + $( "#slider" ).slider( "value" ) );
            }
        };

        return directiveObject;
    }
);


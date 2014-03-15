function outerController($scope, $timeout, $modal, league) {
    if (globals.debugF) { console.log("outerController Init called"); }

    $scope.currentSpeed = 100;

    $scope.go = false; // signal to all directives to proceed
    $scope.showRookies = true;
    $scope.showRetirees = true; 

    // the sportgrah directive calls this when it has
    // complete its initialization sequence
    $scope.startSimulation = function() {
        if (globals.debugF) { console.log("In outerController startSimulation"); }

        var delay = 0;
        if (typeof(globals.initialLoadDelay) != 'undefined') {
            delay = globals.initialLoadDelay;
        }
        $timeout(function() {
            $scope.go = true;
            //$scope.loading.close();
        }, delay);
    };
  
    $scope.displayLoading = function () {
        $scope.loading = $modal.open({
            templateUrl: 'loading.html',
            backdrop: false
        });
    };
    
    // XXX: TODO Modals not yet ready
    // start off with the loading modal presented
    //$scope.displayLoading();
}

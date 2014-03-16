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

        // on github.io I am seeing a delay while 
        // images are loading. I attempt to address this by hooking
        // SVGImageElement.onload, but it appears that these
        // events fire before the image is actually loaded.
        // Until this is resolved add an artificial delay at begin of sim.
        var delay = 0;
        if (typeof(globals.initialLoadDelay) != 'undefined') {
            delay = globals.initialLoadDelay;
        }
        $timeout(function() {
            $scope.go = true;
            //XXX: TODO Modals not ready yet
            //$scope.loading.close();
        }, delay);
    };

    $scope.endSimulation = function() {
      //XXX: TODO Modals not ready yet
      //$scope.finished = $modal.open({
      //    template: '<img src="images/fin_500.jpg"></img>',
      //    backdrop: false
      //});
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

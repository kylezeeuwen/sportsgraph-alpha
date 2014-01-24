function outerController($scope, league) {
    if (globals.debugF) { console.log("outerController Init called"); }

    $scope.available = false;
    $scope.haveData = false;
    $scope.stop = false;

    $scope.toggleStop = function() {
        if ($scope.stop) { $scope.stop = false; }
        else { $scope.stop = true; }
        if (globals.debugF) { console.log("In outerController toggleStop newValue: " + $scope.stop); }
    }

    $scope.$watch('stop', function(newValue) {
    });

    $scope.$watch(league.haveData, function(haveData) {
        if (globals.debugF) { console.log("In outerController watch haveData:" + haveData); }
        if (haveData) {

            $scope.minSeason = parseInt(league.getMinSeason());
            $scope.maxSeason = parseInt(league.getMaxSeason());
            $scope.currentYear = $scope.minSeason;
            $scope.available = true;
            $scope.haveData  = true;
        }
    });
}

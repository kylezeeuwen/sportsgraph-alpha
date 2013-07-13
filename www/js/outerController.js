function outerController($scope, league) {
    debug.debug("outerController Init called");

    $scope.available = false;
    $scope.haveData = false;

    $scope.$watch(league.haveData, function(haveData) {
        debug.debug("In outerController watch haveData");
        if (haveData) {

            $scope.minSeason = parseInt(league.getMinSeason());
            $scope.maxSeason = parseInt(league.getMaxSeason());
            $scope.currentYear = $scope.minSeason;
            $scope.available = true;
            $scope.haveData  = true;
        }
    });
}

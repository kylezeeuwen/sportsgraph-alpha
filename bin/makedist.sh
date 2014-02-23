Bin=$(dirname -- $(readlink -f -- $0))
tar zcvf $Bin/../dist/sportsgraph-www.tar.gz $Bin/../www

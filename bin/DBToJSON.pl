#!/usr/bin/perl

use strict;
use warnings;

use Data::Dump qw(dump);
use DBI;
use JSON qw(encode_json);
use Getopt::Long;

my $outFile = "/home/dev/projects/sportgraph/data/league.json";
my $dsn = "dbi:mysql:database=nhl;host=localhost;port=3306";
my $user = "nhl";
my $pass = "nhl";

my $dbh = DBI->connect($dsn,$user,$pass, { RaiseError => 1, AutoCommit => 1 });

my $json = {
    seasons => $dbh->selectcol_arrayref(q{SELECT DISTINCT(season) FROM roster }),
    roster  => make_roster(),
    players => $dbh->selectall_hashref(q{SELECT * FROM player}, ['player_id']),
    arenas  => $dbh->selectall_hashref(q{SELECT * FROM arena}, ['team_id']), #XXX: Data model limitation
    teams   => $dbh->selectall_hashref(q{SELECT * FROM team}, ['team_id']),
};

open my $fh, '>', $outFile or die $!;
print $fh encode_json($json);
close $fh or die $!;

printf "Wrote league data to $outFile\n";

sub make_roster {
    my $roster = $dbh->selectall_hashref(q{
        SELECT season, team_id, GROUP_CONCAT(player_id) AS players FROM roster GROUP BY season, team_id
    }, ['season','team_id'], { Slice => {} });

    for my $season (sort keys %$roster) {
        for my $team_id (sort keys %{$roster->{$season}}) {
            $roster->{$season}{$team_id} = [ split(/,/, $roster->{$season}{$team_id}{players}) ];
        }
    }

    return $roster;
}

queue()
    .defer(d3.csv, "data/pokemon.csv")
    .await(genGraph);

function genGraph(error, pokemonData) {
    var ndx = crossfilter(pokemonData);
    pokemonData.forEach(function(d) {
        d.raids = parseInt(d.raids);
        d.months_joined = parseInt(d["months_joined"]);
        d.age = parseInt(d.age)
    });
    show_team_selector(ndx);
    show_percent_that_are_instinct(ndx, "Male", "#percentage-of-male-instinct");
    show_percent_that_are_instinct(ndx, "Female", "#percentage-of-female-instinct");
    show_gender_trainers(ndx);
    show_pokemon_raiders(ndx);
    show_team_distribution(ndx);
    show_months_to_raids_correlation(ndx);
    show_age_within_gender(ndx);
    dc.renderAll();
}

function show_team_selector(ndx) {
    var dim = ndx.dimension(dc.pluck('team'));
    var group = dim.group();
    dc.selectMenu("#team-selector")
        .dimension(dim)
        .group(group);
}

function show_percent_that_are_instinct(ndx, sex, element) {
    var percentageThatAreInstinct = ndx.groupAll().reduce(
        function(p, v) {
            if (v.sex === sex) {
                p.count++;
                if (v.team === "Instinct") {
                    p.are_instinct++;
                }
            }
            return p;
        },
        function(p, v) {
            if (v.sex === sex) {
                p.count--;
                if (v.team === "Instinct") {
                    p.are_instinct--;
                }
            }
            return p;
        },
        function() {
            return { count: 0, are_instinct: 0 };
        }
    );
    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function(d) {
            if (d.count == 0) {
                return 0;
            }
            else {
                return (d.are_instinct / d.count);
            }
        })
        .group(percentageThatAreInstinct);
}

function show_gender_trainers(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));
    var group = dim.group();
    dc.barChart("#gender-trainers")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(group)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}

function show_pokemon_raiders(ndx) {
    var dim = ndx.dimension(dc.pluck('sex'));

    function add_item(p, v) {
        p.count++;
        p.total += v.raids;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.raids;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return { count: 0, total: 0, average: 0 };
    }
    var gameplayByGender = dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart("#pokemon-raiders")
        .width(400)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(gameplayByGender)
        .valueAccessor(function(d) {
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}

function show_team_distribution(ndx) {
    function teamByGender(dimension, team) {
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if (v.team == team) {
                    p.match++;
                }
                return p;
            },
            function(p, v) {
                p.total--;
                if (v.team == team) {
                    p.match--;
                }
                return p;
            },
            function() {
                return { total: 0, match: 0 };
           }
        );
    }





var dim = ndx.dimension(dc.pluck("sex"));
var instinctByGender = teamByGender(dim, "Instinct");
var valorByGender = teamByGender(dim, "Valor");
var mysticByGender = teamByGender(dim, "Mystic");


let chart = dc.barChart("#team-distribution")

    chart
    .width(400)
    .height(300)
    .dimension(dim)
    .group(instinctByGender, "Instinct")
    .stack(valorByGender, "Valor")
    .stack(mysticByGender, "Mystic")
    .valueAccessor(function(d) {
        if (d.value.total > 0) {
            return (d.value.match / d.value.total) * 100;
        }
        else {
            return 0;
        }
    })
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    .legend(dc.legend().x(330).y(20).itemHeight(15).gap(5))
    .margins({ top: 10, right: 100, bottom: 30, left: 30 });
chart.on("pretransition", function(chart) {
    chart.selectAll(".dc-legend-item").style("fill", function(d) {                 
        if (d.team == "Mystic") {
            return "#1f77b4";
        }
        else if (d.team == "Valor") {
            return "#ff7f0e";
        }
        else if (d.team == "Instinct") {
            return "#f1c00f";
            }
         });
    });
}

/*.style("fill", function(d) {
        var returnColor;
        if (d ==== 40) {returnColor = "green";
        } else if (d === 20) { returnColor = "purple";
        } else if (d === 10) { returnColor = "red"; }
        return returnColor;
    });*/
    
function show_months_to_raids_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Male", "Female"])
        .range(["#186CFF", "#F615D4"]);
    var eDim = ndx.dimension(dc.pluck("months_joined"));
    var experienceDim = ndx.dimension(function(d) {
        return [d.months_joined, d.raids, d.team, d.sex];
    });
    var experienceRaidsGroup = experienceDim.group();
    var minExperience = eDim.bottom(1)[0].months_joined;
    var maxExperience = eDim.top(1)[0].months_joined;
    dc.scatterPlot("#months_joined")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Raids")
        .xAxisLabel("Months Of Raiding")
        .title(function(d) {
            return d.key[2] + "Completed " + d.key[1];
        })
        .colorAccessor(function(d) {
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceRaidsGroup)
        .margins({ top: 10, right: 50, bottom: 75, left: 75 });
}

function show_age_within_gender(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Male", "Female"])
        .range(["#186CFF", "#F615D4"]);
    var dim = ndx.dimension(dc.pluck('sex'));

    function add_item(p, v) {
        p.count++;
        p.total += v.age;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if (p.count == 0) {
            p.total = 0;
            p.average = 0;
        }
        else {
            p.total -= v.age;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return { count: 0, total: 0, average: 0 };
    }

    var ageByGender = dim.group().reduce(add_item, remove_item, initialise);

    dc.barChart("#age_within_gender")
        .width(250)
        .height(300)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(dim)
        .group(ageByGender)
        .valueAccessor(function(d) {
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}


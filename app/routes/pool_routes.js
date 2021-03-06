var Pool = require('../models/pool');
var request = require('request');

module.exports = function (app, db) {
    app.post('/api/pool', (req, res) => {
        var pool = req.body.pool + '';
        var hydratedPool = {};
        var analysis = {
            pool: [],
            monoColors: [],
            pairColors: [],
            tripleColors: []
        };

        SplitPool(pool)
            .then(function (cards) {
                return GetGathererData(cards);
            })
            .then(function (gatheredCards) {
                return GetRatingData(gatheredCards)
            })
            .then(function (ratedCards) {
                return GetManaData(ratedCards)
            })
            .then(function (hydratedCards) {
                analysis.pool = hydratedCards.sort(compare);
                return CalculateMonoColors(analysis.pool);
            })
            .then(function (monoAnalysis) {
                analysis.monoColors = monoAnalysis;
                return CalculatePairColors(analysis.pool);
            })
            .then(function (pairAnalysis) {
                analysis.pairColors = pairAnalysis;
                return CalculateTripleColors(analysis.pool);
            })
            .then(function (tripleAnalysis) {
                analysis.tripleColors = tripleAnalysis;
                res.json(analysis);
            })
            .catch(function (err) {
                console.error(err);
            });
    });

    function compare(a, b) {
        if (a.powerranking < b.powerranking)
            return 1;
        if (a.powerranking > b.powerranking)
            return -1;
        return 0;
    }

    function CalculateTripleColors(cards) {
        return new Promise((resolve, reject) => {
            var colors = [
                ["W", "U", "B"],
                ["W", "U", "R"],
                ["W", "U", "G"],
                ["W", "B", "R"],
                ["W", "B", "G"],
                ["W", "R", "G"],
                ["U", "B", "R"],
                ["U", "B", "G"],
                ["U", "R", "G"],
                ["B", "R", "G"]
            ];
            var colorsAnalysis = [];

            colors.forEach(color => {
                var colorAnalysis = {
                    color: color,
                    count: 0,
                    average: 0,
                    cards: []
                };

                cards.forEach(card => {
                    if (card.type != "Land" &&
                        (
                            (card.colors.length === 0) ||
                            (card.colors.length === 1 && (card.colors[0] === color[0] || card.colors[0] === color[1] || card.colors[0] === color[2])) ||
                            (card.colors.length === 2 && card.colors.includes(color[0]) && card.colors.includes(color[1])) ||
                            (card.colors.length === 2 && card.colors.includes(color[0]) && card.colors.includes(color[2])) ||
                            (card.colors.length === 2 && card.colors.includes(color[1]) && card.colors.includes(color[2])) ||
                            (card.colors.length === 3 && card.colors.includes(color[1]) && card.colors.includes(color[2]) && card.colors.includes(color[3]))
                        )
                    ) {
                        colorAnalysis.cards.push(card);
                    }
                })

                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                colorAnalysis.average = colorAnalysis.cards.average("powerranking");
                colorAnalysis.whiteSources = colorAnalysis.cards.max("whiteSources");
                colorAnalysis.blueSources = colorAnalysis.cards.max("blueSources");
                colorAnalysis.blackSources = colorAnalysis.cards.max("blackSources");
                colorAnalysis.redSources = colorAnalysis.cards.max("redSources");
                colorAnalysis.greenSources = colorAnalysis.cards.max("greenSources");
                colorAnalysis.count = colorAnalysis.cards.length;

                colorsAnalysis.push(colorAnalysis);
            });

            resolve(colorsAnalysis);
        })
    };

    function CalculatePairColors(cards) {
        return new Promise((resolve, reject) => {
            var colors = [
                ["W", "U"],
                ["W", "B"],
                ["W", "R"],
                ["W", "G"],
                ["U", "B"],
                ["U", "R"],
                ["U", "G"],
                ["B", "R"],
                ["B", "G"],
                ["R", "G"]
            ];
            var colorsAnalysis = [];

            colors.forEach(color => {
                var colorAnalysis = {
                    color: color,
                    count: 0,
                    average: 0,
                    cards: []
                };

                cards.forEach(card => {
                    if (card.type != "Land" &&
                        (
                            (card.colors.length === 0) ||
                            (card.colors.length === 1 && (card.colors[0] === color[0] || card.colors[0] === color[1])) ||
                            (card.colors.length === 2 && card.colors.includes(color[0]) && card.colors.includes(color[1]))
                        )
                    ) {
                        colorAnalysis.cards.push(card);
                    }
                })

                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                colorAnalysis.average = colorAnalysis.cards.average("powerranking");
                colorAnalysis.whiteSources = colorAnalysis.cards.max("whiteSources");
                colorAnalysis.blueSources = colorAnalysis.cards.max("blueSources");
                colorAnalysis.blackSources = colorAnalysis.cards.max("blackSources");
                colorAnalysis.redSources = colorAnalysis.cards.max("redSources");
                colorAnalysis.greenSources = colorAnalysis.cards.max("greenSources");
                colorAnalysis.count = colorAnalysis.cards.length;

                colorsAnalysis.push(colorAnalysis);
            });

            resolve(colorsAnalysis);
        })
    };

    function CalculateMonoColors(cards) {
        return new Promise((resolve, reject) => {
            var colors = ["W", "U", "B", "R", "G"];
            var colorsAnalysis = [];

            colors.forEach(color => {
                // Create a new Analysis
                var colorAnalysis = {
                    color: color,
                    count: 0,
                    average: 0,
                    cards: []
                };

                // Find matching non-land cards
                cards.forEach(card => {
                    if (card.type != "Land" &&
                        (
                            card.colors.length === 0 ||
                            (
                                card.colors[0] === color &&
                                card.colors.length === 1
                            )
                        )
                    ) {
                        colorAnalysis.cards.push(card);
                    }
                })

                // The list is already sorted, so only keep the top 23
                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                // Calculate the average and count.
                colorAnalysis.average = colorAnalysis.cards.average("powerranking");
                colorAnalysis.whiteSources = colorAnalysis.cards.max("whiteSources");
                colorAnalysis.blueSources = colorAnalysis.cards.max("blueSources");
                colorAnalysis.blackSources = colorAnalysis.cards.max("blackSources");
                colorAnalysis.redSources = colorAnalysis.cards.max("redSources");
                colorAnalysis.greenSources = colorAnalysis.cards.max("greenSources");
                colorAnalysis.count = colorAnalysis.cards.length;

                colorsAnalysis.push(colorAnalysis);
            });

            resolve(colorsAnalysis);
        })
    };

    // Extension of Array.Max to max attributes.
    Array.prototype.max = function (prop) {
        var max = 0
        for (var i = 0, _len = this.length; i < _len; i++) {
            max = Math.max(this[i][prop], max);
        }
        return max;
    }

    // Extension of Array.Average to average attributes.
    Array.prototype.average = function (prop) {
        var total = 0
        for (var i = 0, _len = this.length; i < _len; i++) {
            total += this[i][prop]
        }
        return total / this.length
    }

    function GetManaData(cards) {
        return new Promise((resolve, reject) => {
            var hydratedCards = [];

            manaBasePromises = cards.map(fetchManaBase);

            Promise.all(manaBasePromises)
                .then(function (results) {
                    results.forEach(card => {

                        if (card == null) {
                            return null;
                        }

                        var gathererData = cards.find(gCard => gCard.name === card.name);

                        gathererData.whiteSources = card.whiteSources;
                        gathererData.blueSources = card.blueSources;
                        gathererData.blackSources = card.blackSources;
                        gathererData.redSources = card.redSources;
                        gathererData.greenSources = card.greenSources;

                        hydratedCards.push(gathererData);
                    })

                    resolve(hydratedCards);
                })
                .catch(function (err) {
                    console.error(err);
                });
        });
    };

    function GetRatingData(cards) {
        return new Promise((resolve, reject) => {
            var ratedCards = [];

            cardRatingPromises = cards.map(fetchRatingData);

            Promise.all(cardRatingPromises)
                .then(function (results) {
                    results.forEach(card => {

                        if (card == null) {
                            return null;
                        }

                        var gathererData = cards.find(gCard => gCard.name === card.name);

                        gathererData.comments = card.comments;
                        gathererData.p1p1 = Number(card.p1p1);
                        gathererData.draftsim = Number(card.draftsim);
                        gathererData.lr = Number(card.lr);
                        gathererData.powerranking = Number(card.powerranking);

                        ratedCards.push(gathererData);
                    })

                    resolve(ratedCards);
                })
                .catch(function (err) {
                    console.error(err);
                });
        });
    };

    function GetGathererData(cards) {
        return new Promise((resolve, reject) => {
            cardGathererPromises = cards.map(fetchGathererData);

            Promise.all(cardGathererPromises)
                .then(function (results) {
                    results.forEach(card => {
                        card.W = parseInt((card.manaCost.match(/W/g) || []).length);
                        card.U = parseInt((card.manaCost.match(/U/g) || []).length);
                        card.B = parseInt((card.manaCost.match(/B/g) || []).length);
                        card.R = parseInt((card.manaCost.match(/R/g) || []).length);
                        card.G = parseInt((card.manaCost.match(/G/g) || []).length);

                        card.colors = [];
                        if (card.W > 0) {
                            card.colors.push("W")
                        };
                        if (card.U > 0) {
                            card.colors.push("U")
                        };
                        if (card.B > 0) {
                            card.colors.push("B")
                        };
                        if (card.R > 0) {
                            card.colors.push("R")
                        };
                        if (card.G > 0) {
                            card.colors.push("G")
                        };
                    })

                    resolve(results);
                })
                .catch(function (err) {
                    console.error(err);
                });
        })
    };

    function SplitPool(poolText) {
        return new Promise((resolve, reject) => {
            // Split Pool
            var cardArray = poolText.split(/\r?\n/);
            var cardObjectArray = [];

            cardArray.forEach(card => {
                // Split Card and Count
                var newCard = {
                    cardName: card.substr(card.indexOf(' ') + 1)
                };

                var cardCount = parseInt(card.substr(0, card.indexOf(' ')));

                // Add card object to Array = number of cards.
                for (var i = 0; i < cardCount; i++) {
                    cardObjectArray.push(newCard);
                }
            });

            // Return an Array of Cards
            resolve(cardObjectArray);
        })
    };

    var fetchRatingData = function (card) {
        return new Promise((resolve, reject) => {
            var options = {
                url: 'https://mtgratingapi.herokuapp.com/api/rating/' + card.name,
                json: true
            };

            request(options, function (error, response, body) {
                resolve(body);
            });
        });
    };

    var fetchGathererData = function (card) {
        return new Promise((resolve, reject) => {
            var options = {
                url: 'https://mtgcardapi.herokuapp.com/api/cards/' + card.cardName,
                json: true
            };

            request(options, function (error, response, body) {
                body.cardCount = card.cardCount;
                resolve(body);
            });
        });
    };

    var fetchManaBase = function (card) {
        return new Promise((resolve, reject) => {

            var options = {
                method: 'POST',
                url: 'https://mtgmanabaseapi.herokuapp.com/api/manabase/card/name',
                json: true,
                headers: {
                    'Postman-Token': 'fae497a7-8b02-451d-88f8-d01d0d7cccfd',
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                form: {
                    CardName: card.name,
                    format: 'Limited'
                }
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                body.name = card.name;
                resolve(body);
            });
        });
    };
};
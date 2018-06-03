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
                    if (card.type != "Land" && (
                            card.colorIdentity === color[0] ||
                            card.colorIdentity === color[1] ||
                            card.colorIdentity === color[2] ||
                            card.colorIdentity === color[0].concat(",").concat(color[1]).concat(",").concat(color[2]))) {
                        colorAnalysis.cards.push(card);
                        colorAnalysis.count += card.cardCount;
                        colorAnalysis.average = ((colorAnalysis.average * (colorAnalysis.count - 1)) + card.powerranking) / colorAnalysis.count;
                    }
                })

                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                var totalScore = 0;

                colorAnalysis.cards.forEach(card => {
                    totalScore += card.powerranking;
                });

                colorAnalysis.average = totalScore / colorAnalysis.cards.length;
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
                    if (card.type != "Land" && (card.colorIdentity === color[0] ||
                            card.colorIdentity === color[1] ||
                            card.colorIdentity === color[0].concat(",").concat(color[1]))) {
                        colorAnalysis.cards.push(card);
                    }
                })

                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                var totalScore = 0;

                colorAnalysis.cards.forEach(card => {
                    totalScore += card.powerranking;
                });

                colorAnalysis.average = totalScore / colorAnalysis.cards.length;
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
                var colorAnalysis = {
                    color: color,
                    count: 0,
                    average: 0,
                    cards: []
                };

                cards.forEach(card => {
                    if (card.type != "Land" && card.colorIdentity === color) {
                        colorAnalysis.cards.push(card);
                    }
                })

                colorAnalysis.cards.splice(23, colorAnalysis.cards.length - 23)

                var totalScore = 0;

                colorAnalysis.cards.forEach(card => {
                    totalScore += card.powerranking;
                });

                colorAnalysis.average = totalScore / colorAnalysis.cards.length;
                colorAnalysis.count = colorAnalysis.cards.length;

                colorsAnalysis.push(colorAnalysis);
            });

            resolve(colorsAnalysis);
        })
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
                });
        });
    };

    function GetGathererData(cards) {
        return new Promise((resolve, reject) => {
            cardGathererPromises = cards.map(fetchGathererData);

            Promise.all(cardGathererPromises)
                .then(function (results) {
                    results.forEach(card => {
                        card.W = (card.manaCost.match(/W/g) || []).length;
                        card.U = (card.manaCost.match(/U/g) || []).length;
                        card.B = (card.manaCost.match(/B/g) || []).length;
                        card.R = (card.manaCost.match(/R/g) || []).length;
                        card.G = (card.manaCost.match(/G/g) || []).length;
                    });

                    resolve(results);
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
};
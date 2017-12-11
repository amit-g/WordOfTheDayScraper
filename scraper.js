//var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
//var app = express();
var async = require('async');
var url = require('url');

console.log('Starting...');

var wordsOfTheDay = [];
var seedUrl = 'https://www.merriam-webster.com/word-of-the-day';
//var seedUrl = 'https://www.merriam-webster.com/word-of-the-day/stellar-2017-11-14';

function scrapePage(currentUrl, wordsOfTheDay, cb) {
    console.log("Calling request for currentUrl: " + currentUrl);

    request(encodeURI(currentUrl), function (error, response, html) {
        if (!error) {
            //console.log(html);

            var $ = cheerio.load(html);

            //console.log($);

            var $quickDefBox = $(".quick-def-box");
            var $wordAndPronunciation = $(".word-and-pronunciation", $quickDefBox);
            var $wordAttributes = $(".word-attributes", $quickDefBox);
            var $navArrowContainer = $(".nav-arrow-container", $quickDefBox);

            var word = $("h1", $wordAndPronunciation).text();
            var wordSyllables = $(".word-syllables", $wordAttributes).text();
            var previousWordUrl = $(".prev-wod-arrow", $navArrowContainer).attr("href");
            var nextWordUrl = $(".next-wod-arrow", $navArrowContainer).attr("href");
            var currentDate = currentUrl.slice(-10);

            if (previousWordUrl) {
                previousWordUrl = urlResolve(currentUrl, previousWordUrl);
            }

            if (nextWordUrl) {
                nextWordUrl = urlResolve(currentUrl, nextWordUrl);
            }

            var wordOfTheDay = {
                word: word,
                wordSyllables: wordSyllables,
                currentUrl: currentUrl,
                previousWordUrl: previousWordUrl,
                nextWordUrl: nextWordUrl,
                date: currentDate
            };

            wordsOfTheDay.push(wordOfTheDay);

            console.log("Added: " + JSON.stringify(wordOfTheDay, null, 4));
        }

        if (cb) {
            cb(error);
        }
    });
}

function scrapePageRecursive(wordsOfTheDay, maxWordsToScrap, millisecondsBetweenCalls, cb) {
    var currentUrl = wordsOfTheDay.length > 0 ? wordsOfTheDay[wordsOfTheDay.length - 1].previousWordUrl : seedUrl;

    scrapePage(currentUrl, wordsOfTheDay, function scrapePageNext(error) {
        if (error) {
            console.log("Something went wrong.");
            console.log(error);

            cb();

            return;
        }

        var previousWordUrl = wordsOfTheDay[wordsOfTheDay.length - 1].previousWordUrl;

        if (previousWordUrl) {
            console.log("Continue to call scrapPage with previous Url: " + previousWordUrl);
            console.log("wordsOfTheDay.length: " + wordsOfTheDay.length);
            console.log("maxWordsToScrap: " + maxWordsToScrap);

            if (wordsOfTheDay.length <= maxWordsToScrap) {
                sleep(millisecondsBetweenCalls).then(function () {
                    scrapePage(previousWordUrl, wordsOfTheDay, scrapePageNext);
                });
            }
            else {
                cb();
            }
        }
        else {
            cb();
        }
    });

}

function readFromFile(fileName, cb) {
    fs.readFile(fileName, function (error, data) {
        if (cb) {
            cb(error, data);
        }
    });
}

function writeToFile(fileName, data, cb) {
    fs.writeFile(fileName, JSON.stringify(data, null, 4), function (err) {
        console.log('File successfully written! - Check your project directory for the output.json file');

        if (cb) {
            cb(error);
        }
    });
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function urlResolve(fromUrl, toUrl) {
    return toUrl != "#" ? url.resolve(fromUrl, toUrl) : "";
}

var millisecondsBetweenCalls = 100;
var fileName = 'output.json';
var maxWordsToScrap = 10000;
var completionCallback = function () {
    console.log("Number of words: " + wordsOfTheDay.length);

    writeToFile(fileName, wordsOfTheDay);

    console.log('Completed');
}

readFromFile(fileName, function (error, data) {
    if (error || !data) {
        data = [];
    }
    else if (data) {
        data = JSON.parse(data);
    }

    wordsOfTheDay = data;

    scrapePageRecursive(wordsOfTheDay, maxWordsToScrap, millisecondsBetweenCalls, completionCallback);
});
//var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
//var app = express();
var async = require('async');
var url = require('url');

if (!console.debug) {
    console.debug = function () {};
}

console.log('Starting...');

var wordsOfTheDay = [];
var seedUrl = 'https://www.merriam-webster.com/word-of-the-day';
//var seedUrl = 'https://www.merriam-webster.com/word-of-the-day/stellar-2017-11-14';

function scrapePage(currentUrl, wordsOfTheDay, cb) {
    console.log("Calling request for currentUrl: " + currentUrl);

    request(encodeURI(currentUrl), function (error, response, html) {
        if (!error) {
            //console.debug(html);

            var $ = cheerio.load(html);

            //console.debug($);

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

            if (cb) {
                console.debug("Callback with wordOfTheDay");
                console.debug(wordOfTheDay);

                cb(null, wordOfTheDay);
            }
        }
        else {
            if (cb) {
                cb(error);
            }
        }
    });
}

function scrapePageRecursive(wordsOfTheDay, maxWordsToScrap, millisecondsBetweenCalls, cb) {
    var currentUrl = wordsOfTheDay.length > 0 ? wordsOfTheDay[wordsOfTheDay.length - 1].previousWordUrl : seedUrl;

    console.debug("seedUrl: " + seedUrl);

    console.debug("wordsOfTheDay.length: " + wordsOfTheDay.length);        
    console.debug("currentUrl: " + currentUrl);

    // Backward from current Url
    console.log("Starting backward scrapping with Url: " + currentUrl);
    scrapePageRecursiveForGivenUrl(wordsOfTheDay, currentUrl, true, maxWordsToScrap, millisecondsBetweenCalls, function (error) {
        if (error) {
            console.log("Something went wrong.");
            console.log(error);

            cb(error);

            return;
        }

        console.debug("wordsOfTheDay.length: " + wordsOfTheDay.length);        
        console.debug("wordsOfTheDay[1].nextWordUrl: " + wordsOfTheDay[1].nextWordUrl);

        currentUrl = wordsOfTheDay.length > 1 ? wordsOfTheDay[1].nextWordUrl : seedUrl;
        wordsOfTheDay.shift();

        // Forward from current Url
        console.log("Starting forward scrapping with Url: " + currentUrl);
        scrapePageRecursiveForGivenUrl(wordsOfTheDay, currentUrl, false, maxWordsToScrap, millisecondsBetweenCalls, cb);
    });
}

function scrapePageRecursiveForGivenUrl(wordsOfTheDay, currentUrl, append, maxWordsToScrap, millisecondsBetweenCalls, cb) {
    console.debug("scrapePageRecursiveForGivenUrl called with currentUrl: " + currentUrl);
    if (!currentUrl) {
        cb();

        return;
    }

    scrapePage(currentUrl, wordsOfTheDay, function scrapePageNext(error, wordOfTheDay) {
        if (error) {
            console.log("Something went wrong.");
            console.log(error);

            cb(error);

            return;
        }

        console.debug(wordOfTheDay);

        var newCurrentWordUrl = "";

        if (append) {
            wordsOfTheDay.push(wordOfTheDay);

            newCurrentWordUrl = wordsOfTheDay[wordsOfTheDay.length - 1].previousWordUrl;

            console.log("Appended: " + JSON.stringify(wordOfTheDay, null, 4));
        }
        else {
            wordsOfTheDay.unshift(wordOfTheDay);

            newCurrentWordUrl = wordsOfTheDay[0].nextWordUrl;

            console.log("Prepended: " + JSON.stringify(wordOfTheDay, null, 4));
        }

        if (newCurrentWordUrl) {
            console.log("Continue to call scrapPage with Url: " + newCurrentWordUrl);
            console.log("wordsOfTheDay.length: " + wordsOfTheDay.length);
            console.log("maxWordsToScrap: " + maxWordsToScrap);

            if (wordsOfTheDay.length <= maxWordsToScrap) {
                sleep(millisecondsBetweenCalls).then(function () {
                    scrapePage(newCurrentWordUrl, wordsOfTheDay, scrapePageNext);
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
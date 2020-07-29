'use strict';

const chalk = require('chalk');
const Table = require('cli-table');

function percentChange(prev, current, prevSem, currentSem) {
  const [mean, sd] = calculateMeanAndSdOfRatioFromDeltaMethod(
    prev,
    current,
    prevSem,
    currentSem
  );
  const pctChange = +(mean * 100).toFixed(1);
  const ci95 = +(100 * 1.96 * sd).toFixed(1);

  const ciInfo = ci95 > 0 ? ` +- ${ci95} %` : '';
  const text = `${pctChange > 0 ? '+' : ''}${pctChange} %${ciInfo}`;
  if (pctChange + ci95 < 0) {
    return chalk.green(text);
  } else if (pctChange - ci95 > 0) {
    return chalk.red(text);
  } else {
    // Statistically insignificant.
    return text;
  }
}

function calculateMeanAndSdOfRatioFromDeltaMethod(
  meanControl,
  meanTest,
  semControl,
  semTest
) {
  const mean =
    (meanTest - meanControl) / meanControl -
    (Math.pow(semControl, 2) * meanTest) / Math.pow(meanControl, 3);
  const variance =
    Math.pow(semTest / meanControl, 2) +
    Math.pow(semControl * meanTest, 2) / Math.pow(meanControl, 4);
  return [mean, Math.sqrt(variance)];
}

function addBenchmarkResults(table, localResults, remoteMainResults) {
  const benchmarks = Object.keys(
    (localResults && localResults.benchmarks) ||
      (remoteMainResults && remoteMainResults.benchmarks)
  );
  benchmarks.forEach(benchmark => {
    const rowHeader = [chalk.white.bold(benchmark)];
    if (remoteMainResults) {
      rowHeader.push(chalk.white.bold('Time'));
    }
    if (localResults) {
      rowHeader.push(chalk.white.bold('Time'));
    }
    if (localResults && remoteMainResults) {
      rowHeader.push(chalk.white.bold('Diff'));
    }
    table.push(rowHeader);

    const measurements =
      (localResults && localResults.benchmarks[benchmark].averages) ||
      (remoteMainResults &&
        remoteMainResults.benchmarks[benchmark].averages);
    measurements.forEach((measurement, i) => {
      const row = [chalk.gray(measurement.entry)];
      let remoteMean;
      let remoteSem;
      if (remoteMainResults) {
        remoteMean = remoteMainResults.benchmarks[benchmark].averages[i].mean;
        remoteSem = remoteMainResults.benchmarks[benchmark].averages[i].sem;
        // https://en.wikipedia.org/wiki/1.96 gives a 99% confidence interval.
        const ci95 = remoteSem * 1.96;
        row.push(
          chalk.white(+remoteMean.toFixed(2) + ' ms +- ' + ci95.toFixed(2))
        );
      }
      let localMean;
      let localSem;
      if (localResults) {
        localMean = localResults.benchmarks[benchmark].averages[i].mean;
        localSem = localResults.benchmarks[benchmark].averages[i].sem;
        const ci95 = localSem * 1.96;
        row.push(
          chalk.white(+localMean.toFixed(2) + ' ms +- ' + ci95.toFixed(2))
        );
      }
      if (localResults && remoteMainResults) {
        row.push(percentChange(remoteMean, localMean, remoteSem, localSem));
      }
      table.push(row);
    });
  });
}

function printResults(localResults, remoteMainResults) {
  const head = [''];
  if (remoteMainResults) {
    head.push(chalk.yellow.bold('Remote (Merge Base)'));
  }
  if (localResults) {
    head.push(chalk.green.bold('Local (Current Branch)'));
  }
  if (localResults && remoteMainResults) {
    head.push('');
  }
  const table = new Table({head});
  addBenchmarkResults(table, localResults, remoteMainResults);
  console.log(table.toString());
}

module.exports = printResults;

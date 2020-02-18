const fs = require('fs');
function readlibDeps(pkgFile) {
  try {
    const pkgFileData = JSON.parse(fs.readFileSync(pkgFile));
    const pkgDeps = pkgFileData.dependencies;
    return (pkgDeps && typeof pkgDeps === 'object') ? pkgDeps.getOwnPropertyNames(pkgDeps) : [];
  } catch (e) {
    return [];
  }
}

function initObserveStatistics(label, client) {
  const durationTimer = new client.Histogram({
    name: 'function_duration_seconds',
    help: 'Duration of function executing in second',
    labelNames: [label]
  });
  const callsCounter = new client.Counter({
    name: 'function_calls_counts',
    help: 'Number of calling function',
    labelNames: [label]
  });
  const errorsCounter = new client.Counter({
    name: 'function_errors_counts',
    help: 'Number of exceptions in function',
    labelNames: [label]
  });
  return {durationTimer, callsCounter, errorsCounter}
}

module.exports = {
  readlibDeps,
  initObserveStatistics,
};

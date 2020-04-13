'use strict';
const vm = require('vm');
const path = require('path');
const libs = require('./lib/libs');
const DataSourceService = require('./lib/DataSourceService');
const Module = require('module');
const client = require('prom-client');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();

const funcPort = process.env.FUNCTION_PORT || 8080;
const funcTimeout = process.env.FUNCTION_TIMEOUT || 3000;
const moduleName = process.env.FUNCTION_MODULE_NAME ? process.env.FUNCTION_MODULE_NAME : 'NoFoundName';
const local = require.main.filename;
const rootPath = process.env.NODE_ENV === 'dev'
  ? path.join(local, '..', 'example')
  : path.join(local, '..', '..', 'funceasy');
const srcPath = path.join(rootPath, `${moduleName}.js`);
const libPath = path.join(rootPath, 'node_modules');
const pkgPath = path.join(rootPath, 'package.json');
const libDeps = libs.readlibDeps(pkgPath);
const {durationTimer, errorsCounter, callsCounter} = libs.initObserveStatistics('method', client);
let DSS = null;
try {
  DSS = new DataSourceService();
} catch (e) {
  console.log(e)
}
async function functionHandle(ctx) {
  let params = {};
  if(ctx.method === 'GET') {
    params = ctx.query;
  } else if (ctx.method === 'POST') {
    params = ctx.request.body;
  }
  const funcHandler = params.handler || process.env.FUNCTION_HANDLER;
  const context = {
    '$function-name': funcHandler,
    '$runtime': process.env.FUNS_RUNTIME,
    '$memory_limit': process.env.FUNS_MEMORY_LIMIT,
    '$timeout': funcTimeout,
  };
  const funcEnv = {
    funcHandler, context, params
  };
  const prefix = `${moduleName}[${funcHandler || '__directlyInvoke'}]`;
  const label = funcLabel(prefix, ctx.method);
  const end = durationTimer.labels(label).startTimer();
  callsCounter.labels(label).inc();

  const script = new vm.Script(`require('__funcInit')(require('${srcPath}'))`, {
    filename: path.join(srcPath, 'index.js'),
    displayErrors: true
  });
  const sandBox = Object.assign({}, global, {
    __filename: path.join(srcPath, 'index.js'),
    __dirname: srcPath,
    module: new Module(path.join(srcPath, 'index.js'), null),
    require: (p) => modRequire(p, funcEnv, ctx, label, end),
  });

  try {
    await script.runInNewContext(sandBox, {
      timeout: +funcTimeout
    });
  } catch (e) {
    handleError(e, ctx, label, end);
  }
}

function modRequire(p, funcEnv, ctx, label, end) {
  if(p === '__funcInit') {
    return async handler => await modExecute(handler, funcEnv, ctx, label, end);
  }
  else if (libDeps.includes(p)) {
    return require(path.join(libPath, p));
  }
  else if (p.indexOf('./') === 0) {
    return require(path.join(srcPath, p));
  }
  else {
    return require(p);
  }
}

async function modExecute(handler, funcEnv, ctx, label, end) {
  let func = null;
  switch (typeof handler) {
    case 'function':
      func = handler;
      break;
    case 'object':
      if (handler) func = handler[funcEnv.funcHandler];
      break;
  }
  if (!func) throw new Error(`Unable to load ${handler}`);
  try {
    const event = {
      params: funcEnv.params,
      ctx: ctx,
    };
    if (DSS) event.DSS = DSS;
    ctx.body = await func(event, funcEnv.context);
  } catch (e) {
    handleError(e, ctx, label, end);
  }
}

function funcLabel(prefix, method) {
  return `[${method}]${prefix}`;
}

function handleError(err, ctx, label, endCounter) {
  errorsCounter.labels(label).inc();
  ctx.status = 500;
  ctx.body = `Function ${label} executed failed: ${err.stack}`;
  endCounter();
}

app.use(bodyParser());
router.get('/metrics', async ctx => {
  ctx.status = 200;
  ctx.contentType = 'application/json; charset=utf-8';
  ctx.body = client.register.getMetricsAsJSON();
});
router.get('/health', async ctx => {
  ctx.status = 200;
  ctx.body = 'OK';
});
router.all('*', logger(), functionHandle);
app.use(router.routes());

app.listen(funcPort);
console.log('Listening port: ' + funcPort);

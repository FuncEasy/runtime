const lib = require('./moduleTest');
const _ = require('lodash');
module.exports = {
  asyncFunction: async function (event, context) {
    return await new Promise((res, rej) => {
      setTimeout(() => res("hit async function"), 2000)
    });
  },
  foo: function (event, context) {
    return 'foo';
  },
  bar: function (event, context) {
    let res = {};
    _.assign(res, {date: new Date().toTimeString()});
    return res;
  }
};

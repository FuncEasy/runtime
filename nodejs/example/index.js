const lib = require('./moduleTest');
const _ = require('lodash');
module.exports = {
  test: function (event, context) {
    return lib(12);
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

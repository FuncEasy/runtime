const client = require('request-promise');
class DataSourceService {
  constructor() {
    this.DATA_SOURCE_ID = process.env.DATA_SOURCE_ID;
    this.DATA_SOURCE_TOKEN = process.env.DATA_SOURCE_TOKEN;
    this.DATA_SOURCE_SERVICE = process.env.DATA_SOURCE_SERVICE || "data-source-service";
    if (!this.DATA_SOURCE_ID || !this.DATA_SOURCE_TOKEN || !this.DATA_SOURCE_SERVICE) {
      throw "Not Mount Data Source"
    } else {
      this.url = `http://${this.DATA_SOURCE_SERVICE}/data`
    }
  }

  create(data) {
    const opts = {
      uri: `${this.url}/create/${this.DATA_SOURCE_ID}`,
      method: "POST",
      headers: {
        "Authentication": this.DATA_SOURCE_TOKEN,
      },
      body: {data},
      json: true,
    };
    return client(opts)
  }

  find(query) {
    const opts = {
      uri: `${this.url}/get/${this.DATA_SOURCE_ID}`,
      method: "POST",
      headers: {
        "Authentication": this.DATA_SOURCE_TOKEN,
      },
      body: {where: query},
      json: true,
    };
    return client(opts);
  }

  update(data, where) {
    const opts = {
      uri: `${this.url}/update/${this.DATA_SOURCE_ID}`,
      method: "POST",
      headers: {
        "Authentication": this.DATA_SOURCE_TOKEN,
      },
      body: {data, where},
      json: true,
    };
    return client(opts);
  }

  delete(where) {
    const opts = {
      uri: `${this.url}/${this.DATA_SOURCE_ID}`,
      method: "DELETE",
      headers: {
        "Authentication": this.DATA_SOURCE_TOKEN,
      },
      body: {where},
      json: true,
    };
    return client(opts);
  }
}

module.exports = DataSourceService;
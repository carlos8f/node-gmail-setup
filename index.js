var middler = require('middler')
  , server = require('http').createServer()
  , request = require('request')
  , url = require('url')
  , dish = require('dish')
  , conf = require('etc')()

conf.use(require('etc-yaml'));
conf.env();
conf.folder(__dirname + '/etc');

conf.add({
  authorize_path: '/oauth2/authorize',
  callback_path: '/oauth2/callback'
});

middler(server)
  .get(conf.get('authorize_path'), function (req, res, next) {
    var urlObj = url.parse(conf.get('auth_uri'));
    urlObj.query || (urlObj.query = {});
    urlObj.query.scope = 'https://mail.google.com/';
    urlObj.query.redirect_uri = conf.get('base_uri') + conf.get('callback_path');
    urlObj.query.response_type = 'code';
    urlObj.query.access_type = 'offline';
    urlObj.query.client_id = conf.get('client_id');

    res.writeHead(302, {'Location': url.format(urlObj)});
    res.end();
  })
  .get(conf.get('callback_path'), function (req, res, next) {
    var code = url.parse(req.url, true).query.code;
    if (!code) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('?code required');
      return;
    }
    request({
      method: 'POST',
      // url: 'http://localhost:8080/test',
      url: conf.get('token_uri'),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'code=' + code + '&client_id=' + conf.get('client_id') + '&client_secret=' + conf.get('client_secret') + '&redirect_uri=' + conf.get('base_uri') + conf.get('callback_path') + '&grant_type=authorization_code'
      /*
      form: {
        code: code,
        client_id: conf.get('client_id'),
        client_secret: conf.get('client_secret'),
        redirect_uri: conf.get('base_uri') + conf.get('callback_path'),
        grant_type: 'authorization_code'
      }*/
    }, function (err, resp, body) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end(err);
        return;
      }
      try {
        body = JSON.parse(body);
      }
      catch (e) {
        console.log(body);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end(e + '');
        return;
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(body, null, 2));
    });
  })
  .add('/test', function (req, res, next) {
    var data = '';
    req.on('data', function (chunk) {
      data += chunk;
    });
    req.on('end', function () {
      console.log(req.method, req.url, req.headers, data);
      res.writeHead(200);
      res.end('ok');
    });
  })
  .add('/', dish.file(__dirname + '/index.html'))
  .add(function (req, res, next) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('page not found');
  });

server.listen(8080, function () {
  console.log('server listening on port 8080');
});
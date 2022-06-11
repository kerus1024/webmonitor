process.title = "webmonitor-dev";

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const routes = {};
const app = express();
const SERVER_ENV = require('./config.json');

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use((req, res, next) => {
  // req.ip를 사용할 수 없다.
  // 이유는 모른다
  req.cip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (SERVER_ENV.PROGMA.WHITELIST_ENABLE && SERVER_ENV.PROGMA.WHITELIST.indexOf(req.cip) === -1) {
    console.log(`REJECTED CONNECTION FROM ${req.cip}`)
    return res.connection.destroy();
  }
  
  next();
});

routes.task = require('./routes/task');
app.use('/task', routes.task);

routes.admin = require('./routes/admin');
app.use('/admin', routes.admin);

app.get('/', (req, res) => {
  res.redirect(301, '/admin');
});

const server = app.listen(SERVER_ENV.PROGMA.LISTENPORT, SERVER_ENV.PROGMA.LISTEN, () => {
  console.log(`Express is running on port ${server.address().port}`);
});
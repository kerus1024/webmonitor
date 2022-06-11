const express = require('express');
const ejs = require('ejs');
const SERVER_ENV = require('../config.json');
const axios = require('axios');

const router = express.Router();

router.get('/', (req, res) => {
  
  const json = {
    monitors: {
      1: {
        id: 1,
        monitorName: 'ExamMonitor',
        webMethod: 'GET',
        webPath: 'https://kerus.net'
      }
    }
  }
  
  res.render("monitor-index", json);
  
});

router.get('/monitor/:id', (req, res) => {
  
  const requestID = parseInt(req.params.id);
  
  res.send(200, requestID);
  
});

// Regex Tester
router.get('/addtask', async (req, res) => {
 res.render("monitor-add");
});

router.get('/getpresets', (req, res) => {
  
  const presets = {};
  presets['kpost'] = {
    name: 'kpost',
    form: {
      monitorName: 'EPOST Monitor',
      webMethod: 'POST',
      webPath: 'https://epost....',
      detectMethod: 'regex',
      detectCondition: [ [] ],
      
    }
  }
  
  res.json(presets);
});

module.exports = router;

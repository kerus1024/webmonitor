const express = require('express');
const ejs = require('ejs');
const SERVER_ENV = require('../config.json');
const axios = require('axios');

const router = express.Router();


const MonitorManager = require('../lib/MonitorManager');

router.get('/', (req, res) => {
  return res.send('it works');
});

// POST
router.post('/assign', async (req, res) => {

  const ret = {};
  ret.status = 3;
  ret.message = 'error';

  try {
    let detectMethod = req.body.detectMethod;
    let detectCondition = [];
    
    if (!req.body.input_detectMethod) {
      detectMethod    = null;
      detectCondition = [];
    } else if (req.body.input_detectMethod === 'regex-match') {
      detectMethod = 'regex';
      if (req.body.input_regex_match) {
        detectCondition = [ [ req.body.input_regex_match ] ];
      } else {
        ret.status = 2;
      }
      
    } else if (req.body.input_detectMethod === 'regex') {
    
      req.body.input_regex_expression.forEach((expression, i) => {
        
        if (req.body.input_regex_expression[i] && req.body.input_regex_index[i] && req.body.input_regex_operator[i] && req.body.input_regex_compare_value[i]) {
          detectMethod = 'regex';
          let name = req.body.input_regex_name[i] ? req.body.input_regex_name[i] : `${req.body.input_regex_expression[i]} ${req.body.input_regex_operator[i]} ${req.body.input_regex_compare_value[i]}`;
          detectCondition.push([req.body.input_regex_expression[i], parseInt(req.body.input_regex_index[i]), req.body.input_regex_operator[i], req.body.input_regex_compare_value[i], name ]);
        } else if (req.body.input_regex_expression[i] && req.body.input_regex_operator[i] && req.body.input_regex_operator[i] === '@' && req.body.input_regex_index[i]  ) {
          detectMethod = 'regex';
          let name = req.body.input_regex_name[i] ? req.body.input_regex_name[i] : `${req.body.input_regex_expression[i]} ${req.body.input_regex_operator[i]} ${i}`;
          detectCondition.push([req.body.input_regex_expression[i], parseInt(req.body.input_regex_index[i]), req.body.input_regex_operator[i], , name ]);
        } else {
          ret.status = 2;
        }
        
      });
    
    } else if (req.body.input_detectMethod === 'json-exist') {
      
      if (req.body.input_json_exist) {
        detectMethod = 'json';
        detectCondition = [ [ req.body.input_json_exist ] ];
      } else {
        ret.status = 2;
      }
      
    } else if (req.body.input_detectMethod === 'json') {
  
      req.body.input_json_key.forEach((jsonKey, i) => {
        
        if (req.body.input_json_key[i] && req.body.input_json_operator[i] && req.body.input_json_compare_value[i]) {
          detectMethod = 'json';
          let name = req.body.input_json_name[i] ? req.body.input_json_name[i] : `${req.body.input_json_key[i]} ${req.body.input_json_operator[i]} ${req.body.input_json_compare_value[i]}`;
          detectCondition.push([req.body.input_json_key[i], req.body.input_json_operator[i], req.body.input_json_compare_value[i], name]);
        } else if (req.body.input_json_key[i] && req.body.input_json_operator[i] && req.body.input_json_operator[i] === '@') {
          detectMethod = 'json';
          let name = req.body.input_json_name[i] ? req.body.input_json_name[i] : `${req.body.input_json_key[i]} ${req.body.input_json_operator[i]} ${i}`;
          detectCondition.push([req.body.input_json_key[i], req.body.input_json_operator[i], , name]);
        } else {
          ret.status = 2;
        }
        
      });
  
    }
    
    
    let endMethod = null;
    let endCondition = [];
    
    if (req.body.endMethod === 'regex') {
    
      req.body.input_endregex_expression.forEach((expression, i) => {
        
        if (req.body.input_endregex_expression[i] && req.body.input_endregex_index[i] && req.body.input_endregex_operator[i] && req.body.input_endregex_compare_value[i]) {
          endMethod = 'regex';
          let name = req.body.input_endregex_name[i] ? req.body.input_endregex_name[i] : `${req.body.input_endregex_expression[i]} ${req.body.input_endregex_operator[i]} ${req.body.input_endregex_compare_value[i]}`;
          endCondition.push([req.body.input_endregex_expression[i], parseInt(req.body.input_endregex_index[i]), req.body.input_endregex_operator[i], req.body.input_endregex_compare_value[i], name ]);
        } else if (req.body.input_endregex_expression[i] && req.body.input_endregex_operator[i] && req.body.input_endregex_operator[i] === '@' && req.body.input_endregex_index[i]  ) {
          endMethod = 'regex';
          let name = req.body.input_endregex_name[i] ? req.body.input_endregex_name[i] : `${req.body.input_endregex_expression[i]} ${req.body.input_endregex_operator[i]} ${i}`;
          endCondition.push([req.body.input_endregex_expression[i], parseInt(req.body.input_endregex_index[i]), req.body.input_endregex_operator[i], , name ]);
        } else {
          ret.status = 2;
        }
        
      });
    
    } else if (req.body.input_endMethod === 'json') {
  
      req.body.input_endjson_key.forEach((jsonKey, i) => {
        
        if (req.body.input_endjson_key[i] && req.body.input_endjson_operator[i] && req.body.input_endjson_compare_value[i]) {
          endMethod = 'json';
          let name = req.body.input_endjson_name[i] ? req.body.input_endjson_name[i] : `${req.body.input_endjson_key[i]} ${req.body.input_endjson_operator[i]} ${req.body.input_endjson_compare_value[i]}`;
          endCondition.push([req.body.input_endjson_key[i], req.body.input_endjson_operator[i], req.body.input_endjson_compare_value[i], name]);
        } else if (req.body.input_endjson_key[i] && req.body.input_endjson_operator[i] && req.body.input_endjson_operator[i] === '@') {
          endMethod = 'json';
          let name = req.body.input_endjson_name[i] ? req.body.input_endjson_name[i] : `${req.body.input_endjson_key[i]} ${req.body.input_endjson_operator[i]} ${i}`;
          endCondition.push([req.body.input_endjson_key[i], req.body.input_endjson_operator[i], , name]);
        } else {
          ret.status = 2;
        }
        
      });
  
    } else {
      endMethod = null;
    }
    
    
    
    if (ret.status === 2) {
      return res.json(ret);
    }
  
    const customHeader = {};
    // input_customHeaderKey
    
    if (req.body.input_customHeaderKey && Array.isArray(req.body.input_customHeaderKey)) {
      req.body.input_customHeaderKey.forEach((header, i) => {
        if (header) {
          customHeader[header.toLowerCase()] = req.body.input_customHeader[i]; 
        }
      });
    }
    
    let interval = parseInt(req.body.input_interval);
    if (isNaN(interval)) {
      interval = 60;
    }
    let retryInterval = parseInt(req.body.input_retryInterval);
    if (isNaN(retryInterval)) {
      retryInterval = 300;
    }
    let reAlertInterval = parseInt(req.body.input_reAlertInterval);
    if (isNaN(reAlertInterval)) {
      reAlertInterval = 300;
    }
    
    if (req.body.input_retryInterval.startsWith('x')) {
      retryInterval = parseInt(req.body.input_retryInterval.replace(/^x/, ''));
      if (isNaN(retryInterval)) {
        retryInterval = interval;
      } else {
        retryInterval = interval * retryInterval;
      }
    }
    
    if (req.body.input_reAlertInterval.startsWith('x')) {
      reAlertInterval = parseInt(req.body.input_reAlertInterval.replace(/^x/, ''));
      if (isNaN(reAlertInterval)) {
        reAlertInterval = interval;
        console.log('realert interval no found');
      } else {
        reAlertInterval = interval * reAlertInterval;
        console.log('realert interval', reAlertInterval);
      }
    }
    
    let params = req.body.input_params;
    if (!Array.isArray(params) || !params[0]) {
      console.log('non array params detected');
      params = [];
    }
    
    let evaluationPreprocess = req.body.input_evaluationPreprocess;
    let evaluationPostprocess = req.body.input_evaluationPostprocess;
    
    const props = {
      monitorName:    req.body.input_monitorName,
      description:    req.body.input_description,
      webMethod:      req.body.input_webMethod,
      webPath:        req.body.input_webPath,
      webCustomHeader: customHeader,
      webCustomBody:     req.body.input_customBody || null,
      detectMethod:   detectMethod,
      detectConditionAndOr: req.body.input_condition_multiplematch === 'AND' ? 'AND' : 'OR',
      detectCondition: detectCondition,
      interval: interval * 1000,
      retryInterval: retryInterval * 1000,
      reAlertInterval: reAlertInterval * 1000,
      endWithDetection: req.body.input_set_endWithDetection ? true : false,
      webErrorAlert: req.body.input_set_webErrorAlert ? true : false,
      endMethod: endMethod,
      endConditionAndOr: req.body.input_endcondition_multiplematch === 'AND' ? 'AND' : 'OR',
      endCondition: endCondition,
      params: params,
      evaluationPreprocess: evaluationPreprocess,
      evaluationPostprocess: evaluationPostprocess
    }
    
    /*
    const props = {
      monitorName: 'raspberrypi',
      webMethod: 'GET',
      webPath: 'https://kerus.net:8443/sysinfo/summary',
      detectMethod: 'json',
      //detectCondition: [ ['memory.utilization', '>=', 70] ],
      //detectCondition: [ ['cpu.usage', '>=', 20] ],
      detectCondition: [ 
          ['cpu.usage', '>=', 80], 
          ['memory.utilization', '>=', 70],
          ['network.trafficUtilization', '>=', 80, '트래픽 사용량(%)'],
          ['network.trafficBOTHumanReading', '$', , '트래픽 사용량']
        ],
      detectConditionAndOr: 'OR',
      endWithDetection: false,
      interval: 5000
    }
    */
  
    const monitorID = MonitorManager.registerMonitor(props);
    const monitor = MonitorManager.retrieveMonitor(monitorID);

    ret.monitorID = monitorID;
    ret.status = 1;
    ret.message = 'OK';
    res.json(ret);
    
  } catch (e) {
    ret.status = 4;
    ret.message = e.message;
    console.error(e);
    res.json(ret);
  }

});

router.get('/list(s)?', (req, res) => {
  
  const monitors = MonitorManager.retrieveAllMonitors();
  // received Data size : ?
  // last parsed data: 034355..
  res.json({
    monitors: monitors
  });
  
});

router.post('/start', async (req, res) => {
  
  const ret = {};
  ret.status = 3;
  ret.message = 'error';
  const monitorID = parseInt(req.body.id);
  if (MonitorManager.startMonitor(monitorID)) {
    ret.status = 1;
    ret.message = 'success';
  }
  
  res.json(ret);
  
});

router.post('/restart', async (req, res) => {
  
  const ret = {};
  ret.status = 3;
  ret.message = 'error';
  
  const monitorID = parseInt(req.body.id);
  if (MonitorManager.stopMonitor(monitorID)) {
    MonitorManager.startMonitor(monitorID);
    ret.status = 1;
    ret.message = 'success';
  }
  
  res.json(ret);
  
  
});

router.post('/stop', async (req, res) => {
  const ret = {};
  ret.status = 3;
  ret.message = 'error';
  
  const monitorID = parseInt(req.body.id);
  if (MonitorManager.stopMonitor(monitorID)) {
    ret.status = 1;
    ret.message = 'success';
  }
  
  res.json(ret);
});

router.all('/delete/:id', async (req, res) => {
  
  const ret = {};
  ret.status = 3;
  ret.message = 'error';
  
  if (MonitorManager.unregisterMonitor(req.params.id)) {
    ret.status = 1;
    ret.message = 'success';
  }
  
  res.json(ret);
  
});

module.exports = router;

const SERVER_ENV = require('../config.json');
const MONITOR_SAVEPATH = `${process.cwd()}/_save_monitors.json`;
const Monitor = require('./Monitor');
const fs = require('fs');

const sleep = require('util').promisify(setTimeout);

class MonitorManager {
  
  static monitors = {};
  static monitorIDindex = 1;
  
  static scheduleActive = true;
  
  static registerMonitor(props) {
    const monitorID = MonitorManager.monitorIDindex++;
    MonitorManager.monitors[monitorID] = new Monitor();
    
    const monitor = MonitorManager.monitors[monitorID];
    
    monitor.monitorID             = monitorID;
    monitor.monitorName           = props.monitorName                   || '무제1';
    monitor.description           = props.description                   || '';
    monitor.webMethod             = props.webMethod                     || null;
    monitor.webPath               = props.webPath                       || 'http://example.com';
    monitor.webCustomHeader       = props.webCustomHeader               || {};
    monitor.webCustomBody         = props.webCustomBody                 || null;
    monitor.detectMethod          = props.detectMethod                  || null;
    monitor.detectCondition       = props.detectCondition               || [];
    monitor.detectConditionAndOr  = props.detectConditionAndOr          || 'AND';
    monitor.endWithDetection      = props.endWithDetection !== undefined ? props.endWithDetection : false;
    monitor.endMethod             = props.endMethod                     || '';
    monitor.endCondition          = props.endCondition                  || [];
    monitor.endConditionAndOr     = props.endConditionAndOr             || 'AND';
    monitor.params                = props.params                        || [];
    monitor.evaluationPreprocess  = props.evaluationPreprocess          || 'return PROCESS.OK;';
    monitor.evaluationPostprocess = props.evaluationPostprocess         || 'return PROCESS.OK;';

    
    if (props.endCondition === undefined) {
      if (monitor.endWithDetection) {
        props.endCondition = false;
      } else {
        props.endCondition = '@';
      }
    } else {
      if (!Array.isArray(props.endCondition) || !props.endCondition.length) {
        props.endCondition = '@';
      }
    }
    
    monitor.webErrorAlert         = props.webErrorAlert !== undefined ? props.webErrorAlert       : false;
    
    monitor.interval              = props.interval                      || 60000;
    monitor.retryInterval         = props.retryInterval                 || props.interval * 5;
    monitor.reAlertInterval       = props.reAlertInterval               || 60000;

    monitor.state                 = props.state                         || 'INIT';

    monitor.alertingMethod        = 'discord';
    monitor.alertMessage          = '상태 정보가 변경되었습니다.';

    console.log('CREATED MONITOR #', monitorID);
    
    /*
    if (monitor.state === 'INIT')
      monitor.scheduler();
    */
    
    return monitorID;
  }
  
  static editMonitor(monitorID, props) {
    // TODO
  }
  
  static unregisterMonitor(monitorID) {
    console.log('DELETED MONITOR #', monitorID);
    delete MonitorManager.monitors[monitorID];
    return 1;
  }
  
  static startMonitor(monitorID) {
    const retrieveMonitor = MonitorManager.retrieveMonitor(monitorID);
    if (retrieveMonitor) {
      if (retrieveMonitor.state === 'ENDED' || retrieveMonitor.state === 'STOPPED' || retrieveMonitor.state === 'INIT') {
        retrieveMonitor.state = 'INIT';
        retrieveMonitor.nextStartTime = 0;
        setTimeout(() => {
          retrieveMonitor.state = 'READY';
        }, 500);
        return 1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }
  
  static stopMonitor(monitorID) {
    const retrieveMonitor = MonitorManager.retrieveMonitor(monitorID);
    if (retrieveMonitor) {
      retrieveMonitor.state = 'STOPPED';
      return 1;
    } else {
      return 0;
    }
  }
  
  static retrieveMonitor(monitorID) {
    if (MonitorManager.monitors[monitorID]) {
      return MonitorManager.monitors[monitorID];
    } else {
      return 0;
    }
  }
  
  static retrieveAllMonitors() {
    return MonitorManager.monitors;
  }
  
  static scheduler() {
    
    const scheduleState = ['READY', 'RUNNING_RETRY', 'ALERTEDWAIT'];
    
    (async() => {
      
      while (MonitorManager.scheduleActive) {
        const monitors = MonitorManager.retrieveAllMonitors();
      
        for (let monitorID in monitors) {
          
          const monitor = monitors[monitorID];
          
          if (scheduleState.indexOf(monitor.state) !== -1) {
            
            // monitor.nextStartTime이 0인경우
            if (!monitor.nextStartTime ||
                (monitor.nextStartTime && new Date().getTime() > monitor.nextStartTime)
                ) {
                  
              // 비동기 호출이다! 성능(스레드)문제는 nodejs가 잘 해결 해줄것임^^
              // 문제는 state상태를 외부요인으로 바꿨을 때 중복 호출 될 가능성이 있다.
              monitor.schedule();
            }
            
          }
          
        }
        
        await sleep(1000); 
      }
      
    })();
    
    
  }
  
}

MonitorManager.scheduler();

module.exports = MonitorManager



process.stdin.resume();

// DUMPDATA READING 필요
let loaded = null;
fs.readFile(MONITOR_SAVEPATH, (err, data) => {
  if (err) {
    fs.writeFileSync(MONITOR_SAVEPATH, JSON.stringify({}));
  } else {
    
    const mJSON = JSON.parse(data);
    let maxKey = 0;
    Object.keys(mJSON).forEach(key => {
      
      if (['STOPPED', 'ENDED', 'INIT'].indexOf(mJSON[key].state) === -1) {
        mJSON[key].state = 'READY';
      }
      
      MonitorManager.monitorIDindex = parseInt(key);
      MonitorManager.registerMonitor(mJSON[key]);  
      console.log(`[LOADER] Monitor ${key} Loaded`);
      if (key > maxKey) {
        maxKey = parseInt(key);
      }
    });
    
    MonitorManager.monitorIDindex = parseInt(maxKey + 1);
    
  }
  loaded = true;
});




function exitHandler(options, exitCode) {
    if (options.cleanup) {
      console.log('clean');
      fs.writeFileSync(MONITOR_SAVEPATH, JSON.stringify(MonitorManager.retrieveAllMonitors()));
    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
//process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


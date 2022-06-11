const wait = (mills, timerRefCallback) => { 
  return new Promise((resolve, reject) => { 
    const timer = setTimeout(() => {
      resolve();
      if (typeof timerRefCallback === 'function') {
        timerRefCallback(timer, resolve);
      }
    }, mills); 
    
  });
}

     
// PRE/POSTPROCESSING
const PROCESS = {};
PROCESS.CONTINUE = 0;
PROCESS.OK       = 1;
PROCESS.ERROR    = 2;
PROCESS.END      = 3;
PROCESS.ALERT    = 4;

const axios = require('axios');
axios.defaults.timeout = 60 * 1000;
const querystring = require('querystring');

/*

  Operator:
    'NOT': none value match (not found / not defined)
    'IN' : (array) value 
    'INKEY': (key_array) value

    ex:- processList INKEY rproxy.js
       38992) rproxy.js
       38993) bash


    AND (array.split) / OR (array.split)

*/

const operator = ['=', '==', '!=', '>', '<', '>=', '<=', '$'];
const operating = (operand1, operator, operand2) => {
  
  let ret = false;
  
  if (typeof operand1 === "undefined") return false;
  
  switch (operator) {
    case '=':
    case '==':
      ret = operand1 == operand2;
      break;
    case '!=':
      ret = operand1 != operand2;
      break;
    case '>':
      ret = operand1 > operand2;
      break;
    case '<':
      ret = operand1 < operand2;
      break;
    case '>=':
      ret = operand1 >= operand2;
      break;
    case '<=':
      ret = operand1 <= operand2;
      break;
    case '$':
      // 절대로 성립하지 않지만. 단순히 필드 노출용 연산자임..
      ret = false;
      break
    case '@':
    default:
      throw new Error('Programming Error');
  }
  
  return ret;
  
}


const getDescendantPropValue = (obj, modelName) => {

  let arr = modelName.split(".");
  let val = obj;
  for (let i = 0; i < arr.length; i++) {
    val = val[arr[i]];
  }

  return val;
}

// https://stackoverflow.com/questions/11922383/how-can-i-access-and-process-nested-objects-arrays-or-json
function flatten(obj){
 var root = {};
 (function tree(obj, index){
   var suffix = toString.call(obj) == "[object Array]" ? "]" : "";
   for(var key in obj){
    if(!obj.hasOwnProperty(key))continue;
    root[index+key+suffix] = obj[key];
    if( toString.call(obj[key]) == "[object Array]" )tree(obj[key],index+key+suffix+"[");
    if( toString.call(obj[key]) == "[object Object]" )tree(obj[key],index+key+suffix+".");   
   }
 })(obj,"");
 return root;
}


class Monitor {
  
  constructor() {
    
    this.monitorID       = -1;
    this.monitorName     = 'ExamMonitor';
    this.description     = '';
    this.webMethod       = 'GET';
    this.webPath         = 'https://kerus.net:8443/sysinfo/summary';
    this.webCustomHeader = {};
    this.webCustomBody   = '';
    
    this.boot            = false;
    
    this.evaluationPreprocess = 'return PROCESS.OK';
    this.evaluationPostprocess = 'return PROCESS.OK';
    
    this.evaluationData  = {};
    this.tempData        = {};
    this.tempDataDisableInfoFields = false;
    
    this.lastData        = '';
    this.lastProceedData = [];
    
    // detectMethod: data (null) / regex / regexextract condition / jsonKey condition
    // regexextract:change / jsonkey:change
    this.detectMethod    = 'json';
    
    /*
    
      regex: [ [regexExtract, index, operator, value, [definedName?] ]
      regex: [ ['^\<(html)' , 1, '=', 'value'] ]
      regex: [ ['^\<(html)'] (length == 1) / ['^\<(html)', '@'] (lengthisth == 2)
      
      json: [ [key , operator, value, [definedName] ] ]
      json: [ ['data.BTC', '>=', 80000000] ]
      json: [ ['data.BTC', '@' ] ]
    
      @ 의 경우: 이전 값에서 변경됨
    
    */
    
    //this.detectCondition = [ ['cpu.usage', '>=', 20], ['memory.utilization', '>=', 50] ]; // AND, OR
    this.detectCondition   = [ ['network.trafficINHumanReading', '@' ] ]
    this.detectConditionAndOr = 'OR';
    
    // TODO::!!!!!!!! state: ALERTING->ENDED
    this.endMethod = 'json';
    this.endCondition      = [ [ ] ];
    this.endConditionAndOr = [ [ ] ];

    /*
      TODO:
        예약기능 / 시작알림?
        run bash (via dianogstic tools?)
        - bash이유 : preprocessing이 필요한 작업의 지원이 힘들기 때문..
    */

    // main information에서 이 데이터를 0 index에 50바이트정도만 잘라서 출력한다..
    this.lastConditionInformation = [];
    
    this.endWithDetection = false;
    this.webErrorAlert    = true;
    
    this.interval        = 5000;
    this.retryInterval   = 60000;
    this.reAlertInterval = this.retryInterval;
    this.startTime       = 0;
    this.nextStartTime   = 0;
    this.lastUpdate      = 0;

    //hook은 POST로 해야한다.
    //this.hooks           = 'https://www.kerus.net';
    this.state          = 'READY';
    // INIT, READY, BOOTING,  RUNNING, RUNNING(RETRY), PARSING, ALERTING, ALERTEDWAIT(go to running), ENDED(endwith), STOPPED(go to init)
    this.stateMessage   = 'normal';
    // discord-simpreative, discord-private2, ...
    this.alertingMethod  = 'discord';
    this.alertMessage    = '';
    
    this.params = [];
    
    // TODO!!!!
    this.overrideAlertIgnore = false;
    
  }
  
  /*
  getProps() {
    returns this;
  }
  */
  
  // TODO: STOP시 axios abort를 해야함?
  
  async run() {
    
    const supportedMethods = ['GET', 'POST', 'FETCH', 'PUSH', 'DELETE'];
    const nowMethod = supportedMethods.indexOf(this.webMethod) !== -1 ? this.webMethod.toLowerCase() : 'get';
    
    try {
      
      let fetch = null;
 
      
      let webObject = {};
      webObject.webPath         = this.webPath;
      webObject.webCustomHeader = Object.assign(this.webCustomHeader);
      webObject.webCustomBody   = this.webCustomBody;
      webObject.params          = this.params;
      
      //let webObject = this;
      
      try {
        const preprocess = Function.apply(null, ['axios', 'querystring', 'PROCESS', 'webObject', 'web', this.evaluationPreprocess]);
        const preprocessResult = await preprocess(axios, querystring, PROCESS, webObject, this);
        switch (preprocessResult) {
          case PROCESS.CONTINUE:
            this._log('PREPROCESS CONTINUE:');
            break;
          case PROCESS.OK:
            break;
          case PROCESS.ERROR:
            return {status: 0, message: 'PREPROCESS Returned ERROR'};
            break;
          default:
            throw new Error('PREPROCESS RETURN ERROR')
            break;
        }
        
      } catch (e) {
        this._log('PREPROCESSING ERROR', e);
        return {status: 0, e: e};
      }
      
      //////////////////////////////////////////////////
      // AXIOS PROCESS
      
      if (!webObject.webCustomHeader['user-agent']) {
        webObject.webCustomHeader['accept']     = '*/*';
        webObject.webCustomHeader['accept-encoding'] = 'gzip, deflate';
        webObject.webCustomHeader['accept-language'] = 'en-US,en;';
        webObject.webCustomHeader['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.69 Safari/537.36';
      }
      
      if (webObject.webCustomBody && nowMethod !== 'get') {
        fetch = await axios[nowMethod](webObject.webPath, webObject.webCustomBody, {
          headers: webObject.webCustomHeader,
          transformResponse: (res) => {
            // Do your own parsing here if needed ie JSON.parse(res);
            return res;
          }
        });
      } else {
        fetch = await axios[nowMethod](webObject.webPath, {
          headers: webObject.webCustomHeader,
          transformResponse: (res) => {
            // Do your own parsing here if needed ie JSON.parse(res);
            return res;
          }
        });
      }
      
      this.lastData = fetch.data;
      this.lastUpdate = new Date().getTime();
      
//      f.log(require('crypto').createHash('md5').update(fetch.data).digest("hex"))
      
      return {status: 1};
      
    } catch (e) {
      this._log('Axios Error', e);
      return {status: 0, e: e};
    }
      
  }
  
  async conditionProcess(endCondition) {
    
    if (!endCondition)
    this.state = 'PARSING';
    await wait(100);
    try {
      
      let conditionOK = false;
      let currentConditionInformation = [];
      
      if (!this.boot) {
        if (this.checkStopped()) return;
        this.state = 'BOOTING';
        this.boot = true;
        this.lastProceedData = this.lastData;
        return {status: 0, message: 'Not booted'};
      }
      
      let vDetectMethod     = endCondition ? this.endMethod : this.detectMethod;
      let vDetectCondition  = endCondition ? this.endCondition : this.detectCondition;
      let vDetectAndOr      = endCondition ? this.endConditionAndOr : this.detectConditionAndOr;
      
      if (!vDetectMethod && !endCondition) {
        
        if (this.lastData !== this.lastProceedData[0]) {
          conditionOK = true;  
          currentConditionInformation.push(this.lastProceedData[0]);
        }
        
        this.lastProceedData = [this.lastData];
        
      } else if (vDetectMethod === 'regex') {
        // REGEX COMPARISON
        
        let conditionOKCount = 0;
        
        vDetectCondition.forEach((conditions, i) => {
          // [regexExtract, index, operator, value]
          
          if (!conditions.length) {
            return {status: 2, message: 'condition parse error'};
          } else if (conditions.length == 1) {
            
            const testRegex = new RegExp(conditions[0]);
            const matchRegex = testRegex.exec(this.lastData);
            
            if (matchRegex) {
              currentConditionInformation.push({
                name: conditions[0],
                value: matchRegex[1]
              });
              conditionOKCount++;
            } else {
              currentConditionInformation.push({
                name: conditions[0],
                value: 'REGEXNOTMATCHED'
              })
            }
            
          } else {
            
            const testRegex = new RegExp(conditions[0]);
            const matchRegex = testRegex.exec(this.lastData);
            
            if (matchRegex) {

              currentConditionInformation.push({
                name: conditions[0],
                value: matchRegex[conditions[1]],
                //adds: `${conditions[0]} (idx: ${conditions[1]}) ${conditions[2]} ${conditions[3]}`
                adds: conditions[4] ? conditions[4] : `${conditions[0]} (idx: ${conditions[1]}) ${conditions[2]} ${conditions[3]}`
              });
              
              if (conditions[2] === '@') {
                
                if (this.lastConditionInformation[i] && 
                  (
                    this.lastConditionInformation[i].value != matchRegex[conditions[1]] ||
                    (typeof this.lastConditionInformation[i].value === "undefined" && matchRegex[conditions[1]]))
                  ) 
                {
                  conditionOKCount++;
                }
                
              } else if (operating(matchRegex[conditions[1]], conditions[2], conditions[3])) {
                conditionOKCount++;  
              }
              
            } else {
              currentConditionInformation.push({
                name: conditions[0],
                value: 'undefined'
              });
            }
            
          }
          
        });
        
        if (!endCondition) {
          this.lastProceedData = [...currentConditionInformation];
          this.lastConditionInformation = [...currentConditionInformation];
        }
        
        if (vDetectAndOr === 'AND' && conditionOKCount >= this.detectCondition.length) {
          conditionOK = true;
        } else if (vDetectAndOr === 'OR' && conditionOKCount >= 1) {
          conditionOK = true;
        }
        
        
      } else if (vDetectMethod === 'json') {
        
        let conditionOKCount = 0;
        
        vDetectCondition.forEach((conditions, i) => {
          
          if (!conditions.length) {
            return {status: 2, message: 'condition parse error'};
          } else if (conditions.length == 1) {
            // json: [ [key] ]
            
            const parseJSON = JSON.parse(this.lastData);
            //const fetchKey = getDescendantPropValue(parseJSON, conditions[0]);
            const flats = flatten(parseJSON);
            const _fetchKey = flats[conditions[0]];
            const fetchKey = typeof _fetchKey === "string" ? _fetchKey : undefined;

            currentConditionInformation.push({
              name: conditions[0],
              value: fetchKey
            });
            
            if (typeof fetchKey !== 'undefined') {
              //fetchData.push(fetchKey);
              conditionOKCount++;
            }
            
          } else {
            //json: [ [key , operator, value ] ]
            
            const parseJSON = JSON.parse(this.lastData);
            //const fetchKey = getDescendantPropValue(parseJSON, conditions[0]);
            const flats = flatten(parseJSON);
            const _fetchKey = flats[conditions[0]];
            const fetchKey = typeof _fetchKey === "string" ? _fetchKey : undefined;
            
            if (conditions[1] === '@') {
              
              if (this.lastConditionInformation[i] && 
                (
                  this.lastConditionInformation[i].value != fetchKey ||
                  (typeof this.lastConditionInformation[i].value === "undefined" && typeof fetchKey !== "undefined")
                )) {
                conditionOKCount++;
              }
              
            } else if (operating(fetchKey, conditions[1], conditions[2])) {
              //fetchData.push(fetchKey);
              conditionOKCount++;  
            }
            
            currentConditionInformation.push({
              name: conditions[0],
              value: fetchKey,
              //adds: `${conditions[0]} ${conditions[1]} ${conditions[2]}`
              adds: conditions[3] ? conditions[3] : `${conditions[0]} ${conditions[1] === '@' ? '' : conditions[1] + ' ' + conditions[2]}`
            });
            
          }
          
        });
        
        if (!endCondition) {
          this.lastProceedData = [...currentConditionInformation];
          this.lastConditionInformation = [...currentConditionInformation];
          
        }
        
        if (vDetectAndOr === 'AND' && conditionOKCount >= vDetectCondition.length) {
          conditionOK = true;
        } else if (vDetectAndOr === 'OR' && conditionOKCount >= 1) {
          conditionOK = true;
        }

      } else {
        return {status: 2, message: 'no detect method selected'};
      }
      
      
      
      ////////////////////////////////////////////////////
      // POST PROCESS
      /*
      let webObject = {};
      webObject.webPath         = this.webPath;
      webObject.webCustomHeader = Object.assign(this.webCustomHeader);
      webObject.webCustomBody   = this.webCustomBody;
      webObject.lastData        = this.lastData;
      webObject.lastConditionInformation = this.lastConditionInformation;
      webObject.evaluationData  = this.evaluationData;
      webObject.params          = this.params;
      */
      let webObject = this;
      
      try {
        const postprocess = Function.apply(null, ['axios', 'querystring', 'PROCESS', 'web', this.evaluationPostprocess]);
        const postprocessResult = await postprocess(axios, querystring, PROCESS, webObject);
        switch (postprocessResult) {
          case PROCESS.CONTINUE:
            conditionOK = false;
            break;
          case PROCESS.OK:
            break;
          case PROCESS.ERROR:
            conditionOK = false;
            this._log('POSTPROCESS RETURNED ERROR');
            return {status: 2, message: 'POSTPROCESS RETURNED ERROR'};
          case PROCESS.END:
            this.endMonitor();
            conditionOK = true;
            return {status: 3};
          case PROCESS.ALERT:
            conditionOK = true;
          default:
            throw new Error('POSTPROCESS RETURN ERROR')
        }
        
      } catch (e) {
        this._log('POSTPROCESSING ERROR', e);
        return {status: 2, e: e};
      }
      
      
      if (conditionOK) {
        //this.alerting();
        return {status: 1};
      } else {
        return {status: 2, message: 'fetch success/condition fail'};
      }
      
      
    } catch (e) {
      this._log('parse error', e);
      return {status: 2, message: 'parse error', e: e};
    }
      
    
  }
  
  async endConditionProcess() {
    // conditionProcess()가 너무 길어서 작성
    if (this.endMethod) {
      return await this.conditionProcess(true);  
    } else {
      return {status: 0}
    }
    
  }
  
  async alerting(withError) {
    // method: discord, and ...
    this.state          = 'ALERTING';
    this.stateMessage   = 'alerting';
    
    let _messaage = this.alertMessage;
    if (!this.alertMessage) {
      _messaage = '상태 정보가 변경되었습니다';
    }
    
    const conditionInfo = [];
    
    if (!withError) {
      
      
      if (this.tempDataDisableInfoFields) {
        // DO NOTHING
      } else if (Object.keys(this.evaluationData).length) {
        
        for (let key in this.evaluationData) {
          conditionInfo.push({
            name: key,
            value: this.evaluationData[key]
          });
        }
        
      } else {
        if (!this.detectMethod) {
          conditionInfo.push({
            name: 'DATA CHANGE',
            value: 'CHANGED'
          });
        } else {
          
           this.lastConditionInformation.forEach(obj => {
             
             conditionInfo.push({
               name: obj.adds ? obj.adds : obj.name,
               value: obj.value
             })
             
           });
          
        }
      }
      
      
    } else {
      this.stateMessage   = 'error-with-alerting';
      _messaage = withError.message;
    }
    
    try {
      
      
      let discordSpecific = {
        mentionUserID: '271164238511210498',
        channelID: '201758409358311424',
        dm: false
      }
       
      if (this.params.length) {
        if (this.params[0] === 'discordspecific') {
          if (this.params[1]) {
            if (this.params[1].toLowerCase() === 'dm' && this.params[2]) {
              discordSpecific.dm = true;
              discordSpecific.mentionUserID = this.params[2];
            } else {
              discordSpecific.channelID = this.params[1];
            }
          } else {
            discordSpecific.mentionUserID = null; 
          }
        }
      }
      
      const newJSON = {
        mentionUserID: discordSpecific.mentionUserID,
        accessKey: 'helloworld',
        channelID: discordSpecific.channelID,
        dm: discordSpecific.dm,
        message: _messaage,
        identifierName: 'webmonitor-dev',
        embed: {
          url: this.tempData.embedURL || `https://webmonitor-dev.kerus.net/admin/monitor/${this.monitorID}`,
          title: this.tempData.title || this.monitorName,
          //fields: conditionInfo,
          thumbnail: this.tempData.thumbnailURL || null,
          author: this.tempData.author || null,
        },
      }
        
      if (conditionInfo.length) {
        newJSON.embed.fields = conditionInfo;
      }
      
      await axios.post('https://messagepush.kerus.net/gw-discord/generate-message', JSON.stringify(newJSON), {
          headers: {'Content-Type': 'application/json'}
        });
        
      return {status: 1};
      
    } catch (e) {
      this._log('tower sending error', e);
      return {status: 2, message: e.message};
    }
    
  }
  
  endMonitor() {
    this.state = 'ENDED';
    console.log(`Monitor#${this.monitorID}(${this.monitorName}) was stopped.`)
  }
  
  checkStopped() {
    return this.state === 'STOPPED';
  }
  
  async schedule() {
    
    if (this.checkStopped() || this.state === 'ENDED') return;
    this.state = 'RUNNING';
    
    this.startTime = new Date().getTime();
    this.nextStartTime = 0; 
    
    let _interval;
    _interval = this.interval;
      
    
    const run = await this.run();
    this.lastUpdate = new Date().getTime();
    
    if (this.checkStopped()) return;
      
    if (run.status === 1) {
      
      const conditionProcess = await this.conditionProcess();
      
      if (conditionProcess.status === 1) {
        await this.alerting();
        
        if (this.checkStopped()) return;
        
        this.state = 'ALERTEDWAIT';
        if (this.endWithDetection) {
          this.state = 'ENDED';
          return this.endMonitor();
        } else {
          
          const endConditionProcess = await this.endConditionProcess();
          
          if (endConditionProcess.status === 1) {
            this._log('endCondition detect', endConditionProcess);
            return this.endMonitor();
          }
          
          if (this.checkStopped()) return;
          
        }
        _interval = this.reAlertInterval;
      }
      
    } else {
      // axios 오류
      this._log('axios error debug;');
      
      if (this.checkStopped()) return;
      
      // 여기서  RUNNING-> this.state가 변경되지 않는 오류 발생함.
      if (this.state != "BOOTING") {
        this.state = 'RUNNING_RETRY';
        _interval = this.retryInterval;
      }  
      
      if (this.webErrorAlert) {
        this.state = 'ALERTEDWAIT';
        this.alerting(run.e);
        this._log('WEB ERROR ALERTING', run);
        _interval = this.reAlertInterval;
      }
    }
      
    const ignoreChangeState = ['READY', 'RUNNING_RETRY', 'ALERTEDWAIT'];
    if (ignoreChangeState.indexOf(this.state) === -1) {
      this.state = 'READY';
    }
    this.nextStartTime = new Date().getTime() + _interval;

  }
  
  _log(...messageParam) {
    messageParam.forEach(message => {
      if (typeof message === 'string' || message instanceof String) {
        console.log(`[${this.monitorName}(${this.monitorID}) ${message}`);
      } else {
        if (message instanceof Error) {
          console.error(`[${this.monitorName}(${this.monitorID}) ${message.message}`);
          console.error(message.stack);
        }
      }
    });
  }

  
}


module.exports = Monitor
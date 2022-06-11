Date.prototype.yyyymmdd = function() {
    let mm = this.getMonth() + 1;
    let dd = this.getDate();
  
    return [this.getFullYear(),
            (mm>9 ? '' : '0') + mm,
            (dd>9 ? '' : '0') + dd
           ].join('');
    };
    
    Date.prototype.hhmmss = function() {
    let hh = this.getHours();
    let mm = this.getMinutes();
    let ss = this.getSeconds();
  
    return [(hh>9 ? '' : '0') + hh,
            (mm>9 ? '' : '0') + mm,
            (ss>9 ? '' : '0') + ss,
           ].join('');
    };

    
    const wait = (mills) => { 
      return new Promise((resolve, reject) => { 
        setTimeout(() => {
          resolve();
        }, mills); 
      });
    }
const electron = require('electron');
const shell = require('electron').shell;
const ipc = require('electron').ipcRenderer;
const os = require('os');
const xlsx = require('node-xlsx');
//const xls = require('xlsjs');
const remote = require('electron').remote;
const BrowserWindow = require('electron').remote.BrowserWindow;
const path = require('path');
const Datastore = require('nedb');
const globalShortcut = require('electron').remote.globalShortcut;
const fs = require('fs');

// 处理监听，并释放 会让主程监听失效
//electron.remote.getCurrentWindow().removeAllListeners();

// 定义默认加价标准金额
const DEFAULTKEYPRICE = 100;

// 创建数据库
const db = new Datastore({filename: __dirname + '/data.db', autoload: true});
db.loadDatabase(function(err) {
    if(err) alert("加载数据库失败，原因：" + err);
});

// 页面所有按钮列表
//const fullscreenFix = document.getElementById('fullscreenFix');
const importData = document.getElementById('importData');
const exportData = document.getElementById('exportData');
const search = document.getElementById('search');
const settings = document.getElementById('settings');
const help = document.getElementById('help');


// 导入excel文件
importData.addEventListener('click', function(event) {
    ipc.send('warning-import-tips');
});

ipc.on('warning-import-back', function(event, response) {
    if(!response) {
	ipc.send('open-file-dialog');
    }
});
// 获取用户选择的excel文件
ipc.on('selected-files', function(event, path) {
    if(path) {
	let workSheetsFromFile = xlsx.parse(path[0]);
	let importData = workSheetsFromFile[0].data.splice(1);
	// remove all math data
	db.remove({}, {multi: true}, function(err, numRemoved) {
	    if(!err) {
		for(let i = 0, l = importData.length; i < l; i++) {
		    let doc = {
			biaodihao: importData[i][0], // 标的号
			zhonglei: importData[i][1], // 种类
			guige: importData[i][2], // 规格
			dengji: importData[i][3], // 等级
			yanse: importData[i][4], // 颜色
			shuliang: importData[i][5], // 数量
			qipaijia: importData[i][6], // 起拍价
			chengjiaojia: importData[i][7], // 成交价
			chengjiaohao: importData[i][8] // 成交号
		    };
		    db.insert(doc, function(err, newDocs) {
			if(err) alert('导入出现异常，错误：' + errr);
			initFindData();
		    });
		}
	    }
	});

    };
});
// 导出excel数据
exportData.addEventListener('click', function(event) {
    ipc.send('open-directory-dialog');
});

ipc.on('selected-directory', function(err, path) {
    if(path) {
	let tempArray = [];
	let titleCol = ['标的号','种类','规格','等级','颜色','数量','起拍价','成交价','成交号'];
	tempArray.push(titleCol);
	db.find({biaodihao: {$exists: true}}).sort({biaodihao: 1}).exec(function(err, docs) {
	    if(!err) {
		for(let i = 0, l = docs.length; i < l; i++ ) {
		    let _temp = [docs[i].biaodihao, docs[i].zhonglei, docs[i].guige, docs[i].dengji, docs[i].yanse, docs[i].shuliang, docs[i].qipaijia, docs[i].chengjiaojia, docs[i].chengjiaohao];
		    tempArray.push(_temp);
		}
		let _path = path[0] + '/export.xls';
		let buffer = xlsx.build([{name: "jingbiao", data: tempArray}]);
		fs.writeFile(_path, buffer, function(err) {
		    if (err) throw err;
		    alert('导出成功，文件在：' + _path); //文件被保存
		});
	    }
	});
    }
});

// 系统设置
settings.addEventListener('click', function(event) {
    let settings = JSON.parse(localStorage.getItem('settings')) || {priceArg: ''};
    let html = `<form class="pure-form-aligned pure-form settings-box animated bounceIn">
<div class="pure-control-group">
            <label for="name">系数：</label>
            <input id="priceArg" type="text" placeholder="请输入系数" value="${settings.priceArg}">
        </div>
<div class="pure-control-group">
            <label for="name"></label>
<span class="setting-tips"><i class="fa fa-info-circle" aria-hidden="true"></i>修改成交价每次增加或者减少多少价格</span>
        </div>
<div class="pure-controls">
            <a id="submitSettings" class="pure-button pure-button-primary">保存</a><a id="cancelSettings" class="pure-button">回到首页</a>
        </div>
</form>`;
    document.getElementById('contentData').innerHTML = html;

    const priceArg = document.getElementById('priceArg');
    const submitSettings = document.getElementById('submitSettings');
    const cancelSettings = document.getElementById('cancelSettings');

    cancelSettings.addEventListener('click', function(event) {
	let items = JSON.parse(sessionStorage.getItem('items'));
	createHtml(items[0]);
    });

    submitSettings.addEventListener('click', function(event) {
	let setting = {
	    priceArg: priceArg.value ? priceArg.value : DEFAULTKEYPRICE
	};
	localStorage.setItem('settings', JSON.stringify(setting));
	alert('保存成功！');
    });
    
});

// 搜索功能
search.addEventListener('click', function(event) {
    // 取消注册的全局快捷键
    ipc.send('disable-global-key');
    let html = `<form class="pure-form search-box animated bounceIn"><input type="text" placeholder="输入标的号" id="searchKey"><a class="pure-button pure-button-primary" id="searchGo">搜索</a><a class="pure-button" id="homeGo">取消</a></form>`;
    document.getElementById('contentData').innerHTML = html;

    const homeGo = document.getElementById('homeGo');
    const searchGo = document.getElementById('searchGo');

    homeGo.addEventListener('click', function(event) {
	ipc.send('enable-global-key');
	let items = JSON.parse(sessionStorage.getItem('items'));
	createHtml(items[0]);
    });
    
    searchGo.addEventListener('click', function(event) {
	let searchKey = document.getElementById('searchKey').value;
	if(!searchKey) {
	    alert('不允许为空');
	    return false;
	}

	db.find({biaodihao: parseInt(searchKey)}, function(err, docs) {
	    if(docs.length) { // 这里目前没考虑多条情况，前提标的号可重复
		ipc.send('enable-global-key');
		createHtml(docs[0]);
	    } else {
		alert("查找的标的不存在！");
	    }
	    
	});
    });
});

// help
help.addEventListener('click', function(event) {
    const modalPath = path.join('file://', __dirname, 'help.html');
    let win = new BrowserWindow({width:500, height: 400, frame: false });
    win.on('close', function () { win = null; });
    win.loadURL(modalPath);
    win.show();
});
// fullscreen
//fullscreenFix.addEventListener('click', function(event) {
 //   let electronScreen = remote.screen;
  //  let size = electronScreen.getPrimaryDisplay().workAreaSize;
   // mainWindow = new BrowserWindow({width: size.width, height: size.height});
//});

const createHtml = function(data, index) {
    let emptyHtml = `<div class="empty-box"><i class="fa fa-file-excel-o fa-4" aria-hidden="true"></i>没有数据！请先导入:)</div>`;
    if(!data) {
	document.getElementById('contentData').innerHTML = emptyHtml;
	return false;
    }
let html = `
  <form id-data="${data._id}" idIndex="${index}" class="pure-form pure-form-aligned pure-form-center animated fadeIn">
    <fieldset>
        <div class="pure-control-group">
          <label for="name">标的号：</label>
	  <span>${data.biaodihao}</span>
        </div>

        <div class="pure-control-group">
          <label for="foo">种类：</label>
	  <span>${data.zhonglei}</span>
	</div>

	<div class="pure-control-group">
          <label for="foo">规格：</label>
	  <span>${data.guige}</span>
	</div>
	
	 <div class="pure-control-group">
          <label for="foo">等级：</label>
	  <span>${data.dengji}</span>
	 </div>

	  <div class="pure-control-group">
          <label for="foo">颜色：</label>
	  <span>${data.yanse}</span>
	 </div>

	 <div class="pure-control-group">
          <label for="foo">数量：</label>
	  <span>${data.shuliang}只</span>
	 </div>

	  <div class="pure-control-group">
          <label for="foo">起拍价：</label>
	  <span>${data.qipaijia}元</span>
	 </div>
        
	  <div class="pure-control-group">
            <label for="foo">成交价：</label>
	  <input id="donePrice" type="text" default-data="${data.chengjiaojia}" value="${data.chengjiaojia}" placeholder="成交价"/>
	 </div>

        <div class="pure-control-group">
          <label for="password">成交号：</label>
	  <span id="dealNo">${data.chengjiaohao}</span>
        </div>        
	  <div class="pure-controls">
	    <a class="pure-button pure-button-primary" id="saveData">保存</a>
	    <a class="pure-button" id="delData">删除</a>
         </div>
    </fieldset>
  </form>
`;

    document.getElementById('contentData').innerHTML = html;

    const saveData = document.getElementById('saveData');
    const delData = document.getElementById('delData');
    const idData = document.getElementsByTagName('form')[0].getAttribute('id-data');
    const donePrice = document.getElementById('donePrice');
    const defaultData = donePrice.getAttribute('default-data');
    const _id = document.getElementsByTagName('form')[0].getAttribute('idIndex');

    saveData.addEventListener('click', function(event) {
	ipc.send('save-tips');
	ipc.on('save-back', function(event, response) {
	    if(!response) {
		
		db.update({_id: idData}, {$set: {chengjiaojia: parseInt(donePrice.value)}}, {}, function(err, numReplaed) {
		    if(numReplaed) {
			initFindData(_id);
		    };
		});
	    }
	});
    });
    delData.addEventListener('click', function(event) {
	ipc.send('del-tips');
	ipc.on('del-back', function(event, response) {
	    if(!response) {
		
		let items = JSON.parse(sessionStorage.getItem('items'));
		db.remove({_id: idData}, {}, function(err, numRemoved) {
		    if (numRemoved) {
		
			if(items.length <= 1) {
			    alert('数据全部删除！');
			    createHtml(0);
			} else {
			    initFindData();
			    createHtml(items[currentIndex], currentIndex);
			}
		    }
		});
	    }
	});
    });
};


// 分页

let currentIndex = 0;
let nextIndex;

function nextCellForm(index) {
    let _index = index;
    let items = JSON.parse(sessionStorage.getItem('items'));
    let totalIndex = items.length;

    if(_index >= totalIndex) {
	currentIndex = 0;
	_index = 0;
    }
    createHtml(items[_index], _index);
}

function preCellForm(index) {
    let _index = index;
    let items = JSON.parse(sessionStorage.getItem('items'));
    let totalIndex = items.length;
    
    if(_index < 0) {
	currentIndex = totalIndex;
	_index = totalIndex - 1;
    } else if(_index === currentIndex){
	if(_index === 0 || currentIndex === 0) {
	    currentIndex = totalIndex;
	    _index = totalIndex - 1;
	} else {
	    _index = currentIndex -1;
	}

    } 

    createHtml(items[_index], _index);
}

Date.prototype.pattern=function(fmt) {         
    var o = {         
    "M+" : this.getMonth()+1, //月份         
    "d+" : this.getDate(), //日         
    "h+" : this.getHours()%12 == 0 ? 12 : this.getHours()%12, //小时         
    "H+" : this.getHours(), //小时         
    "m+" : this.getMinutes(), //分         
    "s+" : this.getSeconds(), //秒         
    "q+" : Math.floor((this.getMonth()+3)/3), //季度         
    "S" : this.getMilliseconds() //毫秒         
    };         
    var week = {         
    "0" : "天",         
    "1" : "一",         
    "2" : "二",         
    "3" : "三",         
    "4" : "四",         
    "5" : "五",         
    "6" : "六"        
    };         
    if(/(y+)/.test(fmt)){         
        fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));         
    }         
    if(/(E+)/.test(fmt)){         
        fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "星期" : "周") : "")+week[this.getDay()+""]);         
    }         
    for(var k in o){         
        if(new RegExp("("+ k +")").test(fmt)){         
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));         
        }         
    }         
    return fmt;         
};
     

function initFindData(index) {
    let date = new Date();      
    let formatDate = date.pattern("yyyy-MM-dd EEE HH:mm:ss");
    const currentDate = document.getElementById('currentDate');
    const dataHtml = `<span><i class="fa fa-clock-o" aria-hidden="true"></i>
${formatDate}</span>`;
    currentDate.innerHTML = dataHtml;
    db.find({biaodihao: {$exists: true}}).sort({biaodihao: 1}).exec(function(err, docs) {
	if(!err) {
	    if(index) {
		createHtml(docs[index], index);
	    } else {
		createHtml(docs[0], 0);
	    }
	    sessionStorage.setItem('items', JSON.stringify(docs));
	}
    });
};

initFindData();



// 注册按键事件

function nextRight() {
	
    nextCellForm(currentIndex + 1);
    currentIndex++;
}
function nextLeft() {
	
    preCellForm(currentIndex - 1);
    currentIndex--;
}

function nextUp() {
    let tempSettings = JSON.parse(localStorage.getItem('settings')) || {priceArg: DEFAULTKEYPRICE};
    let KEYPRICE = tempSettings.priceArg;
    let donePrice = document.getElementById('donePrice');
    donePrice.value = parseInt(donePrice.value) +  parseInt(KEYPRICE);
}

function nextDown() {
    let tempSettings = JSON.parse(localStorage.getItem('settings')) || {priceArg: DEFAULTKEYPRICE};
    let KEYPRICE = tempSettings.priceArg;
    let donePrice = document.getElementById('donePrice');
    if(parseInt(donePrice.value) < 100) {
	donePrice.value = 0;
	alert('最低价格，不能再减了');
	return false;
    }
    donePrice.value = parseInt(donePrice.value) - parseInt(KEYPRICE);
}

ipc.on('right-page', function(event, message) {
    if(message) {
	nextRight();
    } 
});

ipc.on('left-page', function(event, message) {
    if(message) {
	nextLeft();
    } 
});

ipc.on('up-page', function(event, message) {
    if(message) {
	nextUp();
    } 
});

ipc.on('down-page', function(event, message) {
    if(message) {
	nextDown();
    } 
});




const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = require('electron').ipcMain;
const dialog = require('electron').dialog;
const globalShortcut = electron.globalShortcut;



// 监听客户选择的目录
ipc.on('open-directory-dialog', function(event) {
    dialog.showOpenDialog({
	properties: ['openDirectory']
    },function(files) {
	if(files) {
	    event.sender.send('selected-directory', files);
	}
    });
});

// 监听客户选择的文件
ipc.on('open-file-dialog', function(event) {
    dialog.showOpenDialog({
	filters:[
	    {name: 'Excel', extensions: ['xlsx']}
	],
	properties: ['openFile']
    },function(files) {
	if(files) {
	    event.sender.send('selected-files', files);
	}
    });
});
// 提示用户保存
ipc.on('save-tips', function(event) {
    dialog.showMessageBox({
	type: 'warning',
	buttons: ['确认', '放弃'],
	message: '确认会覆盖原来数据，请确认是否要保存？',
	defaultId: 1,
	title: '注意'
    },function(response) {
	event.sender.send('save-back', response);
    });
});
// 提示用户删除后果
ipc.on('del-tips', function(event) {
    dialog.showMessageBox({
	type: 'warning',
	buttons: ['确认', '放弃'],
	message: '删除数据就无法找回，请确认是否要删除？',
	defaultId: 1,
	title: '注意'
    },function(response) {
	event.sender.send('del-back', response);
    });
});
// 提示用户导入的后果
ipc.on('warning-import-tips', function(event) {
    dialog.showMessageBox({
	type: 'warning',
	buttons: ['确认导入', '放弃'],
	message: '导入会覆盖原来数据，请确认是否要导入？',
	defaultId: 1,
	title: '注意'
    },function(response) {
	event.sender.send('warning-import-back', response);
    });
});

let mainWindow = null;

const createWindow = function() {
	let electronScreen = electron.screen;
  	let size = electronScreen.getPrimaryDisplay().workAreaSize;
    let windowOptions = {
	width: size.width,
	height: size.height,
	minWidth: 800,
	title: app.getName()
    };

    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.loadURL('file://' + __dirname + '/index.html');
//    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', function() {
	mainWindow = null;
    });
    let webContents = mainWindow.webContents;
    function registerShortcut() {
	globalShortcut.register('Right', function() {
	    webContents.send('right-page', true);
	});
	globalShortcut.register('Left', function() {
	    webContents.send('left-page', true);
	});
	globalShortcut.register('Up', function() {
	    webContents.send('up-page', true);
	});
	globalShortcut.register('Down', function() {
	    webContents.send('down-page', true);
	});
	
    }
    mainWindow.on('blur', function() {
	let win = BrowserWindow.getFocusedWindow();
	if(win) return;
	globalShortcut.unregisterAll();
    });

    mainWindow.on('focus', function() {
	registerShortcut();
    });
};

app.on('window-all-closed', function() {
    if(process.platform != 'darwin') {
	app.quit();
    }
});

app.on('will-quit', function () {
    globalShortcut.unregisterAll();
});

app.on('ready', function() {
    createWindow();
});

app.on('activate', function() {
    if(mainWindow === null) {
	createWindow();
    }
});

app.on('browser-window-blur', function () {
    globalShortcut.unregisterAll();
});



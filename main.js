'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const storage = require('electron-json-storage');
var Menu = require("menu");
var dialog = require('dialog');
var fs = require('fs');
var wrench = require('wrench');
var shell = electron.shell;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null,
    crackedWindows = {},
    currentId = 0,
    shuttingDown=false;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('before-quit',function(e){
    e.preventDefault();
    shuttingDown=true;
    closeWindows();
});

function closeWindows() {
    if(BrowserWindow.getAllWindows().length) {
        if(BrowserWindow.getAllWindows()[0]) {
            BrowserWindow.getAllWindows()[0].close();
        }
    } else {
        app.exit(0);
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

    // Create the Application's main menu
    var template = [{
        label: "Application",
        submenu: [
            { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
        ]}, {
        label: "File",
        submenu: [
            { label: "New", accelerator: "CmdOrCtrl+N", click: function() { mainWindow = openCrackedWindow(); } },
            { label: "Open", accelerator: "CmdOrCtrl+O", click: function() { dialog.showOpenDialog(mainWindow,{
                filters: [
                    { name: 'Javascript', extensions: ['js'] }
                ],
                title:"Open a file",
                properties:["multiSelections","openFile"]

            },openFile); } },
            { label: "Save", accelerator: "CmdOrCtrl+S", click: function() { saveFile(); } },
            { label: "Close", accelerator: "CmdOrCtrl+W", click: function() {
                if(mainWindow) {
                    mainWindow.close();
                } else if(BrowserWindow.getAllWindows()[0]) {
                    BrowserWindow.getAllWindows()[0].close();
                }
            } }
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]}, {
        label: "Window",
        submenu: [
            { label: "Toggle Audio", accelerator: "CmdOrCtrl+M", click:muteWindow},
            { label: "Reload Window", accelerator: "CmdOrCtrl+R", click:reloadWindow},
            {
                label: 'Toggle Developer Tools',
                accelerator: (function () {
                    if (process.platform == 'darwin')
                        return 'Alt+Command+I';
                    else
                        return 'Ctrl+Shift+I';
                })(),
                click: function (item, mainWindow) {
                    if (mainWindow)
                        mainWindow.toggleDevTools();
                }
            }
        ]}, {
        label: "Themes",
        submenu: getThemes()
        },{
        label: "Help ",
        submenu: [{
                label:'Examples',
                submenu:getExamples()
            },
            {
                label:'Demos',
                submenu:getDemos()
            },
            {
                label:'Website',
                click:function(){
                    shell.openExternal('https://github.com/billorcutt/i_dropped_my_phone_the_screen_cracked');
                }
            }
        ]}
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    initializeAppFolders();

    mainWindow = openCrackedWindow();

    //it opens a window
    function openCrackedWindow() {

        var options = {width: 800, height: 600, webPreferences:{webSecurity:false}};

        //offset from current window
        if(mainWindow) {
            options.x = mainWindow.getBounds().x + 10;
            options.y = mainWindow.getBounds().y + 10;
        }

        // Create the browser window.
        var win = new BrowserWindow(options);

        //get the current theme
        storage.get("theme",function(error,data){
            if(!error && data && data.name) {
                win.webContents.executeJavaScript("crackedEditor.setOption(\"theme\", \""+data.name+"\");");
            }
        });

        // and load the index.html of the app.
        win.loadURL('file://' + __dirname + '/index.html');

        // Open the DevTools.
        //win.webContents.openDevTools();

        //focus
        win.on('focus',function(e){
            mainWindow = this;
            currentId = this.id;
        });

        //keep the window from closing before we can save
        win.on('close',function(e){
            e.preventDefault();
            return false;
        });

        // Emitted when the window is closed.
        win.on('closed', function(e) {
            delete crackedWindows[currentId];
            mainWindow = BrowserWindow.getFocusedWindow() || null;
            currentId = mainWindow ? mainWindow.id : 0;
            if(shuttingDown) {
                app.quit();
            }
        });

        crackedWindows[win.id]=win;

        return win;
    }

    //start menu
    //get an array of theme css from the theme directory
    //to build the menu
    function getThemes() {
        var path = app.getAppPath();
        var themes = fs.readdirSync(path+'/lib/editor/theme/');
        var result = [];
        if(themes && themes.length) {
            themes.map(function(item){
                var name = item.replace(/\.css/,'');
                result.push({
                    label:name,
                    click:function(){
                        mainWindow.webContents.executeJavaScript("crackedEditor.setOption(\"theme\", \""+name+"\");");
                        storage.set("theme",{"name":name});
                    }
                });
            });
        }
        return result;
    }

    //scan the demo folder and create a menu
    function getDemos() {
        var path = app.getAppPath();
        var demos = fs.readdirSync(path+'/Cracked/Demos/');
        var result = [];
        if(demos && demos.length) {
            demos.map(function(name){
                result.push({
                    label:name,
                    click:function(){
                        openFile([path+'/Cracked/Demos/'+name]);
                    }
                });
            });
        }
        return result;
    }

    //scan the examples folder and create a menu
    function getExamples() {
        var path = app.getAppPath();
        var examplesDirectories = fs.readdirSync(path+'/Cracked/Examples/');
        var result = [];
        if(examplesDirectories && examplesDirectories.length) {
            examplesDirectories.map(function(categoryDirectory){
                if(fs.lstatSync(path+'/Cracked/Examples/'+categoryDirectory).isDirectory()) {
                    result.push({
                        label:categoryDirectory,
                        submenu:[]
                    });
                    var examples = fs.readdirSync(path+'/Cracked/Examples/'+categoryDirectory);
                    if(examples && examples.length) {
                        examples.map(function(item){
                            result[result.length-1].submenu.push({
                                label:item,
                                click:function(){
                                    openFile([path+'/Cracked/Examples/'+categoryDirectory+'/'+item]);
                                }
                            })
                        });
                    }
                }
            });
        }
        return result;
    }

    //define some methods for opening & saving
    function openFile(path) {
        if(path && path.length) {
            for(var i=0;i<path.length;i++) {
                mainWindow = openCrackedWindow();
                mainWindow.webContents.executeJavaScript("openFile('"+path[i]+"')");
            }
        }
    }

    function saveFile() {
        mainWindow.webContents.executeJavaScript("saveFile()");
    }

    function initializeAppFolders() {
        var docPath = app.getPath('documents');
        if(docPath) {
            wrench.copyDirSyncRecursive(__dirname+'/Cracked', docPath+'/Cracked',{forceDelete:false,excludeHiddenUnix:true});
        }
    }

    function reloadWindow() {
        mainWindow.webContents.executeJavaScript("evalEditor()");
    }

    function muteWindow() {
        mainWindow.webContents.setAudioMuted(!mainWindow.webContents.isAudioMuted());
        var title = mainWindow.webContents.getTitle();
        if(title.indexOf("Muted")!=-1) {
            title = title.replace(/ \[Muted\]/,"");
        } else {
            title = title + " [Muted]";
        }
        mainWindow.webContents.executeJavaScript("document.title='"+title+"'");
    }

});
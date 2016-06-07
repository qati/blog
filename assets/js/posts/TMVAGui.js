function TMVAGui(filename, stageid, menuid){
    var mo    = this;
    var calls = [];
    var IAmTheFirst = true;
    var insidecall  = false;

    var types = {
        "kMVAType": 1,
        "kCompareType": 2,
        "kProbaType": 3,
        "kRarityType": 4
    };

    var findIndex = function(keys, name){
        for(var i in keys){
            if (keys[i].fName==name){
                return i;
            }
        }
        return -1;
    }

    var openFile = (function(){
        var File;
        var isOpened = false;
        return function(callback){
            if (isOpened==true){
                callback(File);
                return;
            }
            JSROOT.AssertPrerequisites("io", function() {
                new JSROOT.TFile(filename, function (file) {
                    File     = file;
                    console.log(file);
                    isOpened = true;
                    callback(file);
                });
            });
        }
    })();

    var callStack = function(){
        insidecall = true;
        for(var j=0,len=calls.length;j<len;j++){
            calls[j].func(calls[j].args);
        }
        insidecall = false;
    }

    var dirname="";

    var List = function(callback){
        var addObj = (function(){
            var i    = 0;
            var list = [];
            return function(obj){
                if (obj===-2) {
                    return i;
                } else if (obj===-1){
                    return list;
                } else {
                    if (obj.dir_name!==undefined){
                        if (dirname.indexOf(obj.dir_name)==-1){
                            dirname += "/"+obj.dir_name;
                        }
                        for(var j=0,len=obj.fKeys.length;j<len;j++){
                            list[i++] = obj.fKeys[j];
                        }
                    } else {
                        list[i++] = obj;
                    }
                }
            }
        })();
        openFile(function(file){
            var objs = addObj(-1);
            if (addObj(-2)==0) {
                for (var i in file.fKeys) {
                    file.ReadObject(file.fKeys[i].fName, function (obj) {
                        addObj(obj);
                    });
                }
            }
            callback(objs, file);
            if (!insidecall){
                callStack();
            }
        });
    }

    this.correlation = function(type){
        if (IAmTheFirst || insidecall) {
            IAmTheFirst = false;
            var tt = ["CorrelationMatrixS", "CorrelationMatrixB"];
            List(function (objs, file) {
                var idx = findIndex(objs, tt[type]);
                if (idx == -1) {
                    stage.innerHTML = tt[type] + " not found in " + filename + "!";
                    return;
                }
                file.ReadObject(dirname + "/" + objs[idx].fName, function (obj) {
                    console.log(obj);
                    JSROOT.draw(stageid, obj, "colz")
                });

            });

        } else {
            calls.push({"func":this.correlation, "args": type});
        }
    }

    var methodTitle = function(method, callback){
        openFile(function(file){
            file.ReadObject(dirname+"/Method_"+method, function(obj){
                callback(file, obj.fKeys[0].fName);
            });
        });
    }

    this.mvas = function(mode, method){
        if (IAmTheFirst || insidecall) {
            IAmTheFirst = false;
            methodTitle(method, function(file, title){
                var tit = dirname+"/Method_"+method+"/"+title+"/MVA_"+title;
                console.log(tit);
                file.ReadObject(tit+"_S", function(objS){
                    JSROOT.draw(stageid, objS, "samehist");
                    file.ReadObject(tit+"_B", function(objB){
                        JSROOT.draw(stageid,  objB, "samehist")
                    });
                });
            });
        }  else {
            calls.push({"func":this.mvas, "args": undefined});
        }
    }


    var callJQuery=function(){
        $(function() {
			require(['jquery', 'jquery-ui'], function($){
            $("#TMVAGuimenu").menu();
            $("#TMVAGuimenu li ul li").click(function(){
                var arr = $(this).attr("value").split(":");
                switch (arr[0]){
                    case "correlation":
                        var tt = {"Signal":0, "Background": 1};
                        $("#"+stageid).html("");
                        insidecall = true;
                        mo.correlation(tt[arr[1]]);
                        insidecall = false;
                        break;
                    case "mvas":
                        $("#"+stageid).html("");
                        insidecall = true;
                        mo.mvas(arr[1], arr[2]);
                        insidecall = false;
                        break;
                    default:
                        console.log("TMVAGui::callJQuery bad input from menu! arr[0]="+arr[0]);
                        break;
                }
            });	
			});
        });
    };

    this.menu = function(){
        if (IAmTheFirst || insidecall) {
            IAmTheFirst = false;
            List(function (objs, file) {
                var str = "<ul id='TMVAGuimenu'>", strtmp;
                var idx, counter;
                var len = objs.length;

                var corr = [
                    {"v":"CorrelationMatrixS", "name":"Signal"},
                    {"v":"CorrelationMatrixB", "name":"Background"}
                ];
                var lencorr = corr.length, j;
                counter = 0;
                strtmp = "";
                for(var i=0;i<len;i++){
                    for(j=0;j<lencorr;j++){
						console.log(objs[i]);
                        idx = objs[i].fName.indexOf(corr[j].v);
                        if (idx!=-1){
                            strtmp += "<li value='correlation:"+corr[j].name+"'>"+corr[j].name+"</li>";
                            counter++;
                            break;
                        }
                    }
                    if (counter==lencorr){
                        break;
                    }
                }
                if (counter==lencorr){
                    str += "<li>Input Variable Linear Correlation Coefficients<ul>"+strtmp+"</ul></li>";
                } else {
                    str += "<li class='ui-state-disabled'>Input Variable Linear Correlation Coefficients</li>";
                }

                var method;
                strtmp = "";
                counter = 0;
                for (var i = 0; i < len; i++) {
                    idx = objs[i].fName.indexOf("Method_");
                    if (idx!=-1){
                        method = objs[i].fName.substr(idx+7);
                        strtmp   += "<li value='mvas:"+types.kMVAType+":"+method+"'>"+method+"</li>";
                        counter ++;
                    }
                }
                if (counter>0){
                    str += "<li>Classifier Output Distributions (test sample)<ul>";
                    str += strtmp;
                    str += "</ul></li>";
                } else {
                    str += "<li class='ui-state-disabled'>Classifier Output Distributions (test sample)</li>";
                }

                str += "<li>Classifier Output Distributions (test and training samples superimposed)</li>";

                str += "</ul>";
                $("#"+menuid).append(str);
                callJQuery();
            });

        }  else {
            calls.push({"func":this.getMethods, "args": callback});
        }
    }
}

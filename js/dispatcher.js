$(document).ready(function () {
    init();
});

function init() {
    layui.use(['form', 'layer', 'laypage'], function () {
        var form = layui.form;
        var layer = layui.layer;
        var laypage = layui.laypage;

        form.on('select(treeType)', function (data) {
            window.location.href = "/location/toDispatcherJsp?treeType=" + data.value;
        });

        zTreeInit(layer);
        tabClick(form, layer);
        returnToOrganizationalStructure();
        searchUserTree();
    });
}

var searchUserTreeClick = false;//查询时多个节点加载的标记，会影响效率
var searchUserTreeUsers = [];//查询时获得数据数组

var parentNodeCheck = false;//勾选父节点加载选择全部子节点标记

var clickLocation = false;//定位点击标记

/**
 * 用户树初始化
 */
function zTreeInit(layer) {
    /**
     * 对zTree树进行配置
     */
    var setting = {
        async: {
            enable: true,//设置异步加载
            url: "/location/treeChildrenNodes?treeType=" + $("#treeType").val(),
            autoParam: ["id", "type", "customerNo", "teamNo"]//异步加载时自动提交的参数
        },
        data: {
            keep: {
                leaf: true,//锁定isParent为false的节点
                parent: true//保持父节点状态
            }
        },
        check: {
            enable: true,//设置选择框
            autoCheckTrigger: true,//设置选择方法回调
            chkStyle: "checkbox",//设置选择框类型
            chkboxType: {//设置勾选联动
                "Y": "ps",
                "N": "ps"
            }
        },
        callback: {
            onClick: zTreeOnClick,//设置点击回调方法
            beforeExpand: zTreeBeforeExpand,//设置展开前回调方法
            onCollapse: zTreeOnCollapse,//设置折叠成功后回调方法
            onAsyncSuccess: zTreeOnAsyncSuccess,//设置异步加载成功后回调方法
            onCheck: zTreeOnCheck
        }
    };
    /**
     * 获取顶级节点并初始化zTree树
     */
    $.post("/location/treeTopLevelNodes", {}, function (data, status) {
        if (status == "success") {
            if (data.sessionStatus == "timeOut") {
                var msg = "由于长时间未操作导致请求超时，是否重新登录";
                if (confirm(msg)) {
                    parent.window.location.href = "/index";
                }
            } else {
                var topLevelNodes = data.topLevelNodes;
                $.fn.zTree.init($("#tree"), setting, topLevelNodes);//初始化zTree
            }
        }
    }, "json");
}

/**
 * zTree树节点点击回调
 */
function zTreeOnClick(event, treeId, treeNode) {
    parentNodeCheck = false;
    if (clickLocation == true) {
        var markers = $("#demoAdmin")[0].contentWindow.markers;
        for (var i = 0; i < markers.length; i++) {
            if (treeNode.id == markers[i].id && treeNode.type == "user") {
                markers[i].marker.setAnimation("AMAP_ANIMATION_BOUNCE");
            } else {
                markers[i].marker.setAnimation("AMAP_ANIMATION_NONE");
            }
        }
    } else {
        if (treeNode.type != "user") {
            var isOpen = treeNode.open;
            var treeObj = $.fn.zTree.getZTreeObj("tree");//获取zTree对象
            if (isOpen == false) {
                zTreeBeforeExpand(treeId, treeNode);
            } else {
                treeObj.expandNode(treeNode, false, true, false, false);//可执行展开回调的方法
            }
        }
    }
}

/**
 * zTree树父节点展开前回调
 */
function zTreeBeforeExpand(treeId, treeNode) {
    clickLocation = false;
    parentNodeCheck = false;
    if (treeNode.type != "user") {
        var treeObj = $.fn.zTree.getZTreeObj("tree");
        treeObj.reAsyncChildNodes(treeNode, "refresh", false);//强行清除子节点后重新加载子节点
    }
}

/**
 * zTree树父节点折叠回调
 */
function zTreeOnCollapse(event, treeId, treeNode) {
    clickLocation = false;
    parentNodeCheck = false;
    var treeObj = $.fn.zTree.getZTreeObj("tree");
    treeObj.checkNode(treeNode, false, true);
}

/**
 * zTree树父节点强行重新加载子节点回调
 */
function zTreeOnAsyncSuccess(event, treeId, treeNode, msg) {
    clickLocation = false;
    var treeObj = $.fn.zTree.getZTreeObj("tree");
    /**
     * 查询加载节点的逻辑
     */
    if (searchUserTreeClick == true) {
        var rootNodes = treeObj.getNodesByParam("type", "children", null);
        for (var i = 0; i < rootNodes.length; i++) {//循环判断该节点是否已加载子节点，是则进入下一次循环，否则加载子节点，确保加载子节点只加载一次，若加载多次会影响效率
            if (rootNodes[i].zAsync == false) {
                treeObj.reAsyncChildNodes(rootNodes[i], "refresh", false);
            } else {
                continue;
            }
        }
        for (var i = 0; i < searchUserTreeUsers.length; i++) {
            function filterUser(node) {
                return (node.userId == searchUserTreeUsers[i].userId && node.type == "user");
            }

            var nodeUsers = treeObj.getNodesByFilter(filterUser, false); // 仅查找一个节点
            for (var j = 0; j < nodeUsers.length; j++) {
                treeObj.checkNode(nodeUsers[j], true, true);
            }
        }
    } else if (parentNodeCheck == true) {
        if (treeNode.type == "customer" || treeNode.type == "children") {
            var userNodes = treeObj.getNodesByParam("type", "user", treeNode);
            for (var i = 0; i < userNodes.length; i++) {
                treeObj.checkNode(userNodes[i], true, true);
            }
        }
        var rootNodes = treeObj.getNodesByParam("type", "children", treeNode);
        for (var i = 0; i < rootNodes.length; i++) {//循环判断该节点是否已加载子节点，是则进入下一次循环，否则加载子节点，确保加载子节点只加载一次，若加载多次会影响效率
            treeObj.checkNode(rootNodes[i], true, true);
            if (rootNodes[i].zAsync == false) {
                treeObj.reAsyncChildNodes(rootNodes[i], "refresh", false);
            } else {
                continue;
            }
        }
    }
}

/**
 * zTree树节点勾选回调
 */
function zTreeOnCheck(event, treeId, treeNode) {
    clickLocation = false;
    var treeObj = $.fn.zTree.getZTreeObj("tree");
    if (searchUserTreeClick == true) {
        var nodes = treeObj.getCheckedNodes(true);
        var newNodes = [];
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].type == "user") {
                newNodes.push(nodes[i]);
            }
        }
        if (newNodes.length == searchUserTreeUsers.length && searchUserTreeClick == true && searchUserTreeUsers.length != 0) {
            searchUserTreeClick = false;
        }
    } else if (treeNode.type != "user") {//勾选父节点加载选择全部子节点
        var isOpen = treeNode.open;
        if (isOpen == false) {
            parentNodeCheck = true;
            treeObj.reAsyncChildNodes(treeNode, "refresh");
        }
    }
}

/**
 * 真正查询的方法
 */
function searchUserTree() {
    $("#searchUserTree").click(function () {
        clickLocation = false;
        parentNodeCheck = false;
        searchUserTreeUsers = [];
        searchUserTreeClick = true;
        var deviceName = $("#deviceName").val();
        var treeObj = $.fn.zTree.getZTreeObj("tree");
        treeObj.checkAllNodes(false);
        $.post("/location/searchUserTree", {
            deviceName: deviceName,
            treeType: $("#treeType").val()
        }, function (data, status) {
            if (status == "success") {
                if (data.sessionStatus == "timeOut") {
                    var msg = "由于长时间未操作导致请求超时，是否重新登录";
                    if (confirm(msg)) {
                        parent.window.location.href = "/index";
                    }
                } else {
                    $.each(data, function (index, item) {
                        searchUserTreeUsers.push({customerNo: item.customerNo, userId: item.userId});
                    });

                    if (searchUserTreeUsers.length != 0) {
                        for (var i = 0; i < searchUserTreeUsers.length; i++) {

                            function filterUser(node) {
                                return (node.userId == searchUserTreeUsers[i].userId && node.type == "user");
                            }

                            var nodeUsers = treeObj.getNodesByFilter(filterUser, false); // 仅查找一个节点

                            function filterCustomer(node) {
                                return (node.customerNo == searchUserTreeUsers[i].customerNo && node.type == "customer");
                            }

                            var nodeCustomer = treeObj.getNodesByFilter(filterCustomer, true); // 仅查找一个节点
                            if (nodeUsers.length == 0) {
                                treeObj.reAsyncChildNodes(nodeCustomer, "refresh");
                                // treeObj.expandNode(nodeCustomer, true, true, true);
                            } else {
                                for (var j = 0; j < nodeUsers.length; j++) {
                                    treeObj.checkNode(nodeUsers[j], true, true);
                                }
                                treeObj.expandNode(nodeCustomer, true, true, true);
                            }
                        }
                    } else {
                        searchUserTreeClick = false;
                    }
                }
            }
        }, "json");
    });
}

/**
 * layui选项卡的点击事件，不使用layui提供的方法，通过css样式来进行 选项卡
 */
function tabClick(form, layer) {
    $("ul[class='layui-tab-title'] li").each(function () {
        $(this).click(function () {
            var id = $(this).attr("id");
            if (id == "predefinedGroups") {
                var treeObj = $.fn.zTree.getZTreeObj("tree");
                var nodes = treeObj.getCheckedNodes(true);
                createTempGroup(nodes);
            } else {
                $("ul[class='layui-tab-title'] li").removeClass();
                $(".layui-show").removeClass("layui-show");
                $("#organizationStructure").addClass("layui-this");
                $("#div_organizationStructure").addClass("layui-show");
                form.render();
            }
        });
    });
}

function createTempGroup(nodes) {
    var ueserids = [];
    var str = '';
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].type == "user") {
            str = str + '<div class="DeviceItem" style="border:solid 1px #efefef;">\n' +
                '                            <img src="../../../img/icon_person.jpg" style="position:absolute; left:20px; top:8px;">\n' +
                '                            <a style="position:absolute;top:0px; left:45px; text-decoration:none; color:#000000" href="javascript:void(0)"> ' + nodes[i].name + ' </a>\n' +
                '                            <a style=" text-align:center; position:absolute;right:20px; top:0px; color:#000000" href="javascript:void(0)" onclick="$(this).parent().remove()">删除</a>\n' +
                '                        </div>';
            ueserids.push(nodes[i].userId);
        }
    }
    if (ueserids.length > 0) {
        $("ul[class='layui-tab-title'] li").removeClass();
        $(".layui-show").removeClass("layui-show");
        $("#usersGroup").html(str);
        $("#predefinedGroups").addClass("layui-this");
        $("#div_predefinedGroups").addClass("layui-show");
        send(JSON.stringify(ueserids));
    } else {
        alert("您没有勾选用户或勾选的不是用户，请先勾选用户");
    }
}

/**
 * 对讲呼叫选项卡返回的方法
 */
function returnToOrganizationalStructure() {
    $("#returnToOrganizationalStructure").click(function () {
        $("ul[class='layui-tab-title'] li").removeClass();
        $(".layui-show").removeClass("layui-show");
        $("#organizationStructure").addClass("layui-this");
        $("#div_organizationStructure").addClass("layui-show");
    });
}


//发送消息
function send(content) {
    var name = document.getElementById('name').value;
    var id = document.getElementById('id').value;
    var messageJson = JSON.stringify({"type": "addTempGroup", "id": id, "name": name, "content": content});
    websocket.send(messageJson);
}

/**
 * 做起呼准备
 */
var callId = 0;

function call() {
    if (websocket == null || websocket.readyState != 1) {
        alert("连接已断开，请稍后再重试");
        return;
    }
    callId = Math.random() * 10000000;
    var name = document.getElementById('name').value;
    var id = document.getElementById('id').value;
    var teamNo = document.getElementById('teamNo').value;
    var messageJson = JSON.stringify({"type": "call", "id": id, "name": name, "content": teamNo + "-" + callId});
    websocket.send(messageJson);
}

/**
 * 通知对讲机呼叫终止
 */
function end() {

    var name = document.getElementById('name').value;
    var id = document.getElementById('id').value;
    var teamNo = document.getElementById('teamNo').value;
    var messageJson = JSON.stringify({"type": "end", "id": id, "name": name, "content": teamNo + "-" + callId});
    websocket.send(messageJson);
    document.getElementById('permit').value = 0;
}

function talk(blob) {
    websocket.send(blob);
}

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function play(blob) {
    var source = audioCtx.createBufferSource();
    var reader = new FileReader();
    reader.onload = function (e) {
        audioCtx.decodeAudioData(reader.result, function (buffer) {
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
        });
    }
    reader.readAsArrayBuffer(blob);
}

var clicked = true;

//开启录音 点击ptt按钮后开始录音
function record() {
    var permit = document.getElementById('permit').value;
    if (!permit || permit != 1) {
        alert("请先申请话权");
        return;
    }
    if (navigator.mediaDevices) {
        console.log('getUserMedia supported.');
        var constraints = {audio: true};
        var isok = MediaRecorder.isTypeSupported('audio/webm\;codecs=opus');
        console.log(isok);
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                var b = document.getElementById("stopbtn");
                var clicked = true;
                var play = true;
                var chunks = [];
                var mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm\;codecs=opus',
                    audioBitsPerSecond: 8000
                });
                var t;
                b.addEventListener("click", function (e) {
                    if (clicked) {
                        mediaRecorder.start();
                        clicked = false;
                        var fn = function () {
                            if (play) {
                                mediaRecorder.stop();
                                mediaRecorder.start();
                                t = setTimeout(fn, 200)
                            }
                        }
                        fn();
                    } else {
                        clearTimeout(t);
                        end();
                        mediaRecorder.stop();
                        play = false;
                    }
                });

                mediaRecorder.ondataavailable = function (evt) {
                    console.log(new Date().getTime() + "大小：" + evt.data.size);
                    chunks.push(evt.data);
                };
                mediaRecorder.onstop = function (evt) {
                    var blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'});
                    talk(blob);
                    chunks = [];
                };

                $("#stopbtn").click();
            });

    }
}

var websocket = null;
$(function () {
    connectWebSocket();//创建WebSocket
});

//强制关闭浏览器  调用websocket.close（）,进行正常关闭
window.onunload = function () {
    if (websocket != null) {
        websocket.close();
    }
};

//建立WebSocket连接
function connectWebSocket() {
    var url = window.location.href;
    var userId = document.getElementById('id').value;
    var sockurl = "wss:" + url.substring(6, url.indexOf("/", 8)) + "/WebSocketH5/ID=" + userId;
    //建立webSocket连接
    websocket = new WebSocket(sockurl);
    websocket.onopen = function () {
        console.log("webSocket建立连接成功...");
    };
    websocket.onclose = function () {
        reconnect();
    };
    websocket.onerror = function () {
        reconnect();
    };
    websocket.onmessage = function (msg) {
        var data = msg.data;
        if (data instanceof Blob) {
            console.log(data);
            play(data);
        } else {
            console.log(data);
            var result = JSON.parse(data);
            var messageTpye = result.type;
            if ("addTempGroup" == messageTpye) {// 创建临时群组
                if ("fail" == result.msg) {
                    alert("创建临时群组失败！请重试！");
                } else if ("success" == result.msg) {
                    document.getElementById('teamNo').value = result.teamNo;
                }
            } else if ("call" == messageTpye) {//请求话权
                if ("fail" == result.msg) {
                    alert("请求失败！请重试！");
                } else if ("success" == result.msg) {
                    document.getElementById('permit').value = 1;
                }
            } else if ("connect" == messageTpye) {//连接
                console.log(data);
            } else if ("talk" == messageTpye) {

            }
        }
    }
}

/**
 * webSocket断线3秒重连
 */
var timeout = null;
var lockReconnect = false;//避免重复连接
function reconnect() {
    if (lockReconnect || websocket.readyState == 1) {
        return;
    }
    lockReconnect = true;
    /**
     * 没连接上会一直重连，设置延迟避免请求过多
     */
    if (timeout != null) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(function () {
        connectWebSocket();
        lockReconnect = false;
    }, 3000);
}
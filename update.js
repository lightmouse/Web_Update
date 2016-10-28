/**
 * Created by wuguanghao on 2016-10-10.
 */

var debug = 1;   // 开启debug模式

/****************** 全局变量区 *************************/
var update_flag    = new Array(3);
var update_cpu_id  = new Array(3);
var update_version = new Array(4);


const STM32F7_CPU_ID = [0x12, 0x34, 0x56]; //暂定
const STM32F7_APP_FLAG = [ 'a', 'p', 'p']; //APP_bin
const STM32F7_BOOT_FLAG = ['b', 'o', 't']; //BOOT_bin

const TEST = ["1", "0", "0", "0"];
/******************************************************/

/***************** 显示隐藏的块 ***********************/
function display_select_file(id) {
    if (id.style.display == "none")
        id.style.display = "block";
    else if (id.style.display == "block")
        id.style.display = "none";

    document.getElementById('t1').value = "";  <!-- 清除文本显示框中的内容 -->
}
/*****************************************************/

/*****************************更新文件*************************************/
function start_update()
{
    var file_name  = document.getElementById('choose_file').files[0].name;

    check_update_file_name(file_name);

}
/*************************************************************************/

/******************      检查升级文件名     ********************************/

function check_update_file_name(name) {
    var check_suffix_status = compare_file_name(name);       <!-- 检测文件的后缀,查看是否时.bin文件 -->

    if (check_suffix_status == -1)
        Error_return();

    document.getElementById('t1').value = name;              <!-- 将获得的文件路径显示在文本框中 -->
    get_current_version();                                   <!-- 获取当前web服务器的版本号 -->
}
/*************************************************************************/


/********************    检测当前浏览器是否支持HTML5   ************************/
function isSupportFileApi() {
    if(window.File && window.FileList && window.FileReader && window.Blob) {
        return true;
    }
    return false;
}
/****************************************************************************/

/**********************   检测文件是否是bin文件    *****************************/
function compare_file_name(name){
    var update_file_suffix = ".bin";                <!-- 升级文件的后缀名始终为.bin -->
    var name_suffix = name.substr(name.length - 4); <!-- 获得文件名最后4个字符 -->

    if (update_file_suffix != name_suffix) {
        alert("非法文件格式，请重新选择文件");
        return -1;
    }
    return 0;
}
/****************************************************************************/

/****************  获得嵌入式web服务器的当前版本号   ************************/
function get_current_version() {
    var current_version = new Array(4);
    var count = 0;

    if (debug == 0) {
        $.post(
            "version.asp",
            {
                version: "current_version"
            },
            function (data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i] != '"' && data[i] != '.')
                        current_version[count++] = data[i] - "0" + 0x30; // 将字符型转化为十六进制值
                }
                read_update_file(current_version);
            }
        )
    }
    else
        read_update_file(current_version);
}
/***************************************************************************/

/* *************获得当前升级文件的标志位 ******************/
function get_update_flag(file, len) {
    var flag_len = 3;

    for (var i = 0; i < flag_len; i++)
        update_flag[i] = file[len - flag_len + i];

    return flag_len;
}
/*********************************************************/

/************ 获得当前升级文件中芯片ID *******************/
function get_update_cpu_id(file, len) {

    var id_len = 3;   //CPU_ID 占用3个字节

    for (var i = 0; i < id_len; i++)
        update_cpu_id[i] = file[len  - id_len + i];

    return id_len;    //返回芯片ID占用的字节数
}
/*********************************************************/

/************* 获得当前升级文件中的版本信息 ***************/
function get_update_version(file, len) {
    var version_len = 4;

    for (var i = 0; i < version_len; i++)
        update_version[i] = file[len - version_len + i];

    return version_len;
}
/***********************************************************/

/**********  比较开发板当前版本和选择升级文件的版本  ***************************/
function compare_version(file_contant, cur_version){

    var info_len = 0;
    var len      = file_contant.length;
    var current_version = cur_version;

    /* IE11 不支持 slice()方法  */
    // var update_info = file_contant.slice(file_contant.length - 7);     // 拷贝 bin文件的最后7个字节
    // var update_cpu_id = update_jnfo.slice(0, 3);  // 最后10个字节中, 前3个字节是 CPU_ID
    //var update_version = update_info.slice(3, 7);  // 最后10个字节中, 中间4个字节是版本号
    //var update_flag    = update_info.slice(7, 10); // 最后10个字节中, 后三个字节是bin标志位

    info_len = get_update_flag(file_contant, len);
    len -= info_len;

    info_len = get_update_version(file_contant, len);
    len -= info_len;

    info_len = get_update_cpu_id(file_contant, len);
    len -= info_len;

    if (update_cpu_id.toString() != STM32F7_CPU_ID.toString()) {
        alert("芯片信息不符, 请重新选择升级文件");
        Error_return();
        return;
    }
    var count = 0;
    for (var i = 0; i < 4; i++){
        if (update_version[i] > current_version[i]){
            if (confirm("是否开始升级?"))
                send_update_len(file_contant, len);
            else
                Error_return();
        }
        else if (update_version[i] < current_version[i]){
            if (confirm("升级版本低于当前版本, 是否降级?")) {
                if (confirm("是否开始降级?")) {
                    send_update_len(file_contant, len);
                }
                else
                    Error_return();
            }
            else
                Error_return();
        }
        else {
            ++count;
            if (count == 4){
                if (confirm("升级版本和当前版本相同, 是否继续升级?")){
                    if (confirm("是否开始升级"))
                        send_update_len(file_contant, len);
                    else
                        Error_return();
                }
                else
                    Error_return();
            }
        }
    }
}
/*************************************************************************/

/******************  比较选择的升级文件的版本号 **************************/
function read_update_file(cur_version) {

    if (isSupportFileApi() == false) {
        alert("该浏览器不支持HTML5文件API");
        Error_return();
    }
    var file = document.getElementById('choose_file').files[0];
    console.log("文件名:" + file.name + "大小:" + file.size);

    var reader = new  FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = function(data) {
        var chars = new Uint8Array(this.result);
        if (debug == 0)
              compare_version(chars, cur_version);
        else
            send_data(chars, chars.length);
    };
}
/***********************************************************************/

/************************ 发送升级文件的长度 ***************************/
function send_update_len(file, len) {
    $.post(
        "update.asp",
        {
            file_len:len,
            stop:0x00             //结束标志
        },

        function (data) {
            if (data != len) {
                alert("升级文件长度接收失败");
                Error_return();
            } else {
                send_data(file, len);
            }
        }
    )
}

/**************************  发送升级数据 ********************************/
var frame_count = 0;
var data_len    = 50;
var each_frame_num = 54;
var read_len    = 0;
var frame_buf = new Uint8Array(each_frame_num);      <!-- 帧编号占据2字节 + 50字节数据 + 1个字节CRC + 1个字节无效字符-->
var deg = 0;

function send_data(file_buf, file_len) {

    if (file_len <= 0)
        return;

    deg+=1;
    circleProgress(deg, 50);

    frame_count  = frame_count + 1;
    frame_buf[0] = frame_count  / 256;
    frame_buf[1] = frame_count  % 256;

    for (var i = 0; i < data_len; i++)
        frame_buf[2 + i] = file_buf[i + read_len];

    frame_buf[52] = check_sum(frame_buf, 52);
    frame_buf[53] = 0;

    read_len += data_len;

    if (debug == 0) {
        $.post(
            "update.asp",
            {
                string: frame_buf.toString()
            },

            function (data) {
                if (data == "ReplyOK")
                    send_data(file_buf, file_len - data_len);
                else {
                    if (confirm("数据发送错误, 是否重新升级?")) {
                        frame_count = 1;
                        start_update();
                    }
                    else
                        Error_return();
                }
            }
        )
    }
    else send_data(file_buf, file_len - data_len);

}
/************************* 校验和 *************************************/
function check_sum(buf, len) {
    var sum = 0;
    for (var i = 0; i < len; i++){
        sum += buf[i];
    }
    //return sum % 256;
    return sum;
}
/**********************************************************************/

/************************ 数据拷贝 ************************************/

function memcpy(src, dst, len) {

    for (var i = 0; i < len; i++)
        src[i] = dst[i];
}

function  Error_return() {
    var id = document.getElementById('d1');
    display_select_file(id);
}


/**        第三方进度条显示    **/

    function circleProgress(value,average){
        var canvas = document.getElementById("canvas");
        var context = canvas.getContext('2d');
        var _this = $(canvas),
            value= Number(value),// 当前百分比,数值
            average = Number(average),// 平均百分比
            color = "",// 进度条、文字样式
            maxpercent = 100,//最大百分比，可设置
            c_width = _this.width(),// canvas，宽度
            c_height =_this.height();// canvas,高度
        // 判断设置当前显示颜色
        if( value== maxpercent ){
            color="#29c9ad";
        }else if( value> average ){
            color="#27b5ff";
        }else{
            color="#ff6100";
        }
        // 清空画布
        context.clearRect(0, 0, c_width, c_height);
        // 画初始圆
        context.beginPath();
        // 将起始点移到canvas中心
        context.moveTo(c_width/2, c_height/2);
        // 绘制一个中心点为（c_width/2, c_height/2），半径为c_height/2，起始点0，终止点为Math.PI * 2的 整圆
        context.arc(c_width/2, c_height/2, c_height/2, 0, Math.PI * 2, false);
        context.closePath();
        context.fillStyle = '#ddd'; //填充颜色
        context.fill();
        // 绘制内圆
        context.beginPath();
        context.strokeStyle = color;
        context.lineCap = 'square';
        context.closePath();
        context.fill();
        context.lineWidth = 10.0;//绘制内圆的线宽度

        function draw(cur){
            // 画内部空白
            context.beginPath();
            context.moveTo(24, 24);
            context.arc(c_width/2, c_height/2, c_height/2-10, 0, Math.PI * 2, true);
            context.closePath();
            context.fillStyle = 'rgba(255,255,255,1)';  // 填充内部颜色
            context.fill();
            // 画内圆
            context.beginPath();
            // 绘制一个中心点为（c_width/2, c_height/2），半径为c_height/2-5不与外圆重叠，
            // 起始点-(Math.PI/2)，终止点为((Math.PI*2)*cur)-Math.PI/2的 整圆cur为每一次绘制的距离
            context.arc(c_width/2, c_height/2, c_height/2-5, -(Math.PI / 2), ((Math.PI * 2) * cur ) - Math.PI / 2, false);
            context.stroke();
            //在中间写字
            context.font = "bold 20pt Arial";  // 字体大小，样式
            context.fillStyle = color;  // 颜色
            context.textAlign = 'center';  // 位置
            context.textBaseline = 'middle';
            context.moveTo(c_width/2, c_height/2);  // 文字填充位置
            context.fillText(value+"%", c_width/2, c_height/2);
   //         context.fillText("正确率", c_width/2, c_height/2+20);
        }
        /*
        // 调用定时器实现动态效果
        var timer=null,n=0;
        function loadCanvas(nowT){
            timer = setInterval(function(){
                if(n>nowT){
                    clearInterval(timer);
                }else{
                    draw(n);
                    n += 0.01;
                }
            },15);
        }
        loadCanvas(value/100);
        timer=null;
        */
    }

/*
var canvas2d = document.getElementById("canvas").getContext("2d");

var test = function(deg){
    var r = deg*Math.PI/180;   //canvas绘制圆形进度
    canvas2d.clearRect(0,0,200,200);   //先清理
    canvas2d.beginPath();  //路径开始
    //canvas2d.fillStyle = "#"; //填充颜色
    canvas2d.strokeStyle = "#0066ff"; //canvas边框颜色
    canvas2d.lineWidth = 6; //线宽
    canvas2d.arc(100,100,50,0-90*Math.PI/180,r-90*Math.PI/180,false); //canvas绘制弧形
    //canvas2d.fill();
    canvas2d.stroke();
    //canvas2d.closePath();
};
*/
//添加延时功能

//使用定时器让html5 canvas绘制圆形进度动起来

/*
var t = setInterval(function(){
    deg+=10;
    test(deg);
    if(deg>360){
        clearInterval(t);
    }
    console.log(deg);
},20);
*/

//test();
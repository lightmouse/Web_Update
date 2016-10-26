/**
 * Created by wuguanghao on 2016-10-10.
 */

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
/*
        if (check_update_file_name(file_name) != 0){
            alert("文件格式错误,请重新选择升级文件");
            return;
        }
        check_update_file_version(file);

        if (check_update_file_version(file) != 0)
            return;

        if (send_update_data(file) != 0)
            if (confirm("升级失败, 是否重新升级"))
                continue;
            else {
                display_select_file('d1');
                return;
            }
    }
*/
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

/******************      检查升级文件版本    *******************************/
/*
function check_update_file_version()
{
    var file = document.getElementById('choose_file').files[0];
    compare_file_version(file);            <!-- 检测升级文件的版本号 -->
}
*/
/**************************************************************************/

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
    $.post(
        "version.asp",
        {
            version: "current_version"
        },
        function (data){
            for (var i = 0; i < data.length; i++){
                if (data[i] != '"' && data[i] != '.')
                    current_version[count++] = data[i] - "0" + 0x30; // 将字符型转化为十六进制值
            }
            read_update_file(current_version);
        }
    )
    //read_update_file(current_version);
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
    for (var i = 0; i < 4; i++){
        if (update_version[i] > current_version[i]){
            if (confirm("是否开始升级?"))
                send_update_data(file_contant, len);
            else
                Error_return();
        }
        else if (update_version[i] < current_version[i]){
            if (confirm("升级版本小于当前版本, 是否升级?")) {
                if (confirm("是否开始升级?"))
                    send_update_data(file_contant, len);
                else
                    Error_return();
            }
            else
                Error_return();
        }
        else {
            if (confirm("当前版本和升级版本相同, 是否升级?")){
                if (confirm("是否开始升级?"))
                    send_update_data(file_contant, len);
                else
                    Error_return();
            }
            else
                Error_return();
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
        compare_version(chars, cur_version);
    };
}
/***********************************************************************/

/**************************  发送更新文件 ********************************/
function send_update_data(file_contant, len) {
    var package_count = 1;                  <!-- 帧编号 -->
    var each_package_num = 50;              <!-- 每帧包含的文件数据 -->
    var send_data_buf = new Uint8Array(53); <!-- 每帧长度 : 帧编号(2字节) + 帧数据(50字节) + CRC8校验码(1字节)-->
    var count = 0;

    send_update_len(file_contant, len);
/*
    while (len){
        if (len > each_package_num){
            memcpy(send_data_buf, file_contant[count], each_package_num);
            len -= each_package_num;
            count += each_package_num;
        } else {
            memcpy(send_data_buf, file_contant[count], len);
            len = 0;
        }
    }

    while (1){
        //animloop();
        if (send_data(send_data_buf.toString(), 51) == -1)
            return -1;
    }
*/
}
/***********************************************************************/

/************************ 发送升级文件的长度 ***************************/
function send_update_len(file, len) {
    $.post(
        "update.asp",
        {
            file_len:"a=len&b=0x00"
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
function send_data(buf, data_len) {

    var ret = -1;

    $.post(
        "update.asp",
        {
            array: buf,
            len: data_len
        },

        function (data) {
            if (data == "ok")
                ret = 0;
        }
    )
}
/************************* 校验和 *************************************/
function check_sum(buf, len) {
    var sum = 0;
    for (var i = 0; i < len; i++){
        sum += buf[i];
    }
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
particle_no = 25;

window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame   ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
})();

var canvas = document.getElementsByTagName("canvas")[0];
var ctx = canvas.getContext("2d");

var counter = 0;
var particles = [];
var w = 400, h = 200;
canvas.width = w;
canvas.height = h;

function reset(){
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0,0,w,h);

    ctx.fillStyle = "#171814";
    ctx.fillRect(25,80,350,25);
}

function progressbar(){
    this.widths = 0;
    this.hue = 0;

    this.draw = function(){
        ctx.fillStyle = 'hsla('+this.hue+', 100%, 40%, 1)';
        ctx.fillRect(25,80,this.widths,25);
        var grad = ctx.createLinearGradient(0,0,0,130);
        grad.addColorStop(0,"transparent");
        grad.addColorStop(1,"rgba(0,0,0,0.5)");
        ctx.fillStyle = grad;
        ctx.fillRect(25,80,this.widths,25);
    }
}

function particle(){
    this.x = 23 + bar.widths;
    this.y = 82;

    this.vx = 0.8 + Math.random()*1;
    this.v = Math.random()*5;
    this.g = 1 + Math.random()*3;
    this.down = false;

    this.draw = function(){
        ctx.fillStyle = 'hsla('+(bar.hue+0.3)+', 10%, 10%, 1)';
        var size = Math.random()*2;
        ctx.fillRect(this.x, this.y, size, size);
    }
}

bar = new progressbar();

function draw(){
    reset();
//    counter++

    bar.hue += 0.8;

//    bar.widths += 2;
    if(bar.widths > 350){
        if(counter > 2){
            reset();
            bar.hue = 0;
            bar.widths = 0;
            counter = 0;
            particles = [];
        }
        else{
            bar.hue = 126;
            bar.widths = 351;
            bar.draw();
        }
    }
    else{
        bar.draw();
        for(var i=0;i<particle_no;i+=10){
            particles.push(new particle());
        }
    }
    update();
}

function update(){
    for(var i=0;i<particles.length;i++){
        var p = particles[i];
        p.x -= p.vx;
        if(p.down == true){
            p.g += 0.1;
            p.y += p.g;
        }
        else{
            if(p.g<0){
                p.down = true;
                p.g += 0.1;
                p.y += p.g;
            }
            else{
                p.y -= p.g;
                p.g -= 0.1;
            }
        }
        p.draw();
    }
}

function animloop() {
    draw();
    requestAnimFrame(animloop);
}

//animloop();
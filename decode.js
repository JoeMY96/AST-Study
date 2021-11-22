/*
var a = 123;
const b = -5;
let c = window;

function d(){
    var f = c.btoa("Hello");
    return a + b + f;
}




var a = 0x55,b = 0b10001001,c = 0o123456,
d = "\x68\x65\x6c\x6c\x6f\x2c\x41\x53\x65",
e = "\u0068\u0065\u006c\u006c\u006f\u002c\u0041\u0053\u0054";



var a = b.length;
var foo = {
  bar: function () {},
}
*/
a = b;

function test() {
  a = c;
  c = d;
  return c;
}

e = test();
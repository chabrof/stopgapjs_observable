require(['lib/mustache/mustache', '../observable.js'],
function (Mustache, Observable) {
  "use strict"

  var obj = {
    "attr1" : "foo",
    "attr2" : "bar",
    "func1" : function () { console.log('I use func1') }
  }
  console.log('Before observing it, We read attr1 of object :', obj.attr1)

  Observable.enrichObject(obj);
  console.log('Object :', obj)

  obj.addEventListener('func1', function(data) { console.log('we use func1 attribute', data) })
  obj.func1();
  /*obj.addEventListener('attr1', function(data) { console.log('we use attr1 attribute', data) })
  console.log('After observing it, We read attr1 of object :', obj.attr1)
  console.log('After observing it, We write attr1 of object')
  obj.attr1 = "write..."*/
});

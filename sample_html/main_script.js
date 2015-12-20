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

  obj.addEventListener('attr1', function(data) { console.log('we use attr1 attribute', data) })
  console.log('After observing it, We read attr1 of object :', obj.attr1)
  
});

require(['lib/mustache/mustache', '../observable.js'],
function (Mustache, Observable) {
  "use strict"

  var obj = {
    "attr1" : "foo",
    "attr2" : "bar",
    "func1" : function () { console.log('A pretty function !') }
  }
  console.log('Before observing it, We read attr1 of object :', obj.attr1)

  Observable.enrichObject(obj);
  console.log('Object :', obj)

  // observe using functions
  console.group('Observe func1');
  obj.addEventListener('func1', function(event) { console.log('==> we use func1 on obj', event) })
  obj.func1()
  console.groupEnd()
  // observes writing attribute
  console.group('Observe attrib1');
  obj.addEventListener('attr1', function(event) { console.log('==> we use attr1 attribute', event) })
  console.log('After adding an event listener, we read attr1 of object (wich is : ' + obj.attr1 + ')')
  console.log('..and we write in attr1')
  obj.attr1 = "write in attrib1..."
  console.groupEnd()

  console.group('Observe attrib2');
  // observes reading and writing attribute (the observation of "reading" is false by default, we activate it)
  obj.addEventListener('attr2', function(event) { console.log('==> we use attr2 attribute', event) }, { set: true, get: true })
  console.log('After adding an event listener, we read attr2 of object (wich is : ')
  console.log(obj.attr2 + ')') // the event is triggered before this console appears...because obj.attr2 is interpreted before the execution of console.log
  console.log('..and we write in attr2')
  obj.attr2 = "write in attrib2..."
  console.groupEnd()

  // a useless global (only if you want to manipulate obj in the console)
  window.obj = obj
});

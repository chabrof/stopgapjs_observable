// for node require compatibility (not usefull in sub modules)
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define([/*'require'*/], // here we get the requirejs object in order to set the cur path to the path of this top level file
  function (/*requirejs*/) {
    "use strict"
  	//requirejs.config({
  		//urlArgs: "bust=" + (new Date()).getTime()
  	//});

    var Observable = {}
    //var ClassP = Observable.prototype

    Observable._prefix = "sgjObs_"
    Observable._funcPrefix = Observable._prefix + "func_"

    Observable._init = function() {
      Observable._event2listener_label = Observable._prefix + 'eventType2listeners'
      Observable._lIdx2e_label = Observable._prefix + 'listenerIdx2event'
      Observable._modifiedAttribSet_label = Observable._prefix + 'derivatedAttribSet'
      Observable._listenersInfo_label = Observable._prefix + 'listenerIdx2eventPos'

      Observable._listenerGlobalIdx = -1

      Observable._defaultAttrListenerConfig = {
        "before" : false,
        "after"  : true,
        "annihilateSet" : false,
        "annihilateCall" : false,
        "set" : true,
        "get" : false,
        "exec" : true
      }
    }

    Observable._init();

    /**
     * config
     * set a configuration object to Observable, attribute can be "prefix", ...
     * this method can be done once
     * @return [undefined]
     */
    Observable.config = function (config) {
      console.assert(! Observable._configDone, "config must be done only once") // pre

      Observable._prefix = (config.prefix ? config._prefix : Observable._prefix)
      Observable._verbose = (config.verbose ? true : false)
      Observable._init();
      Observable._configDone = true
    }

    /**
     * enrichObject
     * add observable methods such as addEventListener to the object we want to observe
     * Static methods : use Observable.enrichObject(obj)
     * @param obj [Object]
     * @return [undefined]
     */
    Observable.enrichObject = function (obj) {
      obj.addEventListener = Observable._addEventListener
      obj.removeEventListener = Observable._removeEventListener
      obj.dispatchEvent = Observable._dispatchEvent
      obj._derivateDataAttrib = Observable._derivateDataAttrib
      obj[Observable._event2listener_label] = {}
      obj[Observable._listenersInfo_label] = {}
      obj[Observable._modifiedAttribSet_label] = {}
    }

    Observable._derivateDataAttrib = function (attribName, config) {
      // pre
      console.assert(attribName && typeof attribName === "string" && attribName.length, "attribName must be a not null string") // pre
      console.assert(config && typeof config.get === 'boolean' && typeof config.set === 'boolean', "config must be used and contain set, get, before and after booleans")

      // verbose
      if (Observable._verbose) {
        console.log('Observable._derivateDataAttrib', attribName, config)
      }

      if (this[Observable._modifiedAttribSet_label][attribName] === undefined) {  // not already done
        var self = this
        var propertyDescriptor = Object.getOwnPropertyDescriptor(self, attribName)

        if (propertyDescriptor.get) { // attribute is already a getter

        }

        self[Observable._prefix + attribName] = self[attribName]

        if (propertyDescriptor.value !== undefined) { // attribute exists in object
          if (typeof self[attribName] === "function") {
            self[Observable._funcPrefix + attribName] =
              function () {
                var event
                // before exec
                if (config.exec && config.before) {
                  event = new CustomEvent(attribName, { "detail" : { "exec" : true, "before" : true }})
                  self.dispatchEvent(event)
                }
                // exec
                var returnValue = self[Observable._prefix + attribName].apply(self, arguments)
                // after exec
                if (config.exec && config.after) {
                  event = new CustomEvent(attribName, { "detail" : { "exec" : true, "after" : true }})
                  self.dispatchEvent(event)
                }
                return returnValue
              }
          }

          Object.defineProperty(self, attribName, {
              set : function (value) {
                var event
                // before set
                if (config.set && config.before) {
                  event = new CustomEvent(attribName, { "detail" : { "set" : true }})
                  self.dispatchEvent(event)
                }
                // set
                self[Observable._prefix + attribName] = value
                // after set
                if (config.set && config.after) {
                  event = new CustomEvent(attribName, { "detail" : { "set" : true }})
                  self.dispatchEvent(event)
                }
              },
              get : function() {
                if (config.get) {
                  var event = new CustomEvent(attribName, { "detail" : { "get" : true }})
                  self.dispatchEvent(event)
                }
                return config.exec ? self[Observable._funcPrefix + attribName] : self[Observable._prefix + attribName]
              }
            })
          // backup the fact that the attribute is derivated now
          self[Observable._modifiedAttribSet_label][attribName] = true
          return true
        }
      }
      return false
    }

    /**
     * _addEventListener
     * this method is "injected" in the enriched object with "addEventListener" as name
     *
     * add observer to a particular event
     * in this method, "this" represents the object we have enriched
     * @param eventName [string]
     * @param cbk [Function]
     * @param config [Object] (will be merged with the default config : see Observable._defaultAttrListenerConfig in _init method)
     * @return listenerIdx [integer]
     */
    Observable._addEventListener = function(eventType, cbk, config) {
      // pre
      console.assert(eventType && typeof eventType === "string", "eventType must be a not null string")
      console.assert(typeof cbk === "function")
      // invariant
      console.assert(this[Observable._event2listener_label])
      console.assert(this[Observable._listenersInfo_label])

      // verbose
      if (Observable._verbose) {
        console.log('Observable._addEventListener', eventType, cbk, config)
      }

      // manage config with default values
      config = (config ? config : {})
      for (var key in  Observable._defaultAttrListenerConfig) {
        if (Observable._defaultAttrListenerConfig.hasOwnProperty(key)) {
          config[key] = (config[key] ? config[key] : Observable._defaultAttrListenerConfig[key])
        }
      }

      // try to derivate attribute
      this._derivateDataAttrib(eventType, config)

      // store listener
      if (! this[Observable._event2listener_label][eventType]) {
        this[Observable._event2listener_label][eventType] = []
      }

      var listener = {
        "type"    : eventType,
        "cbkIdx"  : this[Observable._event2listener_label][eventType].length,
        "cbk"     : cbk,
        "config"  : config
      }
      this[Observable._event2listener_label][eventType][listener.cbkIdx] = listener
      this[Observable._listenersInfo_label][++Observable._listenerGlobalIdx] = listener
      return Observable._listenerGlobalIdx
    }

    /**
     * _removeEventListener
     * this method is "injected" in the enriched object with "addEventListener" as name
     *
     * remove an identified listener
     * in this method, "this" represents the object we have enriched
     * @param listenerIdx [integer]
     * @return [boolean] (true if listener exists)
     */
    Observable._removeEventListener = function(listenerIdx) {
      console.assert(typeof listenerIdx === "number" && listenerIdx >= 0, "listenerIdx must be a not negative integer") // pre

      // verbose
      if (Observable._verbose) {
        console.log('Observable._removeEventListener', listenerIdx)
      }

      var listenerInfo = this[Observable._listenersInfo_label][listenerIdx]
      if (! listenerInfo) {
        return false
      }
      this[Observable._event2listener_label][listenerInfo.type].splice(listenerInfo.cbkIdx, 1);
      this[Observable._listenersInfo_label][listenerIdx] = undefined;

      return true
    }

    /**
     * _dispatchEvent
     * this method is "injected" in the enriched object with "dispatchEvent" as name
     *
     * trigger an event (you can use a CustomEvent, or just an object wich implements this interface : {
     *   type   : "foo",
     *   detail : {
     *     bar   : "bar",
     *     bar2  : "...",
     *     ...   : ...,
     * })
     * in this method, "this" represents the object we have enriched
     * @param customEvent [CustomEvent] or [Object]  wich implements CustomEvent interface
     * @return listenerIdx [integer]
     */
    Observable._dispatchEvent = function (customEvent) {
      console.assert(customEvent.type, 'customEvent must have a "type" attribute') // pre

      // verbose
      if (Observable._verbose) {
        console.log('Observable._dispatchEvent', customEvent)
      }

      function locEventCbkCall(listener) { listener.cbk(customEvent) }
      this[Observable._event2listener_label][customEvent.type].forEach(locEventCbkCall)
    }
    return Observable
  }
)

// for node require compatibility (not usefull in sub modules)
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define([/*'require'*/], // here we get the requirejs object in order to set the cur path to the path of this top level file
  function (/*requirejs*/) {
    "use strict";
    //requirejs.config({
    //  urlArgs: bust=" + (new Date()).getTime()
    //});


    var Observable = {}

    Observable._init = function() {
      Observable._prefix = "sgjObs_"
      Observable._funcPrefix = Observable._prefix + "func_"
      Observable._getPrefix = Observable._prefix + "get_"
      Observable._setPrefix = Observable._prefix + "set_"
      Observable._event2listener_label = Observable._prefix + 'eventType2listeners'
      Observable._lIdx2e_label = Observable._prefix + 'listenerIdx2event'
      Observable._modifiedAttribSet_label = Observable._prefix + 'derivatedAttribSet'
      Observable._listenersInfo_label = Observable._prefix + 'listenerIdx2eventPos'

      Observable._listenerGlobalIdx = -1

      Observable._defaultAttrListenerConfig = {
        "before" : false,
        "after"  : true,
        //"annihilateSet" : false,
        //"annihilateCall" : false,
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
      Observable._configDone = true
    }

    /**
     * enrichObject
     * add observable methods such as addEventListener to the object we want to observe
     * Static methods : use Observable.enrichObject(obj)
     * @param obj [object]
     * @return [undefined]
     */
    Observable.enrichObject = function (obj) {
      obj.addEventListener = Observable._addEventListener
      obj.removeEventListener = Observable._removeEventListener
      obj.dispatchEvent = Observable._dispatchEvent
      obj[Observable._event2listener_label] = {}
      obj[Observable._listenersInfo_label] = {}
      obj[Observable._modifiedAttribSet_label] = {}
    }
    
    /**
     * _derivateAttrib
     * modify behavior of attribute in order to dispatch event when using it
     * @param obj [object]
     * @param attribName [string]
     * @param config [json object]
     * @return [boolean]
     */
    Observable._derivateAttrib = function (obj, attribName, config) {
      // pre
      console.assert(attribName && typeof attribName === "string" && attribName.length, "attribName must be a not null string") // pre
      console.assert(config && typeof config.get === 'boolean' && typeof config.set === 'boolean', "config must be used and contain set, get, before and after booleans")

      // verbose
      if (Observable._verbose) {
        console.log('Observable._derivateDataAttrib', attribName, config)
      }

      var propertyDescriptor = Object.getOwnPropertyDescriptor(obj, attribName)

      if (obj[Observable._modifiedAttribSet_label][attribName] === undefined && // already done
          propertyDescriptor.configurable) {// attribute can be configured
        
        // If the attribute is a function 
        if (Observable._derivateFuncAttrib(obj, attribName, config)) {
          // backup the fact that the attribute is derivated now and exit
          obj[Observable._modifiedAttribSet_label][attribName] = true
          return true
        }
        
        // If the attribute is a getter or setter
        if (Observable._derivateGetOrSetAttrib(obj, propertyDescriptor, attribName, config)) {
          // backup the fact that the attribute is derivated now and exit
          obj[Observable._modifiedAttribSet_label][attribName] = true
          return true
        }          
        
        // If the attribute is a "simple data" (value without the use of get or set Js capabilities)
        if (Observable._derivateDataAttrib(obj, propertyDescriptor, attribName, config)) {
          obj[Observable._modifiedAttribSet_label][attribName] = true
          return true
        }
      }
      return false
    }

    Observable._derivateFuncAttrib = function(obj, attribName, config) {
      if (config.exec && typeof obj[attribName] === "function") {
        if (Observable._verbose) {
          console.log('Observable._derivateFuncAttrib (succes)', obj, attribName, config)
        }
        obj[Observable._funcPrefix + attribName] =
          function () {
            var event
            // Before exec
            if (config.exec && config.before) {
              event = new CustomEvent(attribName, { "detail" : { "exec" : true, "before" : true }})
              obj.dispatchEvent(event)
            }
            
            // Exec
            var returnValue = obj[Observable._prefix + attribName].apply(obj, arguments)
            
            // After exec
            if (config.exec && config.after) {
              event = new CustomEvent(attribName, { "detail" : { "exec" : true, "after" : true }})
              obj.dispatchEvent(event)
            }
            return returnValue
          }
        return true
      }
      return false;
    }

    Observable._derivateGetOrSetAttrib = function(obj, propertyDescriptor, attribName, config) {
      var derivationDone = false
      
      if (config.get && propertyDescriptor.get) { 
        if (Observable._verbose) {
          console.log('Observable._derivateGetOrSetAttrib (succes on get)', obj, attribName, config)
        }
        // Store get
        obj[Observable._getPrefix + attribName] = propertyDescriptor.get
        
        // Redefine get
        propertyDescriptor.get = function() {
          var event = new CustomEvent(attribName, { "detail" : { "get" : true }})
          obj.dispatchEvent(event)
          return obj[Observable._getPrefix + attribName]();
        }
        
        derivationDone = true
      }
      
      if (config.set && propertyDescriptor.set) { 
        if (Observable._verbose) {
          console.log('Observable._derivateGetOrSetAttrib (succes on set)', obj, attribName, config)
        }
        // Store set
        obj[Observable._setPrefix + attribName] = propertyDescriptor.set
        
        // Redefine set
        propertyDescriptor.set = function(value) {
          // Before set
          var event
          if (config.set && config.before) {
            event = new CustomEvent(attribName, { "detail" : { "get" : true }})
            obj.dispatchEvent(event)
          }
          // Set
          obj[Observable._setPrefix + attribName](value)
          // After set
          if (config.set && config.after) {
            event = new CustomEvent(attribName, { "detail" : { "set" : true }})
            obj.dispatchEvent(event)
          }
        }
        derivationDone = true
      }
      
      if (derivationDone) {
        Object.defineProperty(obj, attribName, propertyDescriptor)
      }
      return derivationDone;
    }
    
    Observable._derivateDataAttrib = function(obj, propertyDescriptor, attribName, config) {
      
      if ('value' in propertyDescriptor && 
          (config.set || config.get)) { 
            
        if (Observable._verbose) {
          console.log('Observable._derivateDataAttrib', obj, attribName, config)
        }
        obj[Observable._prefix + attribName] = obj[attribName]
        
        Object.defineProperty(obj, attribName, {
            set : function (value) {
              var event
              // Before set
              if (config.set && config.before) {
                event = new CustomEvent(attribName, { "detail" : { "set" : true }})
                obj.dispatchEvent(event)
              }
              // Set
              obj[Observable._prefix + attribName] = value
              // After set
              if (config.set && config.after) {
                event = new CustomEvent(attribName, { "detail" : { "set" : true }})
                obj.dispatchEvent(event)
              }
            },
            get : function() {
              if (config.get) {
                var event = new CustomEvent(attribName, { "detail" : { "get" : true }})
                obj.dispatchEvent(event)
              }
              return obj[Observable._prefix + attribName]
            }
          })
        return true
      }
      return false;
    }

    /**
     * _addEventListener
     * this method is "injected" in the enriched object with "addEventListener" as name
     *
     * add observer to a particular event
     * in this method, "this" represents the object we have enriched
     * @param eventName [string]
     * @param cbk [function]
     * @param config [object] (will be merged with the default config : see Observable._defaultAttrListenerConfig in _init method)
     * @return listenerIdx [number(integer)]
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
      
      //
      // Try to derivate attribute
      //
      Observable._derivateAttrib(this, eventType, config)

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
     * @param listenerIdx [number(integer)]
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
      this[Observable._event2listener_label][listenerInfo.type].splice(listenerInfo.cbkIdx, 1)
      this[Observable._listenersInfo_label][listenerIdx] = undefined

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
     * @param customEvent [CustomEvent] or [object]  wich implements CustomEvent interface
     * @return listenerIdx [number(integer)]
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

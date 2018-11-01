/**
 *
 * Common usage to start saving logs from original console is:
 *   l2i.on();
 * After that you can use methods like
 *   console.log('My message');
 * and all of the logs will be in both Javascript Console and IndexedDB named logs2indexeddb.
 *
 * To clear the databases (logs2indexeddb and logs2indexeddb_test if you have used the performance test) you can use:
 *   l2i.clear();
 * or
 *   l2i.clearAndDrop();
 * to additionally drop the database(s).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return (root.l2i = factory())
    })
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.l2i = factory()
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var _l2i = {
    databaseName: 'logs2indexeddb',
    databaseVersion: 4,
    database: null,
    maxRows: 500,
    consoles: {
      originalIsOn: false,
      /**
       * @private Original console logger. No matter if l2i is on or off. Is used for internal l2i logging during test.
       */
      original: console,
      /**
       * @private Logger that saves data into opened IndexedDB.
       */
      indexeddb: {
        log: function () {
          _l2i.consoles.indexeddb.write2db('log', arguments)
        },
        warn: function () {
          _l2i.consoles.indexeddb.write2db('warn', arguments)
        },
        trace: function () {
          _l2i.consoles.indexeddb.write2db('trace', arguments)
        },
        error: function () {
          _l2i.consoles.indexeddb.write2db('error', arguments)
        },
        info: function () {
          _l2i.consoles.indexeddb.write2db('info', arguments)
        },
        debug: function () {
          _l2i.consoles.indexeddb.write2db('debug', arguments)
        },
        write2db: function (label, args) {
          if (args.length === 0) return
          var i = 0
          var strings = []
          for (var al = args.length; i < al; i++) {
            strings.push(args[i])
          }
          var log = strings.join(' ')

          var time = new Date()
          time.setMonth(time.getMonth() - 1)
          var data = {
            time: time.getTime() + '',
            label: label,
            log: log
          }
          var transaction = _l2i.database.transaction(['logs'], 'readwrite')
          var objectStore = transaction.objectStore('logs')
          objectStore.add(data)
          var countRequest = objectStore.count()
          countRequest.onsuccess = function () {
            if (countRequest.result > _l2i.maxRows) {
              objectStore.openCursor().onsuccess = function (event) {
                var cursor = event.target.result
                if (cursor) {
                  var delRequest = cursor.delete()
                }
              }
            }
          }
        }
      },
      /**
       * @private Logs into both - console and indexeddb
       */
      both: {
        log: function () {
          _l2i.consoles.original.log.apply(this, arguments)
          _l2i.consoles.indexeddb.log.apply(this, arguments)
        },
        warn: function () {
          _l2i.consoles.original.warn.apply(this, arguments)
          _l2i.consoles.indexeddb.warn.apply(this, arguments)
        },
        trace: function () {
          _l2i.consoles.original.trace.apply(this, arguments)
          _l2i.consoles.indexeddb.trace.apply(this, arguments)
        },
        error: function () {
          _l2i.consoles.original.error.apply(this, arguments)
          _l2i.consoles.indexeddb.error.apply(this, arguments)
        },
        info: function () {
          _l2i.consoles.original.info.apply(this, arguments)
          _l2i.consoles.indexeddb.info.apply(this, arguments)
        },
        debug: function () {
          _l2i.consoles.original.debug.apply(this, arguments)
          _l2i.consoles.indexeddb.debug.apply(this, arguments)
        }
      },
    },
    /**
     * @private Opens database and updates schema if needed.
     * @param dbName database name
     * @param callbackSuccessOpen (optional) invoked after success connect and update.
     * @param onupgradeneeded (optional) function to create different structure of the database.
     */
    openDb: function (dbName, callbackSuccessOpen, onupgradeneeded) {
      _l2i.consoles.original.log('openDb ...')
      // Let us open our database
      var request = indexedDB.open(dbName, _l2i.databaseVersion)
      request.onerror = function (event) {
        _l2i.consoles.original.error('openDb:', event.target.errorCode)
      }
      request.onsuccess = function (e) {
        _l2i.database = request.result
        _l2i.consoles.original.log('openDb DONE')
        _l2i.database.onerror = function (event) {
          _l2i.consoles.original.error('Database error: ' + event.target.errorCode)
        }
        if (callbackSuccessOpen) {
          callbackSuccessOpen()
        }
      }
      // This event is only implemented in recent browsers
      request.onupgradeneeded = onupgradeneeded || function (event) {
        _l2i.consoles.original.log('openDb.onupgradeneeded')
        var db = event.target.result
        var objectStore = db.createObjectStore('logs', {autoIncrement: true})
        // Create an index to search by time
        objectStore.createIndex('time', 'time', {unique: false})
        objectStore.createIndex('label', 'label', {unique: false})
        objectStore.transaction.oncomplete = function (event) {
          _l2i.consoles.original.log('openDb.onupgradeneeded.transaction.oncomplete')
        }
      }
    },
    /**
     * @private
     * @param dbName
     */
    dropDb (dbName) {
      var request = indexedDB.deleteDatabase(dbName)
      request.onsuccess = function (event) {
        _l2i.consoles.original.log('logs2indexeddb successfully cleared and dropped')
      }
      request.onerror = function () {
        _l2i.consoles.original.log('logs2indexeddb error when drop database')
      }
    },
    /**
     * @private
     */
    replaceConsole: function () {
      console = _l2i.consoles.both
    },
    /**
     * @private
     */
    downloadFile: function (data) {
      if (!data) {
        _l2i.consoles.original.log('l2i.download: Empty database')
        return
      }
      var filename = location.host + '_' + Date.now() + '.txt'

      var blob = new Blob([data], {type: 'text/plain'}),
        e = document.createEvent('MouseEvents'),
        a = document.createElement('a')

      a.download = filename
      a.href = window.URL.createObjectURL(blob)
      a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':')
      e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
      a.dispatchEvent(e)
    },
    debug: /**
     * Performance test methods.
     * Use
     *      <p id="status"></p>
     *      l2i.debug.startIndexedDBTest(5000, 'status')
     * to test 5000 writes.
     */
      {
        statusElementId: null,
        startTime: null,
        totalNumberOfWrites: null,

        /**
         * Opens database and starts WriteTest
         * @param n number of records to write during the test.
         * @param statusElementId html element's id to write results of the test.
         */
        startIndexedDBTest: function (n, statusElementId) {
          if (!n || !statusElementId) {
            throw 'IllegalArgumentsException'
          }
          _l2i.debug.statusElementId = statusElementId
          _l2i.debug.status('Testing...')

          _l2i.openDb('logs2indexeddb_test', function () {
            _l2i.debug.processWriteTest(_l2i.database, n)
          }, _l2i.debug.onupgradeneeded)
        },
        onupgradeneeded: function (event) {
          _l2i.consoles.original.log('debug.onupgradeneeded')
          var db = event.target.result

          // Create an objectStore to hold information about our customers. We're
          // going to use "ssn" as our key path because it's guaranteed to be
          // unique.
          var objectStore = db.createObjectStore('customers', {keyPath: 'ssn'})

          // Create an index to search customers by name. We may have duplicates
          // so we can't use a unique index.
          objectStore.createIndex('name', 'name', {unique: false})

          // Create an index to search customers by email. We want to ensure that
          // no two customers have the same email, so use a unique index.
          objectStore.createIndex('email', 'email', {unique: true})

          // Use transaction oncomplete to make sure the objectStore creation is
          // finished
          objectStore.transaction.oncomplete = function (event) {
            _l2i.consoles.original.log('debug.onupgradeneeded.transaction.oncomplete')
          }
        },
        /**
         * @private
         */
        processWriteTest: function (db, n) {
          _l2i.consoles.original.log('processWriteTest')

          _l2i.debug.status('Connected to database. Preparing to process ' + n + ' writes.')
          alert('The test can take a lot of time (1-2 minutes). The browser can be locked during the test. Ready to launch?')
          _l2i.debug.status('Testing... Please wait until test will be finished.')

          _l2i.debug.totalNumberOfWrites = n
          _l2i.debug.startTime = new Date()
          for (var i = 0; i < n; i++) {
            //                    status("Writing "+i+" record...");                          // Comment this to get real time estimate
            _l2i.debug.processWrite(db, i)
          }
          // The write will be finished after last callback
        },
        /**
         * @private
         */
        testFinished: function () {
          _l2i.consoles.original.log('testFinished')
          var n = _l2i.debug.totalNumberOfWrites
          var end = new Date()
          var diff = end.getMinutes() * 60 + end.getSeconds() - (_l2i.debug.startTime.getMinutes() * 60 + _l2i.debug.startTime.getSeconds())
          var mean = diff / n

          alert('Done. Check the result on the page.')
          _l2i.debug.status('One write request takes <b>' + mean + '</b> seconds.<br>Test time: ' + diff + ' seconds')
          _l2i.dropDb('logs2indexeddb_test')
        },
        /**
         * @private
         */
        processWrite: function (db, i) {
          //                _l2i.consoles.original.log("processWrite");
          var transaction = db.transaction(['customers'], 'readwrite')

          // Do something when all the data is added to the database.
          transaction.oncomplete = function (event) {
            //                    _l2i.consoles.original.log("processWrite.transaction.oncomplete");
          }

          transaction.onerror = function (event) {
            // Don't forget to handle errors!
            //                    _l2i.consoles.original.error("processWrite.transaction.onerror: "+event.code);
          }

          var objectStore = transaction.objectStore('customers')

          var data = {ssn: i, name: 'Bill', age: 35, email: 'mail' + i + '@rtlservice.com'}
          var request = objectStore.put(data)
          request.onsuccess = function (event) {
            // event.target.result == customerData[i].ssn;
            //                    _l2i.consoles.original.log("processWrite.transaction...onsuccess: "+event.target.result);
            if (i == _l2i.debug.totalNumberOfWrites - 1) {
              _l2i.debug.testFinished()
            }
          }
          request.onerror = function () {
            _l2i.consoles.original.error('addPublication error', this.error)
          }
        },
        status: function (str) {
          document.getElementById(_l2i.debug.statusElementId).innerHTML = str
        }
      },
  }

  return {
    /**
     * Turns on catching all console.* methods invocations and saving logs into IndexedDB
     * @param callback (optional) is invoked then database is successfully opened and console is replaced with _l2i.log2both.
     */
    on: function (callback) {
      return new Promise(resolve => {
        if (_l2i.consoles.originalIsOn === false) {
          _l2i.consoles.originalIsOn = true
          if (_l2i.database != null) {
            _l2i.replaceConsole()
            if (callback) {
              callback()
            }
            resolve()
          }
          else {
            _l2i.openDb(_l2i.databaseName, function () {
              _l2i.replaceConsole()
              if (callback) {
                callback()
              }
              resolve()
            })
          }
        }
      })
    },
    /**
     * Turns off
     */
    off: function () {
      if (_l2i.consoles.originalIsOn === true) {
        console = _l2i.consoles.original
        _l2i.consoles.originalIsOn = false
      }
    },
    /**
     * Check if is on
     * @returns {boolean}
     */
    isOn: function () {
      return _l2i.consoles.originalIsOn
    },
    setMaxRows: function (rows) {
      _l2i.maxRows = rows
    },
    /**
     * clear logs in indexedDB
     */
    clear: function () {
      if (_l2i.database == null) {
        throw 'IllegalStateException: need to call l2i.on before clearing the database, e.g. l2i.on(function(){l2i.clear();});'
      }
      _l2i.consoles.original.log('l2i.clear')
      var objectStore = _l2i.database.transaction(['logs'], 'readwrite').objectStore('logs')
      var objectStoreRequest = objectStore.clear()
      objectStoreRequest.onsuccess = function (event) {
        _l2i.consoles.original.log('logs2indexeddb successfully cleared')
      }
    },
    /**
     * clear and drop the database
     */
    clearAndDrop: function () {
      _l2i.dropDb(_l2i.databaseName)
    },
    /**
     * Opens a file with logs.
     * If parameters are null (not specified) then method downloads all logs from database.
     * If parameters are specified, then the method filters logs and provide only records
     * that were created since fromDate to toDate.
     * @param fromDate (optional)
     * @param toDate (optional)
     */
    download: function (fromDate, toDate) {
      var fromTime = null
      var toTime = null
      if (fromDate != null) {
        if (toDate != null) {
          if (typeof(fromDate.getTime) === 'undefined' || typeof(toDate.getTime) === 'undefined') {
            throw 'IllegalArgumentException: parameters must be Date objects'
          }
          fromTime = fromDate.getTime()
          toTime = toDate.getTime()
        }
        else {
          throw 'IllegalArgumentException: Please provide either both parameters or none of them'
        }
      }
      var objectStore = _l2i.database.transaction('logs').objectStore('logs')

      var data = ''
      objectStore.openCursor().onsuccess = function (event) {
        var cursor = event.target.result
        if (cursor) {
          var v = cursor.value
          if (fromTime == null || fromTime <= v.time && v.time <= toTime) {
            data += new Date(v.time * 1) + ' ' + v.label + ' ' + v.log + '\n'
          }
          cursor.continue()
        }
        else {
          _l2i.downloadFile(data)
        }
      }
    },
    /**
     * download today's log
     */
    downloadToday: function () {
      var start = new Date()
      start.setHours(0, 0, 0, 0)
      var end = new Date()
      end.setHours(23, 59, 59, 999)
      _l2i.download(start, end)
    },
    debug: _l2i.debug
  }
}))

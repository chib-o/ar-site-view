// js/storage.js
(function (global) {
    'use strict';

    var DB_NAME = 'procureArDb';
    var DB_VERSION = 1;
    var dbInstance = null;

    var ProcureStorage = {
        saveBundle: saveBundle,
        getBundle: getBundle,
        addPendingAction: addPendingAction,
        getPendingActions: getPendingActions,
        clearPendingActions: clearPendingActions
    };

    function openDb() {
        return new Promise(function (resolve, reject) {
            if (dbInstance) return resolve(dbInstance);

            var req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('bundles')) {
                    db.createObjectStore('bundles', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('pendingActions')) {
                    db.createObjectStore('pendingActions', { autoIncrement: true });
                }
            };

            req.onsuccess = function (e) {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };
            req.onerror = function (e) {
                reject(e.target.error);
            };
        });
    }

    function saveBundle(siteId, floorId, bundleObj) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(['bundles'], 'readwrite');
                var store = tx.objectStore('bundles');
                var key = siteId + '::' + floorId;

                var record = {
                    key: key,
                    siteId: siteId,
                    floorId: floorId,
                    bundle: bundleObj   // modelBinary will be stored as ArrayBuffer/Blob
                };

                var req = store.put(record);
                req.onsuccess = function () { resolve(); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function getBundle(siteId, floorId) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(['bundles'], 'readonly');
                var store = tx.objectStore('bundles');
                var key = siteId + '::' + floorId;
                var req = store.get(key);

                req.onsuccess = function (e) {
                    var rec = e.target.result;
                    if (!rec) return reject(new Error('Bundle not found'));
                    resolve(rec.bundle);
                };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function addPendingAction(action) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(['pendingActions'], 'readwrite');
                var store = tx.objectStore('pendingActions');
                var req = store.add(action);
                req.onsuccess = function () { resolve(); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function getPendingActions() {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(['pendingActions'], 'readonly');
                var store = tx.objectStore('pendingActions');
                var actions = [];
                var req = store.openCursor();

                req.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        actions.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(actions);
                    }
                };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function clearPendingActions() {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(['pendingActions'], 'readwrite');
                var store = tx.objectStore('pendingActions');
                var req = store.clear();
                req.onsuccess = function () { resolve(); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    global.ProcureStorage = ProcureStorage;
})(window);

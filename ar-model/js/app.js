(function () {

    var app = angular.module('riskmachArModel', [
        'tandibar/ng-rollbar',
        'angular-jwt',
        'mgcrea.ngStrap',
        'drag',
        'riskmachUtils',
        'riskmachDatabases',
        'riskmachModels',
        'riskmachOfflineInstallStatus'
    ]);

    app.controller('arModelPageController', arModelPageController);

    // ==== CONFIG (JWT + Rollbar) – same pattern as other feature ====
    app.config(function ($httpProvider, jwtInterceptorProvider) {
        jwtInterceptorProvider.tokenGetter = function () {
            return localStorage.getItem('rm_wa_token');
        };
        $httpProvider.interceptors.push('jwtInterceptor');
    });

    app.config(['RollbarProvider', function (RollbarProvider) {
        RollbarProvider.init({
            accessToken: 'YOUR_ROLLBAR_TOKEN',
            captureUncaught: true,
            captureUnhandledRejections: true,
            payload: {
                environment: 'production',
                client: { javascript: { code_version: '1.0' } }
            }
        });
    }]);

    // ==== SERVICES ====

    // BundleService: talks to PHP backend + uses ProcureStorage (storage.js)
    app.service('arBundleService', function ($http, $q) {
        this.getManifest = function (siteId, floorId) {
            return $http.get('/api/ar/getBundleManifest.php', {
                params: { siteId: siteId, floorId: floorId }
            }).then(function (res) { return res.data; });
        };

        this.downloadAndCache = function (siteId, floorId) {
            var deferred = $q.defer();
            var manifest;

            this.getManifest(siteId, floorId)
                .then(function (m) {
                    manifest = m;
                    return $q.all([
                        $http.get(manifest.configUrl),
                        $http.get(manifest.modelUrl, { responseType: 'arraybuffer' })
                    ]);
                }.bind(this))
                .then(function (results) {
                    var config = results[0].data;
                    var modelBinary = results[1].data;
                    return window.ProcureStorage.saveBundle(siteId, floorId, {
                        manifest: manifest,
                        config: config,
                        modelBinary: modelBinary
                    });
                })
                .then(function () { deferred.resolve(); })
                .catch(function (err) { deferred.reject(err); });

            return deferred.promise;
        };

        this.loadFromCache = function (siteId, floorId) {
            return window.ProcureStorage.getBundle(siteId, floorId);
        };
    });

    // SyncService: queue actions and prepare payload, no actual POST yet
    app.service('arSyncService', function ($q) {
        this.queueAction = function (actionObj) {
            return window.ProcureStorage.addPendingAction(actionObj);
        };

        this.prepareSyncPayload = function () {
            var deferred = $q.defer();
            window.ProcureStorage.getPendingActions()
                .then(function (actions) {
                    deferred.resolve({ actions: actions });
                })
                .catch(function (err) { deferred.reject(err); });
            return deferred.promise;
        };
    });

    // ==== CONTROLLER ====

    function arModelPageController($scope, $q, $http, rmUtilsFactory, arBundleService, arSyncService) {
        var vm = this;

        vm.state = {
            site: null,
            floor: null
        };

        vm.data = {
            sites: [],
            floors: []
        };

        vm.loading = {
            sites: false,
            floors: false,
            ar: false
        };

        vm.error = {
            ar: null
        };

        vm.syncPayloadPreview = '';

        vm.utils = {
            theme: {
                toggleSwitch: document.querySelector('.theme-switch input[type="checkbox"]'),
                currentTheme: localStorage.getItem('theme'),
                switchTheme: function () {
                    if (vm.utils.theme.toggleSwitch && vm.utils.theme.toggleSwitch.checked) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.setAttribute('data-theme', 'light');
                        localStorage.setItem('theme', 'light');
                    }
                },
                initTheme: (function () {
                    setTimeout(function () {
                        if (vm.utils.theme.currentTheme) {
                            document.documentElement.setAttribute('data-theme', vm.utils.theme.currentTheme);
                            if (vm.utils.theme.toggleSwitch) {
                                vm.utils.theme.toggleSwitch.checked = (vm.utils.theme.currentTheme === 'dark');
                            }
                        }
                    }, 0);
                }())
            },
            goBack: function () {
                window.history.go(-1);
            },
            screen: {
                active: 'site_list',
                isActive: function (name) { return vm.utils.screen.active === name; },
                change: function (name) { vm.utils.screen.active = name; }
            }
        };

        vm.actions = {
            refreshSites: refreshSites,
            selectSite: selectSite,
            refreshFloors: refreshFloors,
            prepareOffline: prepareOffline,
            openAR: openAR,
            stopAR: stopAR,
            prepareSyncPayload: prepareSyncPayload
        };

        // === initial load ===
        refreshSites();

        // ====== ACTION IMPLEMENTATIONS ======

        function refreshSites() {
            vm.loading.sites = true;
            // Example PHP endpoint – adjust to your real one
            /*$http.get('/api/ar/getSites.php')
                .then(function (res) { vm.data.sites = res.data || []; })
                .catch(function () { vm.data.sites = []; })
                .finally(function () { vm.loading.sites = false; });*/

            // Temporary mock site list (remove when backend is ready)
            var tempSites = [
                { id: "SITE001", name: "Example Site A" },
                { id: "SITE002", name: "Central Plant Room" },
                { id: "SITE003", name: "Warehouse Zone 4" }
            ];

            // Simulate async delay so UI behaves the same
            setTimeout(function () {
                vm.data.sites = tempSites;
                vm.loading.sites = false;
                $scope.$applyAsync();
            }, 300);
        }

        function selectSite(site) {
            vm.state.site = site;
            vm.utils.screen.change('floor_list');
            refreshFloors();
        }

        function refreshFloors() {
            if (!vm.state.site) return;
            vm.loading.floors = true;

            /*$http.get('/api/ar/getFloors.php', { params: { siteId: vm.state.site.id } })
                .then(function (res) { vm.data.floors = res.data || []; })
                .catch(function () { vm.data.floors = []; })
                .finally(function () { vm.loading.floors = false; });*/

            // Temporary mock floor list for the selected site
            // (You can customise per site if needed)
            var tempFloors = [
                { id: "F1", name: "Ground Floor" },
                { id: "F2", name: "First Floor" },
                { id: "F3", name: "Second Floor" }
            ];

            // Simulate async delay to mimic backend call behavior
            setTimeout(function () {
                vm.data.floors = tempFloors;
                vm.loading.floors = false;
                $scope.$applyAsync();
            }, 300);
        }

        function prepareOffline(floor) {
            floor.downloading = true;
            floor.offlineReady = false;

            /*arBundleService.downloadAndCache(vm.state.site.id, floor.id)
                .then(function () { floor.offlineReady = true; })
                .catch(function () { alert('Failed to download AR bundle'); })
                .finally(function () { floor.downloading = false; });*/

            // Mock bundle manifest + config + model data
            var mockManifest = {
                siteId: vm.state.site.id,
                floorId: floor.id,
                version: "v1",
                modelUrl: "../ar-model/mock/mock-model.glb",
                configUrl: "../ar-model/mock/mock-config.json"
            };

            var mockConfig = {
                siteId: vm.state.site.id,
                floorId: floor.id,
                version: "v1",
                alignment: { method: "mock" },
                assets: [],
                rooms: []
            };

            // Fake GLB data as empty ArrayBuffer
            var mockModelBinary = new ArrayBuffer(8);

            // Simulate async download
            setTimeout(function () {

                window.ProcureStorage.saveBundle(
                    vm.state.site.id,
                    floor.id,
                    {
                        manifest: mockManifest,
                        config: mockConfig,
                        modelBinary: mockModelBinary
                    }
                ).then(function () {
                    floor.offlineReady = true;
                    floor.downloading = false;
                    $scope.$applyAsync();
                });

            }, 300);
        }

        /*function openAR(floor) {
            vm.state.floor = floor;
            vm.utils.screen.change('ar_view');
            vm.loading.ar = true;
            vm.error.ar = null;

            arBundleService.loadFromCache(vm.state.site.id, vm.state.floor.id)
                .then(function (bundle) {
                    var canvas = document.getElementById('arCanvas');
                    window.ProcureAREngine.init(canvas, {
                        siteId: vm.state.site.id,
                        floorId: vm.state.floor.id,
                        bundle: bundle,
                        onAction: function (action) {
                            arSyncService.queueAction(action);
                        }
                    });
                    vm.loading.ar = false;
                    $scope.$applyAsync();
                })
                .catch(function () {
                    vm.error.ar = 'Bundle not available offline. Please prepare offline data first.';
                    vm.loading.ar = false;
                    $scope.$applyAsync();
                });
        }*/

        function openAR(floor) {
    vm.state.floor = floor;
    vm.utils.screen.change('ar_view');
    vm.loading.ar = true;
    vm.error.ar = null;

    // helper so we don't duplicate code
    function startEngine(bundle) {
        var canvas = document.getElementById('arCanvas');

        window.ProcureAREngine.init(canvas, {
            siteId: vm.state.site.id,
            floorId: vm.state.floor.id,
            bundle: bundle,
            onAction: function (action) {
                arSyncService.queueAction(action);
            }
        });

        vm.loading.ar = false;
        vm.error.ar = null;      // ensure canvas is visible
        $scope.$applyAsync();
    }

    arBundleService.loadFromCache(vm.state.site.id, vm.state.floor.id)
        .then(function (bundle) {
            console.log('Loaded bundle from cache:', bundle);
            startEngine(bundle);
        })
        .catch(function (err) {
            console.warn('loadFromCache failed, using dev mock bundle instead:', err);

            // DEV FALLBACK: use a mock bundle so AR always starts
            var mockBundle = {
                manifest: {
                    siteId: vm.state.site.id,
                    floorId: vm.state.floor.id,
                    version: 'dev-mock',
                    modelUrl: '../mock/mock-model.glb',
                    configUrl: '../mock/mock-config.json'
                },
                config: {
                    siteId: vm.state.site.id,
                    floorId: vm.state.floor.id,
                    version: 'dev-mock',
                    alignment: { method: 'mock' },
                    assets: [],
                    rooms: []
                },
                modelBinary: null // you can ignore this for now; Three.js will load by URL
            };

            startEngine(mockBundle);
        });
}


        /*function openAR(floor) {
            vm.state.floor = floor;
            vm.utils.screen.change('ar_view');
            vm.loading.ar = true;
            vm.error.ar = null;

            //var siteId = vm.state.site.id;
            //var floorId = floor.id;

            arBundleService.loadFromCache(vm.state.site.id, vm.state.floor.id)
            .then(function (bundle) {
                console.log("Loaded bundle from cache:", bundle);

                var canvas = document.getElementById('arCanvas');
                window.ProcureAREngine.init(canvas, {
                    siteId: vm.state.site.id,
                    floorId: vm.state.floor.id,
                    bundle: bundle,
                    onAction: function (action) {
                        arSyncService.queueAction(action);
                    }
                });

                vm.loading.ar = false;
                $scope.$applyAsync();
            })
            .catch(function (err) {
                console.warn("Bundle not in cache — using dev mock bundle instead.", err);

                // ⭐ DEV FALLBACK BUNDLE ⭐
                var mockBundle = {
                    manifest: {
                        siteId: vm.state.site.id,
                        floorId: floor.id,
                        version: "dev-mock",
                        modelUrl: "../ar-model/mock/mock-model.glb",
                        configUrl: "../ar-model/mock/mock-config.json"
                    },
                    config: {
                        siteId: vm.state.site.id,
                        floorId: floor.id,
                        version: "dev-mock",
                        alignment: { method: "mock" },
                        assets: [],
                        rooms: []
                    },
                    // Empty ArrayBuffer is valid for bootstrapping the engine
                    modelBinary: new ArrayBuffer(8)
                    //modelBinary: null

                };

                var canvas = document.getElementById('arCanvas');
                window.ProcureAREngine.init(canvas, {
                    siteId: vm.state.site.id,
                    floorId: vm.state.floor.id,
                    bundle: mockBundle,
                    onAction: function (action) {
                        arSyncService.queueAction(action);
                    }
                });

                // CRITICAL: CLEAR the error so canvas shows up!
                vm.error.ar = null;
                vm.loading.ar = false;
                $scope.$applyAsync();
            });
        }*/


        function stopAR() {
            if (window.ProcureAREngine) {
                window.ProcureAREngine.stop();
            }
        }

        function prepareSyncPayload() {
            arSyncService.prepareSyncPayload()
                .then(function (payload) {
                    vm.syncPayloadPreview = JSON.stringify(payload, null, 2);
                })
                .catch(function (err) {
                    vm.syncPayloadPreview = 'Error preparing payload: ' + err.message;
                });
        }
    }

})();

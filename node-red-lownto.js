module.exports = function (RED) {
    let xmlbuilder = require('xmlbuilder');
    let supportedAreas = ['global', 'adminhtml', /*'crontab',*/ 'frontend'/*, 'graphql', 'webapi_rest', 'webapi_soap'*/];
    let supportedTypes = ['module', 'events', 'di'];
    let supportedPluginTypes = ['before', 'after'];
    function HttpXmlRequestResponse(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        function handleXmlRequest(req, res) {
            let area = req.params.area ?? 'global';
            let fileType = req.params.filetype;

            if (!supportedAreas.includes(area)) {
                res.sendStatus(404);
                return;
            }
            if (!supportedTypes.includes(fileType)) {
                res.sendStatus(404);
                return;
            }

            let xmlResponse = '';
            switch (fileType) {
                case 'module':
                    xmlResponse = generateModuleXmlResponse();
                    break;
                case 'events':
                    xmlResponse = generateEventsXmlResponse(config[area + "_eventlist"]);
                    break;
                case 'di':
                    xmlResponse = generateDiXmlResponse(area);
                    break;
                default:
            }

            if (xmlResponse) {
                res.set('Content-Type', 'text/xml');
                res.send(xmlResponse);
            } else {
                res.sendStatus(404);
            }
        }

        function cleanupHttpHandlerOnDeploy(removed, done) {
            RED.httpNode._router.stack.forEach(function(route, i, routes) {
                if (route.route && route.route.path === '/etc/:area?/:filetype.xml') {
                    routes.splice(i, 1);
                }
            });
            done();
        }

        function generateModuleXmlResponse() {
            let xml = xmlbuilder.create('config');
            xml.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
            xml.att('xsi:noNamespaceSchemaLocation', 'urn:magento:framework:Module/etc/module.xsd');
            xml.com(' Copyright © Colin Tickle <colin.tickle@gmail.com>, all rights reserved.');
            xml.ele('module')
                .att('name', 'Lownto_DynamicConfiguration')
                .ele('sequence')
                .ele('module')
                .att('name', 'Lownto_RemoteConfig')
                .up()
                .ele('module')
                .att('name', 'Cmtickle_EventThing')
                .up()
                .up()
                .up();

            return xml.toString({ pretty: true });
        }

        function generateEventsXmlResponse(events) {
            let eventXmlMap = {};
            Object.values(events).filter(function(n){return n;}).forEach(function (eventName) {
                eventXmlMap[eventName] = {
                    event: eventName,
                    observer: {
                        name: "lownto_" + eventName,
                        instance: 'Cmtickle\\EventThing\\Observer\\OncePerEventObserver'
                    }
                }
            });

            let xml = xmlbuilder.create('config');
            xml.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
            xml.att('xsi:noNamespaceSchemaLocation', 'urn:magento:framework:Event/etc/events.xsd');
            xml.com(' Copyright © Colin Tickle <colin.tickle@gmail.com>, all rights reserved.');

            for (let eventName in eventXmlMap) {
                let eventXml = eventXmlMap[eventName];
                xml.ele('event')
                    .att('name', eventXml.event)
                    .ele('observer')
                    .att('name', eventXml.observer.name)
                    .att('instance', eventXml.observer.instance)
                    .up()
                    .up();
            }

            return xml.toString({ pretty: true });
        }

        function generateDiXmlResponse(area) {
            let plugins = JSON.parse(config.plugins);
            

            let xml = xmlbuilder.create('config');
            xml.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
            xml.att('xsi:noNamespaceSchemaLocation', 'urn:magento:framework:ObjectManager/etc/config.xsd');
            xml.com(' Copyright © Colin Tickle <colin.tickle@gmail.com>, all rights reserved.');
            if (plugins.hasOwnProperty(area)) {
                for (const magentoClass of Object.getOwnPropertyNames(plugins[area])) {
                    let classParts = magentoClass.split('\\');
                    classParts[0] = "Lownto";
                    classParts[2] = "Plugin";
                    let pluginClass = classParts.join('\\');
                    var VirtualTypeArguments = xml.ele('virtualType', { name: pluginClass, type: plugins[area][magentoClass]["class"] })
                        .ele('arguments')
                        .ele('argument', { name: 'pluggedInClass', 'xsi:type': 'string' })
                        .text(magentoClass)
                        .up();
                    VirtualTypeArguments = VirtualTypeArguments
                        .ele('argument', { name: 'functions', 'xsi:type': 'array' });
                    for (const pluginType of Object.getOwnPropertyNames(plugins[area][magentoClass])) {
                        if (!supportedPluginTypes.includes(pluginType)) {
                            continue;
                        }
                        let pluginTypeFunctions = VirtualTypeArguments.ele('item', { name: pluginType, 'xsi:type': 'array' });
                        let pluginFunctionIndex = 0;
                        for (const pluginFunction of plugins[area][magentoClass][pluginType]) {
                            pluginFunctionIndex++;
                            pluginTypeFunctions.ele('item', { name: pluginFunctionIndex, 'xsi:type': 'string' })
                            .text(pluginFunction);
                        }
                    }
                    xml.ele('type', { name: magentoClass})
                        .ele('plugin', { name: pluginClass.replace(/\\/g, '_'), type:pluginClass});
                }
            }

            return xml.toString({ pretty: true });
        }

        // Listen for requests on the various XML paths
        RED.httpNode.get('/etc/:area?/:filetype.xml', handleXmlRequest);
        // Clean up the HTTP handler whenever the flow is deployed. Otherwise, config never updates.
        node.on('close', cleanupHttpHandlerOnDeploy);
    }

    RED.nodes.registerType('node-red-lownto', HttpXmlRequestResponse);
};

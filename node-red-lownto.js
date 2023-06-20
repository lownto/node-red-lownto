module.exports = function (RED) {
    let xmlbuilder = require('xmlbuilder');
    let supportedAreas = ['global', 'adminhtml', /*'crontab',*/ 'frontend'/*, 'graphql', 'webapi_rest', 'webapi_soap'*/];
    let supportedTypes = ['module', 'events', 'di'];
    function HttpXmlRequestResponse(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        function handleXmlRequest(req, res) {
            let area = req.params.area;
            let fileType = req.params.filetype;
            area = area ?? 'global';
            if (!supportedAreas.includes(area)) {
                res.sendStatus(404);
            } else if (!supportedTypes.includes(fileType)) {
                res.sendStatus(404);
            }

            let xmlResponse = '';
            switch (fileType) {
                case 'module':
                    xmlResponse = generateModuleXmlResponse();
                    break;
                case 'events':
                    xmlResponse = generateEventsXmlResponse(config[area + "_eventlist"]);
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
            xml.ele('module')
                .att('name', 'Lownto_DynamicConfiguration')
                .ele('sequence')
                .ele('module')
                .att('name', 'Lownto_RemoteConfig')
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
            xml.com('/**');
            xml.com(' * Copyright © Cmtickle <colin.tickle@gmail.com>, Inc. All rights reserved.');
            xml.com(' * See COPYING.txt for license details.');
            xml.com(' */');

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

            return xml.end({ pretty: true });
        }

        // Listen for requests on the various XML paths
        RED.httpNode.get('/etc/:area?/:filetype.xml', handleXmlRequest);
        // Clean up the HTTP handler whenever the flow is deployed. Otherwise, config never updates.
        node.on('close', cleanupHttpHandlerOnDeploy);
    }

    RED.nodes.registerType('node-red-lownto', HttpXmlRequestResponse);
};

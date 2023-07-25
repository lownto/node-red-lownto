# node-red-lownto

The NodeRED portion (configuration node) of the Lownto solution (Dynamic Observers and Plugins) for Magento 2.

**NOTE: This is a proof of concept/experimental solution. Use in Production at your own risk.**


## Installation of the NodeRED node from the command line
* Change directory to the folder above your node-red installation (/data/ in some cases).
* Clone this repository with git.
* `npm install ./node-red-lownto`
* Restart NodeRED

## Install the Magento plugin and follow additional steps
See the README in the [Lownto Module](https://github.com/lownto/module-lownto/) repository.

You'll also need to ensure [Event Thing](https://github.com/cmtickle/module-event-thing/) is installed. It should be installed as a dependency but may need the VCS repository added in composer.json.

## Quick Start: NodeRED
* Add a 'node-red-lownto' node. If this is not yet available, and you have followed the installation steps, restart your NodeRED instance.
* Add a 'http in' node configured to receive 'POST' requests on the URL '/lownto'
* Add a 'http response' node
* Add a 'debug' node, configured to output the whole message.
* Connect the 'http in' node to the 'debug node'.
* Connect the 'http in' node to the 'http response' node.
* Click 'deploy' on the flow.

At this point you should be able to view the following URLs which will be called by Magento (the examples assume a local installation of NodeRED, change it as applicable):
* module.xml : [etc/module.xml](http://127.0.0.1:1880/etc/module.xml)
* global di.xml  : [etc/di.xml](http://127.0.0.1:1880/etc/di.xml)
* global events.xml  : [etc/events.xml](http://127.0.0.1:1880/etc/events.xml)

di.xml and events.xml may also be available in the 'frontend' and 'adminhtml' scopes per the normal Magento folder structure, represented as a URL.

### To add an Observer
* Open the node-red-lownto node
* Select an Observer name in the relevant scope.
* Click 'Done'
* Click 'deploy' in the flow.
* Flush Magento cache.

### To add a Plugin
* Open the node-red-lownto node.
* Open the 'Plugins' field.
* Add JSON similar to the below which represents a VirtualType name, the class you want to plug into, the Plugin model to use (from Event Thing) and the methods to intercept.
* Click 'Done' (twice).
* Click 'deploy' in the flow.
* Flush Magento cache.
* (optional) if your Magento is in Production mode. Run di:compile.

Sample Plugin configuration:
```javascript
{
    "frontend": {
        "Lownto\\Framework\\Plugin\\View\\Page\\Config": {
            "pluggedInClass": "Magento\\Framework\\View\\Page\\Config",
            "sortOrder": "10",
            "pluginClass": "Cmtickle\\EventThing\\Plugin\\GenericPlugin",
            "after": [
                "getIncludes"
            ]
        },
        "Lownto\\Catalog\\Plugin\\Product": {
            "pluggedInClass": "Magento\\Catalog\\Model\\Product",
            "sortOrder": "10",
            "pluginClass": "Cmtickle\\EventThing\\Plugin\\OncePerEntityPlugin",
            "after": [
                "getSpecialPrice",
                "getName"
            ]
        },
        "Lownto\\Cms\\Plugin\\Block": {
            "pluggedInClass": "Magento\\Cms\\Model\\Block",
            "sortOrder": "10",
            "pluginClass": "Cmtickle\\EventThing\\Plugin\\OncePerEntityPlugin",
            "after": [
                "getContent"
            ]
        }
    }
}
```

### Working with the Observers and Plugins
You should by now have: installed all modules, followed all installation steps, added the basic flow, an Observer and a Plugin, deployed the NodeRED flow, flushed Magento's cache and (optionally) run di:compile.

If all the above is done and working as intended, reloading a page in the Magento instance connected via Lownto to NodeRED should result in messages appearing in the NodeRED 'debug' sidebar. 
You can access the 'debug' sidebar by opening the NodeRED hamburger menu, clicking 'view > show sidebar' and then clicking on the bug icon.

From this point onwards there's a bit of a learning curve about NodeRED and how it can utilise/modify the data provided by Magento via Lownto.

Looking through and understanding the (read-only) demo instance is probably a good start. 
Understanding the PHP code for Plugins and Observers in Event Thing will also help.

### A demo Instance of Magento with Lownto:

[https://demo.lownto.com/](https://demo.lownto.com/)

### The NodeRED instance connected to the above Magento instance:

[https://demo-nodered.lownto.com/](https://demo-nodered.lownto.com/)

Username: user

Password: password

/*
TODO:
    allow specifying:
        fireAfter, fireBefore - for ordering message handlers;
        initAfter, initBefore - for initialization order (e.g. most plugins want to be initialized after genericUI);
        renderAfter, renderBefore - mostly useless, I think, but surely someone can find a use for conditionally mutating the renderState.

    allow literally anything to register as a renderer, don't just hog it all with genericUI
*/


// TODO: add proper (alert/ai-hidden message) feedback, don't just scream into the console void


window.config = {};


window.rhiza = function() {
    const storageSentinelPhrase = "Rhiza storage: ";
    const persistentSentinelPhrase = "Keep all.";
    const systemAvatar = {
        url: "https://i.imgur.com/DVzjsl7.png",
    };

    let storage = {};

    let configs = {};
    let configsToRequire = {};

    let registeredPlugins = {};

    let persistentConfigs = false;

    function getConfigs() {
        if (persistentConfigs) {
            return storage.config;
        } else {
            return configs;
        }
    }

    // TODO: a lil recursion never hurt anybody, but maybe in the far future someone will use like a literal billion plugins and their browser will choke and die
    function depthFirstSearch(incidenceLists, states, stack, newVertex, result) {
        states[newVertex] = 1;
        stack.push(newVertex);

        for (let e of incidenceLists[newVertex]) {
            if (states[e] == 0) {
                depthFirstSearch(incidenceLists, states, stack, result);
            } else if (states[e] == 1) {
                throw false;
            }
        }

        stack.pop();
        states[newVertex] = 2;
        result.push(newVertex);
    }

    // TODO: given that it works on arbitrary objects, it might be beneficial to give an ordering to the elements, work on these IDs, and cast them back only at the very end.
    function topologicalOrder(incidenceSet) {
        let incidenceLists = {};
        let vertices = Set();
        for (let [s, e] of incidenceSet) {
            if (incidenceLists.has(s)) {
                incidenceLists[s].push(e);
            } else {
                incidenceLists[s] = [e];
            }
            vertices.add(s);
            vertices.add(e);
        }

        let states = {};
        let stack = [];
        let result = [];
        for (let v of vertices) {
            states[v] = 0;
        }
        for (let v of vertices) {
            if (states[v] == 0) {
                depthFirstSearch(incidenceLists, states, stack, v, result);
            }
        }

        return result;
    }

    function registerPlugin(name, p) {
        registeredPlugins[name] = p;
    }

    function mergeAttributes(to, from) {
        if (!from) {
            return to;
        }

        for (const [k, v] of Object.entries(from)) {
            if (!to.hasOwnProperty(k) || (typeof v != 'object')) {
                to[k] = v;
            } else {
                let toValue = to[k];
                if ((toValue == null) || (typeof toValue != 'object')) {
                    to[k] = v;
                } else {
                    mergeAttributes(toValue, v);
                }
            }
        }

        return to;
    }

    // TODO: switch over to proper thread-local storage
    //       which is apparently already available
    //       devil works fast, but rocca works faster
    function getThreadStorage() {
        let m = oc.thread.messages.at(0);
        if (!m || (m.author != "system") || !m.content.startsWith(storageSentinelPhrase)) {
            storage = {
                config: {}
            };
            m = {
                author: "system",
                hiddenFrom: ["ai", "user"],
                expectsReply: false,
                avatar: systemAvatar,
                content: storageSentinelPhrase + JSON.stringify(storage),
            };
            oc.thread.messages.unshift(m);
        } else {
            storage = JSON.parse(m.content.slice(storageSentinelPhrase.length));
        }

        return m;
    }

    function setThreadStorage() {
        let newMessage = storageSentinelPhrase + JSON.stringify(storage);
        getThreadStorage().content = newMessage;
    }

    function getDeepCopy(object) {
        return JSON.parse(JSON.stringify(object));
    }

    // Explicitly meant to be a copy, not a reference. Mutate the storage all you want, but you have to commit it to Rhiza to save it.
    function getNamedThreadStorage(name) {
        if (!storage.hasOwnProperty(name)) {
            storage[name] = {};
        }

        return getDeepCopy(storage[name]);
    }

    function setNamedThreadStorage(name, value) {
        storage[name] = value;
        setThreadStorage();
    }

    function requireConfig(name, description, validator) {
        configsToRequire[name] = {description, validator};
    }

    function requestConfig(problemReason = null) {
        let needToPrompt = false;

        let configsDescriptions = [];
        for (const [name, {description, validator}] of Object.entries(configsToRequire)) {
            if (!getConfigs().hasOwnProperty(name)) {
                configsDescriptions.push(`"${name}": ${description}`);
                needToPrompt = true;
            }
        }
        if (!needToPrompt) {
            if (persistentConfigs) {
                setThreadStorage();
            }
            return;
        }

        let messageHeader = "We need to set up some configuration parameters before we begin.";
        if (problemReason) {
            messageHeader = `
Something went wrong:
${problemReason}
Please send corrected configuration as the next message.`;
        }

        let persistenceWarningFooter = "";
        if (!persistentConfigs) {
            persistenceWarningFooter = `If you would prefer to save secrets - e.g. access tokens - into the thread as well (convenient, but EXTREMELY not recommended), please preface your {}-bracketed message with, exact quote, "${persistentSentinelPhrase}".`;
        }

        let m = {
            author: "system",
            hiddenFrom: ["ai"],
            expectsReply: false,
            avatar: systemAvatar,
            content: `
${messageHeader}
The values required are:
<pre>{
\t${configsDescriptions.join(",\n")}
}</pre>
Please provide them in the next message in the exact format presented.
${persistenceWarningFooter}`
        };

        oc.thread.messages.push(m);

        oc.thread.on(
            "MessageAdded",
            async function () {
                let m = oc.thread.messages.at(-1);
                if (m.author != "user") {
                    problemReason = `The answer was provided by ${m.author} instead of user.`;
                    requestConfig(problemReason);
                    return;
                }
                m.expectsReply = false;
                m = m.content;
                if (m.startsWith(persistentSentinelPhrase)) {
                    m = m.slice(persistentSentinelPhrase.length);
                    if (!persistentConfigs) {
                        mergeAttributes(storage.config, configs);
                        persistentConfigs = true;
                    }
                }
                let parsedConfigs = null;
                try {
                    parsedConfigs = JSON.parse(m);
                } catch (err) {
                    problemReason = err;
                    requestConfig(problemReason);
                    return;
                }

                let validationBrokeFor = [];
                for (const [name, config] of Object.entries(parsedConfigs)) {
                    let validator = configsToRequire[name].validator;
                    if (validator && !validator(config)) {
                        validationBrokeFor.push(name);
                        continue;
                    }

                    if (!getConfigs().hasOwnProperty(name)) {
                        getConfigs()[name] = {};
                    }
                    mergeAttributes(getConfigs()[name], config);
                }

                mergeAttributes(getConfigs(), parsedConfigs);

                if (validationBrokeFor.length > 0) {
                    problemReason = "Validation broke for: " + validationBrokeFor.join(", ");
                } else {
                    problemReason = "Not all requested configuration values were provided.";
                }

                requestConfig(problemReason);
            },
            { once: true }
        );
    }

    function initialize() {
        getThreadStorage();

        configs = getDeepCopy(window.config);
        console.log(configs);

        let storageConfigs = getDeepCopy(storage.config);
        mergeAttributes(configs, storageConfigs);
        console.log(storageConfigs);
        console.log(configs);

        requestConfig();

        for (let [name, p] of Object.entries(registeredPlugins)) {
            console.log("Initializing " + name);

            // TODO: ordering
            let initFunction = p.initialize;
            if (initFunction) {
                initFunction(getConfigs()[name]);
            }

            // TODO: ordering
            let handler = p.onMessageAdded;
            if (handler) {
                oc.thread.on("MessageAdded", handler);
            }
        }

        render();
    }

    function render() {
        // TODO: This is temporary. I cannot stress how temporary this is.

        let plugins = Object.values(registeredPlugins);

        if (window.genericUI) {
            window.genericUI.renderUI(plugins);
        }
    }

    function loadStylesheet(name, path) {
        var cssId = 'css-' + name;
        if (!document.getElementById(cssId))
        {
            var head = document.getElementsByTagName('head')[0];
            var l = document.createElement('link');
            l.id = cssId;
            l.rel = 'stylesheet';
            l.type = 'text/css';
            l.href = path;
            l.media = 'all';
            head.appendChild(l);
        }
    }

    // TODO: turn it into an actual system message, or something.
    function warnUser(warning) {
        console.log(warning);
    }

    function substituteTemplates(s) {
        return s.replaceAll("{{char}}", oc.character.name).replaceAll("{{user}}", oc.thread.userCharacter.name);
    }

    return {
        initialize,
        render,

        getNamedThreadStorage,
        setNamedThreadStorage,

        registerPlugin,
        requireConfig,
        loadStylesheet,
        warnUser,

        getDeepCopy,
        mergeAttributes,
        substituteTemplates,
    };
}();

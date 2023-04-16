window.notekeeper = function() {
    window.rhiza.loadStylesheet('notekeeper', 'https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@main/notekeeper/notekeeper.css');

    const indexingAlphabet = '1234567890abcdefghijklmnopqrstuvwxyz';
    let reverseIndexingAlphabet = {};
    for (let i = 0; i < indexingAlphabet.length; ++i) {
        reverseIndexingAlphabet[indexingAlphabet[i]] = i;
    }

    const commandPrefix = "/nk";

    const storageName = "notekeeper";
    const defaultPanel = "notekeeper";

    // TODO: add lookup if this will grow big enough to warrant it.
    const gainVerbs = [
        "added", "add",
        "get", "got",
        "acquired", "acquire",
        "learned", "learn",
        "found", "find",
        "gained", "gain",
        "regained", "regain",
        "restored", "restore",
        "healed", "heal",
        "collected", "collect",
        "earned", "earn",
        "obtained", "obtain",
        "researched", "research",
        "won", "win",
    ];
    const lossVerbs = [
        "lost", "lose",
        "removed", "remove",
        "destroyed", "destroy",
        "forgotten", "forget",
        "irrelevant",
        "erased", "erase",
        "taken away", "take away",
        "used up", "use up",
    ];
    const setVerbs = [
        "is now",
        "is",
        "changed to", "change to",
        "set to",
        "set",
    ];

    // Keeping stats as a list gives them an explicit order. I don't want everything to jump around just because you removed a stat.
    // TODO: if someone will start having a billion stats and linear search will start crying, make a search index thing.
    let notekeeperState = {
        stats: [],
        defaultReminder: null,
        allowUserTrackerCreation: false,
        version: "0.0.1",
    };

    // i don't yet get namespacing of js. sorry. i will some day, but not yet, not yet.
    // frankly, i could just shove the thing into an object or one of these little funky blobs of pure state, couldn't i?
    // TODO: be rid of this horror
    function clampValue(value) {
        if (value.current < 0) {
            value.current = 0;
        }
        if ((value.current > value.maximum) && !value.canOverflow) {
            value.current = value.maximum;
        }
    }

    function normalizeListItem(item) {
        if ((typeof item === 'string') || (item instanceof String)) {
            return {
                name: item,
                note: null,
            };
        }

        return item;
    }

    function noteForItem(item) {
        if (item.note) {
            return `${item.name} (${item.note})`;
        } else {
            return item.name;
        }
    }

    let statTypes = {
        "value": {
            normalize: function(v) {
                v.current = v.current || 0;
                v.maximum = v.maximum || null;
                v.canOverflow = v.canOverflow || false;

                v.commandNames = v.commandNames || [v.name];
                v.attachedTo = v.attachedTo || "{{user}}";

                v.note = v.note || "";
                v.noteMakerType = v.noteMakerType || "none";

                if ((typeof v.note === 'string') || (v.note instanceof String)) {
                    v.noteMakerType = "verbatim";
                } else if (Array.isArray(v.note)) {
                    v.noteMakerType = "value-ranges";
                }
            },
            get: function(v) {
                return v.current;
            },
            set: function(v, newValue) {
                v.current = parseInt(newValue);
                clampValue(v);
            },
            add: function(v, delta) {
                v.current += parseInt(delta);
                clampValue(v);
            },
            remove: function(v, delta) {
                v.current -= parseInt(delta);
                clampValue(v);
            }
        },
        "list": {
            normalize: function(v) {
                v.attachedTo = v.attachedTo || "{{user}}";

                v.note = v.note || "";
                v.noteMakerType = v.noteMakerType || "list";

                v.commandNames = v.commandNames || [v.name];

                v.items = v.items || [];
                for (let i = 0; i < v.items.length; ++i) {
                    v.items[i] = normalizeListItem(v.items[i]);
                }
            },
            get: function(v) {
                return v.items;
            },
            set: function(v, newValue) {
                if (Array.isArray(newValue)) {
                    v.current = newValue;
                }
            },
            add: function(v, item) {
                v.items.push(normalizeListItem(item));
            },
            remove: function(v, identifier) {
                // int, char, or item name
                let index = null;
                
                if (Number.isInteger(identifier)) {
                    index = identifier;
                } else if (identifier.length == 1) {
                    index = reverseIndexingAlphabet[identifier];
                } else {
                    identifier = identifier.trim();
                    index = v.items.findIndex((item) => {return item.name == identifier});
                }

                if ((index == null) || (index < 0) || (index >= v.items.length)) {
                    console.log(identifier);
                    return `"Identifier ${identifier} cannot be found and won't be removed."`
                }

                v.items.splice(identifier, 1);
            }
        }
    };

    let renderers = {
        "hidden": function(stat) {return null;},
        "bar-text": function(stat) {
            let representation = stat.representation;

            representation.color = representation.color || "white";
            let colorStyle = `style="color: ${representation.color};"`;

            let activeNotch = null;
            if (representation.activeUrl != null) {
                activeNotch = `<span class="bar-text-notch"><img class="bar-text-notch-image" src=${representation.activeUrl}></span>`;
            } else {
                let activeSymbol = representation.activeSymbol || "+";
                activeNotch = `<span class="bar-text-notch"${colorStyle}><pre>${activeSymbol}</pre></span>`;
            }

            let inactiveNotch = null;
            if (stat.inactiveUrl != null) {
                inactiveNotch = `<img class="bar-text-notch" src=${representation.inactiveUrl}>`;
            } else {
                let inactiveSymbol = representation.inactiveSymbol || " ";
                inactiveNotch = `<span class="bar-text-notch" ${colorStyle}><pre>${inactiveSymbol}</pre></span>`;
            }

            representation.showOverflow = representation.showOverflow || true;

            let activeAmount = Math.min(stat.current, stat.maximum);
            let inactiveAmount = Math.max(0, stat.maximum - stat.current);

            let track = activeNotch.repeat(activeAmount) + inactiveNotch.repeat(inactiveAmount);

            let overflow = '';
            if ((stat.maximum < stat.current) && representation.showOverflow) {
                overflow = ` (+${stat.current - stat.maximum})`;
            }

            let m = `
                <div class="bar-text-container">
                    <span class="bar-text-name">${representation.name} </span>
                    <span class="bar-text-button" onclick="window.notekeeper.addToStat('${stat.name}', -1)">-</span>
                    <span class="bar-text-brace">[</span>
                    ${track}
                    <span class="bar-text-brace">]</span>
                    <span class="bar-text-button" onclick="window.notekeeper.addToStat('${stat.name}', 1)">+</span>
                    <span class="bar-text-overflow"> ${overflow} </span>
                </div>`;

            return m;
        },
        "tree-text": function(stat) {
            let items = [];
            for (let i = 0; i < stat.items.length; ++i) {
                let item = stat.items[i];

                let altParameter = "";
                if (item.note != null) {
                    altParameter = `title="${item.note}"`;
                }
                let assignedLetter = indexingAlphabet[i] || "=";
                items.push(`<div ${altParameter}>=(${assignedLetter})= ${item.name}</div>`);
            }

            let m = `
                <div class="tree-text-container">
                    <div class="tree-text-header">${stat.representation.name}</div>
                    ${items.join("")}
                </div><br>`;

            return m;
        }
    };

    function buildGenericValueNote(stat) {
        let maxBit = "";
        if (stat.maximum != null) {
            maxBit += ` out of ${stat.maximum} total`;
        }

        return `${stat.attachedTo}'s ${stat.name} is ${stat.current}${maxBit}.`;
    }

    let noteMakers = {
        "none": function(stat) {return "";},              // keep in mind that the AI will still see the stat, just no additional info
        "verbatim": function(stat) {return buildGenericValueNote(stat);},
        "value-ranges": function(stat) {
            let m = buildGenericValueNote(stat);
            for (const item of stat.note) {
                if (
                    ((item[0] == null) || (stat.current >= item[0])) &&
                    ((item[1] == null) || (stat.current <= item[1]))
                ) {
                    m = m + " " + item[2];
                    break;
                }
            }
            return m;
        },
        "list": function(stat) {
            let genericNote = "";
            if (stat.note) {
                genericNote = `(${stat.note})`;
            }

            if (stat.items.length == 0) {
                return "${stat.attachedTo} has no ${stat.name} ${genericNote}.";
            }

            let itemDescriptions = [];
            for (const item of stat.items) {
                itemDescriptions.push(noteForItem(item));
            }
            return `${stat.attachedTo}'s ${stat.name} ${genericNote}are: [${itemDescriptions.join(", ")}]`;
        }
    };

    function addRenderer(name, implementation) {
        if (renderers.hasOwnProperty(name)) {
            window.rhiza.warnUser(`Renderer ${name} is being overwritten. I hope to gods you know what you are doing.`);
        }
        renderers[name] = implementation;
    }

    function addStatType(name, implementation) {
        if (statTypes.hasOwnProperty(name)) {
            window.rhiza.warnUser(`Stat class ${name} is being overwritten. I hope to gods you know what you are doing.`);
        }
        statTypes[name] = implementation;
    }

    function addNoteMaker(name, implementation) {
        if (noteMakers.hasOwnProperty(name)) {
            window.rhiza.warnUser(`Note maker ${name} is being overwritten. I hope to gods you know what you are doing.`);
        }
        noteMakers[name] = implementation;
    }

    function addStat(stat) {
        if (normalizeStat(stat)) {
            notekeeperState.stats.push(stat);
        } else {
            window.rhiza.warnUser("The stat is incorrect. It won't be added.");
        }
    }

    function removeStat(name) {
        let index = getStatIndex(name);
        if (index != null) {
            notekeeperState.stats.splice(index, 1);
        }
    }

    function getStat(name) {
        for (let stat of notekeeperState.stats) {
            if (stat.name == name) {
                return stat;
            }
        }
        return null;
    }

    function getStatIndex(name) {
        for (let i = 0; i < notekeeperState.stats.length; ++i) {
            if (notekeeperState.stats[i].name == name) {
                return i;
            }
        }
        return null;
    }

    function addToStatByReference(stat, delta) {
        let statType = statTypes[stat.type];

        let result = statType.add(stat, delta);
        if (result) {
            return result;
        }

        saveToStorage();
        window.rhiza.render();
    }

    function setStatByReference(stat, newValue) {
        let statType = statTypes[stat.type];

        let result = statType.set(stat, newValue);
        if (result) {
            return result;
        }

        saveToStorage();
        window.rhiza.render();
    }

    function removeFromStatByReference(stat, delta) {
        let statType = statTypes[stat.type];

        let result = statType.remove(stat, delta);
        if (result) {
            return result;
        }

        saveToStorage();
        window.rhiza.render();
    }

    function addToStat(name, delta) {
        addToStatByReference(getStat(name), delta);
    }

    function setStat(name, newValue) {
        setStatByReference(getStat(name), newValue);
    }

    function removeFromStat(name, delta) {
        removeFromStatByReference(getStat(name), delta);
    }

    function normalizeStat(stat) {
        if (!stat.name) {
            window.rhiza.warnUser(`Cannot normalize the stat - it needs a name.`);
            return false;
        }
        let statTypeName = stat.type;
        if (!statTypeName) {
            window.rhiza.warnUser(`Cannot normalize stat ${stat.name} - there is no type set up.`);
            return false;
        }
        let statType = statTypes[statTypeName];
        if (!statType) {
            window.rhiza.warnUser(`Cannot normalize stat ${stat.name} - type ${statTypeName} does not exist.`);
            return false;
        }

        let validate = statType.validate;
        if (validate) {
            let errorMessage = statType.validate();
            if (errorMessage) {
                window.rhiza.warnUser(`Cannot normalize stat ${stat.name} - ${errorMessage}.`);
                return false;
            }
        }

        statType.normalize(stat);
        return true;
    }

    function initialize(config) {
        window.rhiza.mergeAttributes(notekeeperState, config || {});
        let namedStorage = window.rhiza.getNamedThreadStorage(storageName);
        if (namedStorage) {
            window.rhiza.mergeAttributes(notekeeperState, namedStorage);
        } else {
            notekeeperState.stats = notekeeperState.defaultStats || [];
        }

        // Empty string is valid
        if (notekeeperState.defaultReminder == null) {
            notekeeperState.defaultReminder = oc.character.reminderMessage;
        }

        let invalidStatIndices = [];
        for (let i = 0; i < notekeeperState.stats.length; ++i) {
            if (!normalizeStat(notekeeperState.stats[i])) {
                invalidStatIndices.push(i);
            }
        }

        while(invalidStatIndices.length) {
            notekeeperState.stats.splice(invalidStatIndices.pop(), 1);
        }

        saveToStorage();

        oc.character.reminderMessage = buildReminderMessage();
    }

    function saveToStorage() {
        window.rhiza.setNamedThreadStorage(storageName, notekeeperState);
    }

    function render(renderState) {
        for (let stat of notekeeperState.stats) {
            let representationDescription = stat.representation;
            if (!representationDescription) {
                window.rhiza.warnUser(`Stat ${stat.name} is unrenderable.`);
                continue;
            }
            let renderer = renderers[representationDescription.type];
            if (!renderer) {
                window.rhiza.warnUser(`Stat ${stat.name} has an unregistered renderer ${representationDescription.type}`);
                continue;
            }

            let representation = renderer(stat);
            let panel = stat.representation.panel || defaultPanel;

            renderState.appendToPanel(panel, representation);
        }
        return renderState;
    }

    function handleChatCommand(messageText) {
        if (!messageText.startsWith(commandPrefix)) {
            return {
                handled: false,
                error: null,
            };
        }

        messageText = messageText.slice(commandPrefix.length).trim();

        for (let stat of notekeeperState.stats) {
            for (const commandName of stat.commandNames) {
                if (!messageText.startsWith(commandName)) {
                    continue;
                }

                messageText = messageText.slice(commandName.length).trim();

                for (const [verbCategory, method] of
                    [
                        [gainVerbs, addToStatByReference],
                        [lossVerbs, removeFromStatByReference],
                        [setVerbs, setStatByReference],
                    ]
                ) {
                    for (const verb of verbCategory) {
                        if (!messageText.startsWith(verb)) {
                            continue;
                        }
                        messageText = messageText.slice(verb.length).trim();
                        let error = method(stat, messageText);

                        return {
                            handled: true,
                            error: error,
                        };
                    }
                }

                return {
                    handled: true,
                    error: `Unknown verb. Please style your command as "/nk ${commandName} add value" (or "remove", or "set" instead of "add").`
                };
            }
        }

        let knownStatCommands = [];
        for (const stat of notekeeperState.stats) {
            knownStatCommands = knownStatCommands.concat(stat.commandNames);
        }
        return {
            handled: true,
            error: `Unknown command. The following commands are known: [${knownStatCommands}.join(", ")].`
        };
    }

    function buildReminderMessage() {
        let note = "";
        for (let stat of notekeeperState.stats) {
            note += noteMakers[stat.noteMakerType](stat);
        }

        if (note) {
            note = "[SYSTEM]: " + note + "\n";
        }

        note += notekeeperState.defaultReminder;
        note = window.rhiza.substituteTemplates(note);

        return note;
    }

    async function onMessageAdded() {
        let message = oc.thread.messages.at(-1);
        if (message.author != "user") {
            return;
        }

        let result = handleChatCommand(message.content);
        console.log(result);
        if (result.handled) {
            message.hiddenFrom = ["ai", "user"];
            message.expectsReply = false;

            if (result.error) {
                window.rhiza.warnUser(result.error);
            }

            return;
        }

        oc.character.reminderMessage = buildReminderMessage();
    }

    let p = {
        initialize,

        addRenderer,
        addStatType,
        addNoteMaker,
        addStat,
        removeStat,

        addToStat,
        setStat,
        getStat,
        removeFromStat,

        render,

        onMessageAdded,
    };

    window.rhiza.registerPlugin("notekeeper", p);

    return p;
}();


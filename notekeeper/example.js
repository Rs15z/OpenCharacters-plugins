await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.2/rhiza/rhiza.js');
await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.2/genericui/genericui.js');

await import('https://cdn.jsdelivr.net/gh/Rs15z/OpenCharacters-plugins@0.0.2/notekeeper/notekeeper.js');


window.config.notekeeper = {
  // You will need to copy your character's reminder here. The actual reminderMessage WILL be overwritten. Surround your message with backtick marks `, as shown.
  defaultReminder: `[SYSTEM]: You are {{char}}. Respond in flowerful prose and direct speech. Make descriptive, verbose, and detailed answers of exactly 2 paragraphs. Do not repeat previous sentences, even with alterations. Make things up if you don't know them, but only if prompted by the user. No story wrap ups or summaries can be used as a response. Continue the story from exactly the moment it stopped, replying to the last question or action. You will not take actions or provide speech for {{user}}.
[AI]: (Thought: I need to remember to be creative, descriptive and engaging! I should work very hard to avoid being repetitive as well!)`,
  defaultStats: [
    {
      // Is it a list of items, or a single numerical value? Here - the latter.
      type: "value",

      // How it will be known to the AI
      name: "Sanity",
      // Whose quality is it - AIs? Player's? Someone else? Defaults to {{user}}.
      attachedTo: "{{char}}",
      // What the AI will see for every message, defaults to null (meaning no additional note)
      note: "Measures how exposed {{char}} is to truths beyond their comprehension.",

      // Starting value, defaults to 0
      current: 10,
      // Maximum, defaults to null (infinite)
      maximum: 12,
      // For, e.g., temporary buffs, overexertion, Cool Anime Overcoming, and such, defaults to false
      canOverflow: false,

      // By what names the user can refer to it in chat commands; defaults to name only
      commandNames: ["Sanity", "SP"],

      // How to show it in the interface?
      representation: {
        // Which rendering primitive to use. Currently only "bar-text" and "hidden" are supported.
        type: "bar-text",

        // If you want to show it by a different name in the UI. Otherwise defaults to AI name (e.g. Sanity here)
        name: "SP",
        // How to represent a filled notch on the tracker, defaults to +
        activeSymbol: "⛤",
        // How to represent an empty notch on the tracker, defaults to empty space
        inactiveSymbol: " ",
        // Text color. Defaults to white.
        color: "cyan",
        // Let's say maximum is 10 and current is 14; [==========] (+4) - whether the "(+4)" part should be shown. Defaults to true.
        showOverflow: false,
      }
    },
    {
      type: "value",

      name: "Health",
      attachedTo: "{{char}}",
      note: null,

      current: 3,
      maximum: 12,
      canOverflow: true,

      commandNames: ["Stamina", "Health", "HP", "Resolve"],

      representation: {
        type: "bar-text",

        name: "HP",
        activeSymbol: "❤️",
        inactiveSymbol: " ",
        color: "red",

        showOverflow: true,
      }
    },
    {
      type: "value",

      name: "Doom",
      attachedTo: "{{char}} and {{user}}",
      current: 2,
      maximum: 12,
      canOverflow: false,
      // You can also provide notes as lists of range-conditional descriptions, as here
      note: [
        [0, 2, "Things are looking up."],
        [3, 6, "Should be cautious about playing with strange powers."],
        [7, 9, "Cover your house in wards, and you might yet get out of this."],
        [10, 11, "Hell is on our doorstep."],
        [12, null, "We have lost."],
      ],

      representation: {
        type: "bar-text",
        panel: "doom",

        name: "Doom",
        activeUrl: "https://i.imgur.com/qG73aod.png",
        inactiveSymbol: " ",
      }
    },

    {
      // Different type - here it's a list of items, e.g. actual items or quests
      type: "list",

      // It will be seen to AI as, e.g. "Cora's items: ", so you want to go both lowercase and plural here
      name: "items",
      attachedTo: "{{char}}",

      // You might want to specify the note for more non-obvious categories
      note: null,

      // Initial items
      items: [
        "sword",
        "wand",
        {
          name: "ancient tablet",

          // Will be sent to AI and seen to user as alt-text
          note: "written in one of the tongues of hell, CSS",
        }
      ],

      commandNames: ["Inventory", "Item", "Inventory item"],

      representation: {
        type: "tree-text",

        name: "Inventory",
        // Other representations can have different formats. tree-text is the only one supported out of the box.
      }
    },

    {
      type: "list",

      name: "tasks",
      attachedTo: "{{char}}",
      note: null,

      items: [
        "explore the dungeon",
        "slay the dragon",
      ],

      commandNames: ["Quest", "Task"],

      representation: {
        type: "tree-text",

        name: "Our tasks",
      }
    },
  ]
};


window.rhiza.initialize();
